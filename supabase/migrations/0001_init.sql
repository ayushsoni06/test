-- HEX Proposals: schema, row-level security and storage of shared library content.

create extension if not exists pgcrypto;

-- Staff = a signed-in user whose verified email is on the allowed domain.
-- Keep the domain in sync with ALLOWED_EMAIL_DOMAIN.
create or replace function public.is_staff() returns boolean
language sql stable as $$
  select coalesce(
    (auth.jwt() ->> 'email') ilike '%@hex.inc'
    and coalesce((auth.jwt() -> 'user_metadata' ->> 'email_verified')::boolean, true),
    false)
$$;

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

-- ---------- proposals ----------
create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  client_company text not null default '',
  status text not null default 'draft' check (status in ('draft','published','archived')),
  draft_state jsonb not null,
  published_state jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
create trigger proposals_touch before update on public.proposals
  for each row execute function public.touch_updated_at();

-- ---------- library ----------
create table public.projects (
  slug text primary key,
  title text not null,
  lede text not null default '',
  services text not null default '',
  year int,
  tags text[] not null default '{}',
  palette text[] not null default '{"#EFEFEF","#000000"}' check (array_length(palette, 1) = 2),
  url text,
  sort int not null default 0
);

create table public.project_media (
  id uuid primary key default gen_random_uuid(),
  project_slug text not null references public.projects(slug) on delete cascade on update cascade,
  kind text not null check (kind in ('image','video')),
  r2_key text not null,
  alt text,
  sort int not null default 0,
  is_dummy boolean not null default false  -- placeholder imagery imported from the reference; safe to delete
);
create index project_media_project on public.project_media (project_slug, sort);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null default '',
  photo_r2_key text,
  sort int not null default 0,
  active boolean not null default true
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  url text,
  logo_r2_key text,
  logo_keep_colors boolean not null default false,  -- render as a plain <img> instead of an --ink mask
  figure text,                                       -- e.g. "$85M Series B"; shown in Recent clients
  show_in_clients boolean not null default false,
  sort int not null default 0
);

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  kind text not null default '',
  quote text[] not null default '{}',
  name text not null,
  name_url text,
  role text not null default '',
  sort int not null default 0,
  active boolean not null default true
);

create table public.org_settings (
  id int primary key default 1 check (id = 1),
  setup_completed_at timestamptz,
  setup_skipped jsonb not null default '{}'   -- item ids deliberately skipped in setup
);
insert into public.org_settings (id) values (1);

-- Phase 2: open tracking. Table exists now so the route can start logging without a migration.
create table public.proposal_views (
  id bigserial primary key,
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  ua text
);

-- ---------- row-level security ----------
alter table public.proposals      enable row level security;
alter table public.projects       enable row level security;
alter table public.project_media  enable row level security;
alter table public.team_members   enable row level security;
alter table public.companies      enable row level security;
alter table public.testimonials   enable row level security;
alter table public.org_settings   enable row level security;
alter table public.proposal_views enable row level security;

-- Public reads published proposals only. The app selects by slug; the random slug suffix keeps links unguessable.
create policy "public reads published" on public.proposals
  for select using (status = 'published' or public.is_staff());
create policy "staff writes proposals" on public.proposals
  for all using (public.is_staff()) with check (public.is_staff());

-- Library tables: world-readable, staff-writable.
do $$
declare t text;
begin
  foreach t in array array['projects','project_media','team_members','companies','testimonials'] loop
    execute format('create policy "public reads %1$s" on public.%1$I for select using (true)', t);
    execute format('create policy "staff writes %1$s" on public.%1$I for all using (public.is_staff()) with check (public.is_staff())', t);
  end loop;
end $$;

create policy "staff reads settings" on public.org_settings for select using (public.is_staff());
create policy "staff writes settings" on public.org_settings for update using (public.is_staff()) with check (public.is_staff());

create policy "staff reads views" on public.proposal_views for select using (public.is_staff());
-- Inserts come from the server with the service role, which bypasses RLS.

-- Clients must never see draft state through the API, even for a published row.
revoke select on public.proposals from anon;
grant select (id, slug, client_company, status, published_state, published_at) on public.proposals to anon;
