# HEX Proposals

Hosted proposals at `proposals.hex.inc`. Spec: [`BRIEF.md`](BRIEF.md). Design and behaviour source of truth: `reference/proposal.html`.

## Run locally

```
npm install
npm run fixtures   # pulls the reference's embedded media into public/dev-media (gitignored)
npm run dev        # http://localhost:3000/fireflies-demo
```

Without Supabase env vars the app runs on fixtures: the library comes from `content/library.ts`, and one published proposal (`fireflies-demo`) comes from `fixtures/fireflies.json`.

## Database

- `supabase/migrations/0001_init.sql`: tables, RLS, `is_staff()` (email domain check; keep it in sync with `ALLOWED_EMAIL_DOMAIN`).
- `supabase/seed.sql`: library seed, generated from `content/library.ts` with `npm run seed:sql`.

Apply both in the Supabase SQL editor, or with `psql "$SUPABASE_DB_URL" -f …`.

## Layout

| Path | What |
|---|---|
| `app/globals.css` | Reference CSS, ported as-is, plus a few marked additions |
| `content/base.ts` | Base template: phases, groups, plans, rate, default copy |
| `lib/proposal.ts` | Pure page logic (plans, weeks, money, bindings) |
| `components/proposal/` | The page, section by section, same markup and class names as the reference |
| `lib/data.ts` | Supabase reads, with the fixture fallback |
