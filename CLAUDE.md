# HEX Proposals

Read `BRIEF.md` first. It is the spec. `reference/proposal.html` is the design and behaviour source of truth: port it, don't redesign it.

- Ask before adding dependencies beyond Next.js, Supabase and the AWS S3 SDK (for R2).
- Keep UI copy short and in HEX's voice: direct, no marketing fluff.
- Check `prefers-reduced-motion` and 390px layouts before calling any UI task done.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
