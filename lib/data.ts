/*
 * Data access. With Supabase env vars set, reads come from Postgres.
 * Without them (local dev, CI), everything is served from the reference fixtures so the UI can be built and tested.
 */
import { cache } from "react";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { hasSupabase, publicClient } from "./supabase/server.ts";
import { seedLibrary } from "./seedLibrary.ts";
import type { Library, Media, ProposalRow, ProposalState } from "./types.ts";

export const mediaUrl = (key: string | null | undefined): string | null => {
  if (!key) return null;
  if (/^(https?:|\/|data:)/.test(key)) return key;
  return `${(process.env.R2_PUBLIC_BASE_URL || "").replace(/\/$/, "")}/${key}`;
};

/* ---------- fixtures ---------- */

const root = process.cwd();
function fixtureLibrary(): Library {
  const lib = seedLibrary();
  const local = join(root, "fixtures/local/media.json");
  if (existsSync(local)) lib.projectMedia = JSON.parse(readFileSync(local, "utf8")).projectMedia;
  return lib;
}

const g = globalThis as unknown as { __hexFixtureProposals?: Map<string, ProposalRow> };
export function fixtureProposals(): Map<string, ProposalRow> {
  if (!g.__hexFixtureProposals) {
    const state = JSON.parse(readFileSync(join(root, "fixtures/fireflies.json"), "utf8")) as ProposalState;
    const now = new Date().toISOString();
    const row: ProposalRow = {
      id: "00000000-0000-4000-8000-000000000001", slug: "fireflies-demo", client_company: state.client.company,
      status: "published", draft_state: state, published_state: structuredClone(state),
      created_at: now, updated_at: now, published_at: now,
    };
    g.__hexFixtureProposals = new Map([[row.id, row]]);
  }
  return g.__hexFixtureProposals;
}

/* ---------- library ---------- */

type Rows = Record<string, any>[];

export const getLibrary = cache(async (): Promise<Library> => {
  if (!hasSupabase()) return fixtureLibrary();
  const db = publicClient();
  const [projects, media, team, companies, testimonials] = await Promise.all([
    db.from("projects").select("*").order("sort"),
    db.from("project_media").select("*").order("sort"),
    db.from("team_members").select("*").eq("active", true).order("sort"),
    db.from("companies").select("*").order("sort"),
    db.from("testimonials").select("*").eq("active", true).order("sort"),
  ]);
  for (const r of [projects, media, team, companies, testimonials]) if (r.error) throw r.error;
  const projectMedia: Record<string, Media[]> = {};
  for (const m of media.data as Rows) {
    (projectMedia[m.project_slug] ||= []).push({ kind: m.kind, url: mediaUrl(m.r2_key)!, ...(m.alt ? { alt: m.alt } : {}) });
  }
  return {
    projects: (projects.data as Rows).map(p => ({ slug: p.slug, title: p.title, lede: p.lede, services: p.services, year: p.year, tags: p.tags, palette: p.palette, url: p.url, sort: p.sort })),
    projectMedia,
    team: (team.data as Rows).map(t => ({ id: t.id, name: t.name, role: t.role, photo: mediaUrl(t.photo_r2_key), sort: t.sort, active: t.active })),
    companies: (companies.data as Rows).map(c => ({ id: c.id, name: c.name, url: c.url, logo: mediaUrl(c.logo_r2_key), logoKeepColors: c.logo_keep_colors, figure: c.figure, showInClients: c.show_in_clients, sort: c.sort })),
    testimonials: (testimonials.data as Rows).map(t => ({ id: t.id, companyId: t.company_id, kind: t.kind, quote: t.quote, name: t.name, nameUrl: t.name_url, role: t.role, sort: t.sort, active: t.active })),
  };
});

/* ---------- public proposal ---------- */

export const getPublished = cache(async (slug: string): Promise<{ id: string; state: ProposalState } | null> => {
  if (!hasSupabase()) {
    const row = [...fixtureProposals().values()].find(r => r.slug === slug);
    return row && row.status === "published" && row.published_state ? { id: row.id, state: row.published_state } : null;
  }
  const { data, error } = await publicClient()
    .from("proposals").select("id, status, published_state").eq("slug", slug).eq("status", "published").maybeSingle();
  if (error) throw error;
  return data?.published_state ? { id: data.id, state: data.published_state as ProposalState } : null;
});
