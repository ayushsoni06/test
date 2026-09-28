/*
 * Allowlist sanitizer for edited static copy, the server-safe twin of the reference's `clean()`.
 * Keeps B, STRONG, I, EM, BR, A and SPAN with a few attributes. Any other tag is dropped and its text kept.
 */
const TAGS = new Set(["b", "strong", "i", "em", "br", "a", "span"]);
const ATTRS = new Set(["href", "target", "rel", "class", "data-bind", "data-rate"]);
const escAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function safeHref(v: string) {
  const s = v.trim().replace(/[\u0000-\u001f\s]+/g, "");
  return /^(https?:|mailto:|#|\/)/i.test(s) ? v.trim() : null;
}

export function sanitize(html: string): string {
  let out = "";
  const re = /<!--[\s\S]*?-->|<\/?([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^\s"'>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*\/?>|<|[^<]+/g;
  const drop = /^(script|style|iframe|object|embed|template|noscript|textarea|title)$/i;
  let skipping: string | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const tok = m[0];
    if (tok.startsWith("<!--")) continue;
    if (m[1]) {
      const name = m[1].toLowerCase(), closing = tok.startsWith("</");
      if (skipping) { if (closing && name === skipping) skipping = null; continue; }
      if (drop.test(name)) { if (!closing && !tok.endsWith("/>")) skipping = name; continue; }
      if (!TAGS.has(name)) continue;
      if (closing) { if (name !== "br") out += `</${name}>`; continue; }
      let attrs = "";
      const ar = /([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
      let a: RegExpExecArray | null;
      while ((a = ar.exec(m[2] || ""))) {
        const k = a[1].toLowerCase();
        if (!ATTRS.has(k)) continue;
        let v = a[2] ?? a[3] ?? a[4] ?? "";
        if (k === "href") { const h = safeHref(v); if (h == null) continue; v = h; }
        attrs += ` ${k}="${escAttr(v)}"`;
      }
      out += `<${name}${attrs}>`;
      continue;
    }
    if (skipping) continue;
    out += tok === "<" ? "&lt;" : tok.replace(/>/g, "&gt;");
  }
  return out;
}
