/* Pure proposal logic, ported from the reference script. Safe on server and client. */
import { BASE_RATE, BASE_TEXT, GROUPS_BASE, PHASES_BASE, PLANS } from "../content/base.ts";
import { sanitize } from "./sanitize.ts";
import type { Content, Group, Phase, Plan, ProposalState } from "./types.ts";

export const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o));

export type Model = { rate: number; phases: Phase[]; groups: Group[]; PH: Record<string, Phase>; ORDER: string[] };

/* Stages always sit in bucket order; the timeline runs top to bottom. */
export function reindex(phases: Phase[], groups: Group[], rate: number): Model {
  groups = groups.slice();
  phases.forEach(p => { if (!groups.some(g => g.key === p.group)) groups.push({ key: p.group, name: p.group }); });
  phases = groups.flatMap(g => phases.filter(p => p.group === g.key));
  return { rate, phases, groups, PH: Object.fromEntries(phases.map(p => [p.id, p])), ORDER: phases.map(p => p.id) };
}

export function loadContent(c: Content = {}): Model {
  return reindex(clone(c.phases || PHASES_BASE), clone(c.groups || GROUPS_BASE), +(c.rate ?? 0) || BASE_RATE);
}

/* Base plan scope, minus removed stages, plus any stage added to a group the plan already covers. */
export function planPhases(p: Plan, m: Model): string[] {
  if (p.phases === "all") return m.ORDER.slice();
  const base = p.phases.filter(id => m.PH[id]), groups = new Set(base.map(id => m.PH[id].group));
  return m.ORDER.filter(id => base.includes(id) || (m.PH[id].added && groups.has(m.PH[id].group)));
}

export const weeksOf = (ids: string[], m: Model) => ids.reduce((a, id) => a + (m.PH[id] ? m.PH[id].weeks : 0), 0);
export const fmtK = (k: number) => { k = +k.toFixed(1); return "$" + (Number.isInteger(k) ? k : k.toFixed(1)) + "K"; };
export const money = (w: number, m: Model) => fmtK(w * m.rate);
export const svc = (id: string, m: Model) => (m.PH[id] ? m.PH[id].short : "");
export const initials = (n: string) => n.split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();

export type Selection = { plan: string | null; custom: string[] };

export function currentPlan(sel: Selection, m: Model): { id: string; name: string; phases: string[] } | null {
  if (sel.plan === "custom") return { id: "custom", name: "Custom plan", phases: m.ORDER.filter(id => sel.custom.includes(id)) };
  const p = PLANS.find(p => p.id === sel.plan);
  return p ? { ...p, phases: planPhases(p, m) } : null;
}
export const selectedPhases = (sel: Selection, m: Model) => currentPlan(sel, m)?.phases ?? m.ORDER;

/* Three flat tones, then hatched variants so a 4th+ bucket never looks like the 1st. */
const mix = (n: number) => `color-mix(in srgb,var(--ink) ${n}%,var(--bg))`;
const SHADES = [mix(100), mix(60), mix(32),
  `repeating-linear-gradient(135deg,${mix(100)} 0 2px,${mix(35)} 2px 5px)`,
  `repeating-linear-gradient(135deg,${mix(60)} 0 2px,${mix(12)} 2px 5px)`,
  `repeating-linear-gradient(90deg,${mix(100)} 0 1.5px,${mix(20)} 1.5px 4px)`];
export const shade = (key: string, m: Model) => SHADES[Math.max(0, m.groups.findIndex(g => g.key === key)) % SHADES.length];

const escText = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/** Static copy for a data-t key: the proposal's override (sanitized) or the base, with bindings filled in. */
export function textHtml(key: string, state: ProposalState, rate: number): string {
  const t = state.content.texts || {};
  const raw = key in t ? sanitize(t[key]) : BASE_TEXT[key] ?? "";
  return fillBindings(raw, state, rate);
}

export function fillBindings(html: string, state: ProposalState, rate: number): string {
  const map: Record<string, string> = {
    company: state.client.company, contact: state.client.contact, date: state.client.date, preparedBy: state.preparedBy,
  };
  return html
    .replace(/(<span[^>]*\bdata-bind="(\w+)"[^>]*>)[^<]*(<\/span>)/g, (_, open, k, close) => open + escText(map[k] ?? "") + close)
    .replace(/(<span[^>]*\bdata-rate(?:="")?[^>]*>)[^<]*(<\/span>)/g, (_, open, close) => open + fmtK(rate) + close);
}
