/* Builds the library from the reference constants. Used by the SQL seed and by local fixture mode. */
import { CLIENTS, LIBRARY, NOTES, TEAM } from "../content/library.ts";
import type { Company, Library } from "./types.ts";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function seedLibrary(): Library {
  const companies = new Map<string, Company>();
  // Recent clients first so their order is the list order; testimonial companies merge in after.
  CLIENTS.forEach(([name, figure], i) => {
    companies.set(name, { id: `co-${slugify(name)}`, name, url: null, logo: null, logoKeepColors: false, figure, showInClients: true, sort: i });
  });
  NOTES.forEach((n, i) => {
    const c = companies.get(n.co);
    if (c) c.url ||= n.coUrl || null;
    else companies.set(n.co, { id: `co-${slugify(n.co)}`, name: n.co, url: n.coUrl || null, logo: null, logoKeepColors: false, figure: null, showInClients: false, sort: 1000 + i });
  });
  return {
    projects: LIBRARY.map((p, i) => ({ slug: p.slug, title: p.title, lede: p.lede, services: p.services, year: p.year, tags: p.tags, palette: p.pal, url: p.url ?? null, sort: i })),
    projectMedia: {},
    team: TEAM.map(([name, role], i) => ({ id: `tm-${slugify(name)}`, name, role, photo: null, sort: i, active: true })),
    companies: [...companies.values()],
    testimonials: NOTES.map((n, i) => ({
      id: `t-${slugify(n.co)}`, companyId: companies.get(n.co)!.id, kind: n.kind, quote: n.q, name: n.name,
      nameUrl: n.nameUrl || null, role: n.role, sort: i, active: true,
    })),
  };
}
