/* Reads the saved state out of reference/proposal.html. Shared by the fixture extractor and the migration. */
import { readFileSync } from "node:fs";

export type RefMedia = { kind: "image" | "video"; src: string; alt?: string };

export function readReferenceState(path = new URL("../reference/proposal.html", import.meta.url)) {
  const html = readFileSync(path, "utf8");
  const open = '<script type="application/json" id="hex-state">';
  const a = html.indexOf(open), b = html.indexOf("</" + "script>", a);
  if (a < 0 || b < 0) throw new Error("hex-state block not found");
  return JSON.parse(html.slice(a + open.length, b));
}

export function decodeDataUri(uri: string) {
  const m = /^data:([^;,]+);base64,(.*)$/s.exec(uri);
  if (!m) throw new Error("not a base64 data URI");
  const type = m[1], ext = type.split("/")[1].replace("quicktime", "mov").replace("jpeg", "jpg");
  return { type, ext, bytes: Buffer.from(m[2], "base64") };
}
