/*
 * Local dev only: writes the reference's embedded media to public/dev-media (gitignored)
 * so fixture mode can show the same page as the reference without R2.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { decodeDataUri, readReferenceState, type RefMedia } from "./reference.ts";

const state = readReferenceState();
const outDir = new URL("../public/dev-media/", import.meta.url);
mkdirSync(outDir, { recursive: true });
mkdirSync(new URL("../fixtures/local/", import.meta.url), { recursive: true });

const projectMedia: Record<string, { kind: string; url: string; alt?: string; dummy?: boolean }[]> = {};
for (const [slug, list] of Object.entries(state.media as Record<string, RefMedia[]>)) {
  projectMedia[slug] = list.map((m, i) => {
    const { ext, bytes } = decodeDataUri(m.src);
    const name = `${slug}-${i + 1}.${ext}`;
    writeFileSync(new URL(name, outDir), bytes);
    return { kind: m.kind, url: `/dev-media/${name}`, ...(m.alt ? { alt: m.alt } : {}), ...(m.alt === "Placeholder" ? { dummy: true } : {}) };
  });
}
writeFileSync(new URL("../fixtures/local/media.json", import.meta.url), JSON.stringify({ projectMedia }, null, 2));
console.log(`Wrote ${Object.values(projectMedia).flat().length} files to public/dev-media`);
