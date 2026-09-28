# HEX Proposals — build brief

Turn the single-file proposal page in `reference/proposal.html` into a hosted tool at **proposals.hex.inc**. HEX staff create, edit and publish client proposals. Clients get a clean read-only link.

`reference/proposal.html` is the source of truth for **design, copy, layout and interactions**. Port it faithfully. Don't redesign. Everything that currently depends on the Claude artifact runtime (`window.claude.use(...)`, data-URI media, publishing the page's own HTML) gets replaced with a real backend.

---

## Stack

- **Next.js** (App Router, TypeScript) on **Vercel**
- **Supabase**: Postgres + Auth (Google OAuth, restricted to `@hex.inc` emails)
- **Cloudflare R2** for media (HEX already uses R2), uploaded through presigned PUT URLs
- Domain: `proposals.hex.inc` (CNAME to Vercel)
- Styling: port the reference CSS as-is into a global stylesheet. Keep the tokens, the class names and both palettes (`mono` is the default, `hex` is set by `[data-palette="hex"]`). No Tailwind rewrite.
- Font: `"TWK Lausanne"` first in the stack. Self-host it from `/public/fonts` if we have the license files, otherwise fall back to Inter Tight as it does now.

## Routes

| Route | Who | What |
|---|---|---|
| `/` | public | Redirect to `https://www.hex.inc` |
| `/[slug]` | public | Published proposal, read-only, server-rendered. `noindex` meta plus an `X-Robots-Tag` header. 404 if the proposal is unpublished or archived. |
| `/admin` | staff | List of proposals (client, status, updated, last opened), plus "New proposal" |
| `/admin/new` | staff | Creates a proposal from the base template, then redirects to the editor |
| `/admin/[id]` | staff | The proposal page with **Edit page** and **Curate** always on |
| `/admin/setup` | staff | One-time library setup (see below). Only reachable until setup is finished. |
| `/admin/library` | staff | Manage the project library, team, companies/logos and testimonials |
| `/api/*` | staff | Save draft, publish, duplicate, archive, presign upload |

Slugs are human-readable plus a short random suffix (`fireflies-k7m2`), so links can't be guessed.

## Data model

Shared content lives in **library tables**, so media uploaded once gets reused in every proposal. Each proposal stores only its **overrides** in the same `state` JSON shape the reference page already uses.

```sql
proposals (
  id uuid pk, slug text unique, client_company text,
  status text check (status in ('draft','published','archived')) default 'draft',
  draft_state jsonb not null,        -- what the editor reads and writes
  published_state jsonb,             -- what /[slug] renders; copied from draft on Publish
  created_by uuid, created_at timestamptz, updated_at timestamptz, published_at timestamptz
)

projects (slug text pk, title text, lede text, services text, year int, tags text[],
          palette text[2], url text, sort int)                 -- seed from LIBRARY in reference
project_media (id uuid pk, project_slug text fk, kind text check (kind in ('image','video')),
               r2_key text, alt text, sort int)
team_members (id uuid pk, name text, role text, photo_r2_key text, sort int, active bool)
companies (id uuid pk, name text unique, url text, logo_r2_key text,
           figure text,                -- e.g. "$85M Series B"; shown in Recent clients
           show_in_clients bool, sort int)   -- seed from CLIENTS + the companies in NOTES
testimonials (id uuid pk, company_id uuid fk companies, kind text, quote text[], name text,
              name_url text, role text, sort int, active bool)  -- seed from NOTES
org_settings (id int pk default 1, setup_completed_at timestamptz,
              setup_skipped jsonb default '{}')   -- item ids deliberately skipped in setup
proposal_views (id bigserial, proposal_id uuid, viewed_at timestamptz, ua text)  -- phase 2
```

Row-level security: public can `select` published proposals by slug and the library tables. Only authenticated `@hex.inc` users can write.

### `state` shape (unchanged from the reference, except media)

```ts
{
  client: { company, contact, date },
  preparedBy,
  palette?: 'hex',                      // omit for mono
  hero: { media: Media[] },             // empty = default reel video URL
  slots: [slug, slug, slug, slug],      // 4 project slugs from `projects`
  display: { [slug]: 'rotate' | 'single' },
  ideas: { caption, media: Media[] }[], // hidden from clients when media is empty
  content: {                            // page edits; empty = base template
    rate?: number,                      // $K per week, base 7.5
    texts?: { [key]: html },            // keyed like the reference's data-t keys
    phases?: Phase[],                   // full override of PHASES_BASE when present
    groups?: { key, name }[]            // bucket order + names
  }
}
Media = { kind: 'image' | 'video', url: string, alt?: string }   // url points at R2 now, not a data URI
```

Per-proposal media overrides stay inside `state`. Project media comes from `project_media` unless the proposal overrides it.

**Base template** = the constants in the reference (`PHASES_BASE`, `GROUPS_BASE`, `PLANS`, `BASE_RATE`, and the default static copy). Keep them in `/content/base.ts`. Editing a proposal never touches the base. "Reset to base" clears `content`.

## Behaviour to preserve (acceptance checklist)

Use the reference as the spec. Every item below must work the same way:

**Page (public)**
- [ ] Full-bleed cover with the video, a gradient scrim, the title fitted to the width, and the one-time rise-in animation
- [ ] Sticky sidebar that highlights the section in view, a progress bar, and a mobile top bar with a sections sheet
- [ ] Intro with the at-a-glance list (scope, timeline, team, date). **No pricing here.**
- [ ] Approach grid with the staggered right column
- [ ] Recent work: 4 slots in two staggered columns. Multi-media frames use click-through (← n/N →, click the left or right half, swipe), with **no autoplay**. Only the title is a link. A project with no media falls back to a poster.
- [ ] Client notes with a directional slide (≈120ms out, ≈240ms in). Prev/Next, dots, arrow keys and swipe all work, and the box is vertically centred.
- [ ] Recent clients in two columns, figures muted
- [ ] Process tables: one outer border with single 1px dividers between stages. No stacked or overlapping borders, so every line has the same weight.
- [ ] Process: buckets, then stages, with nested sub-blocks, deliverable chips, the Brand development definition list, and weeks and price per stage. Sticky timeline beside the list, moving below it under ~1040px of content width. Row and bar hover-link. Stages not in the selected plan are dimmed.
- [ ] Team as a vertical list with a round photo or initials
- [ ] Overview: plan rows with radios, collapsible services (chevron, `PLAN_DETAILS_OPEN` flag), and a rich-text custom plan (tap words to toggle). Totals count up.
- [ ] Next steps plus the one-line Get started. It **copies plan, cost, timeline and scope only** (no drafted email), shows the confirmation panel, and falls back to select-to-copy.
- [ ] FAQ accordion; the rate in the billing answer is live
- [ ] Mono / HEX palettes, `prefers-reduced-motion` respected, and no horizontal overflow at 390px

**Editor (staff only)**
- [ ] Edit page: contenteditable static copy; stage titles, bodies, chips and definition-list lines; weeks ±; add and remove stages, chips and lines; move stages ↑↓ across buckets; rename, reorder, add and delete buckets (with confirmation when stages would go too); rate input; Mono/HEX toggle
- [ ] Curate: client fields, cover media, the 4 slot pickers from `projects`, per-slot media (a "Click through all / First only" toggle and "Make first"), team photos, and early ideas
- [ ] **Save draft** (autosave, debounced ~1s, with a "Saved" indicator), **Publish** (copies draft to published), **Discard** (reverts to the last saved draft), **Reset to base**
- [ ] Clear signal when the draft differs from the published version
- [ ] New proposal, Duplicate, Archive, and Copy link from `/admin`
- [ ] First-run setup: 3 steps, bulk drop with filename matching, skip per item, and the banner and route gone for good once finished
- [ ] Testimonial logos tinted to `--ink` in both palettes, with text fallback

## First-run library setup

A one-time pass to fill the shared library, so every proposal after it has real media. It must feel quick: batch uploads, no page reloads, and every item optional.

**Entry.** After the first staff login, `/admin` shows one slim banner: "Finish library setup (12 of 58 done)". Clicking it opens `/admin/setup`. Once setup is finished, the banner and route disappear for good (`org_settings.setup_completed_at`). Everything stays editable later in `/admin/library`.

**Three steps**, with a step switcher and an overall progress count at the top:

1. **Team photos.** One row per active team member: round preview, name, role, and a drop zone. Also accept dropping many files at once and auto-match by filename (`ayush-soni.jpg` goes to Ayush Soni); show the matches for a quick confirm before saving. Crop to a square client-side and resize to 480px.
2. **Client logos.** One row per company that appears in testimonials (first) or in Recent clients (after). Prefer SVG, and accept PNG/WebP with transparency. Show a live preview of how it will look in the testimonial on **both** palettes. Bulk drop auto-matches by filename, as above.
3. **Project images.** One card per project in the library, with the projects used in live proposals listed first. Each card is a multi-file drop zone with reorderable thumbnails (drag, or "Make first"). Show the card in its real 28:15 frame so crops are obvious.

**Rules.**
- Each item is done, empty, or **skipped** ("We don't have one"). Skipped items count as complete and stop nagging.
- "Finish setup" is always available. Anything left empty just falls back gracefully (below).
- Uploads start immediately on drop, with inline progress. The screen never blocks.

**Public fallbacks** (nothing ever looks broken to a client):
- No team photo: show initials in the round avatar (current behaviour).
- No logo: show the company name as a text wordmark (current behaviour).
- No project media: show the colour poster (current behaviour).

**Logo rendering in testimonials.** Height 28px, max-width 180px, centred above the service label. Render SVG and transparent PNG as a CSS `mask-image` filled with `var(--ink)`, so logos match both Mono and HEX. If a logo is full-colour and shouldn't be tinted, a per-company "Keep original colours" toggle renders it as a plain `<img>`.

## Uploads

- `POST /api/upload` → returns a presigned R2 PUT URL plus the public URL. The client uploads directly.
- Images: resize client-side to at most 2400px wide and encode as WebP around q82 before upload. Team photos: at most 480px.
- Videos: no re-encode. Cap at 60 MB and warn above 20 MB.
- Serve through an R2 custom domain (e.g. `media.hex.inc`), cached.

## Migration

1. Seed the library tables from `LIBRARY`, `CLIENTS`, `TEAM` and `NOTES` in the reference. Companies get created from both CLIENTS and NOTES, deduplicated by name.
2. Import the Fireflies proposal: parse the `<script id="hex-state">` JSON in `reference/proposal.html`, upload every `data:` URI to R2, rewrite them to URLs, and insert the result as a **published** proposal with slug `fireflies-<suffix>`. Move the Grafana video and the dummy images into `project_media` (keep the dummies flagged so they're easy to delete).

## Environment

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_BASE_URL=          # e.g. https://media.hex.inc
ALLOWED_EMAIL_DOMAIN=hex.inc
DEFAULT_COVER_VIDEO=https://pub-90a8fdb55fdc4673a260975cda4e4309.r2.dev/Export%20(2).mp4
```

## Phase 2 (don't build yet)

- Open tracking: log views on `/[slug]` (skip staff sessions) and show "opened 3× · last 2h ago" in `/admin`
- Slack ping when a client first opens a proposal
- Hover preview on client names
- PDF export of a proposal

## Working agreement

- Build in this order: schema + seed → public `/[slug]` render matching the reference pixel for pixel → admin list → editor + autosave → uploads → first-run setup → migration → deploy.
- After the public page renders, screenshot it at 1440px and 390px next to the reference and fix any differences before moving on.
- Keep copy tight. Don't add marketing language to the UI.
