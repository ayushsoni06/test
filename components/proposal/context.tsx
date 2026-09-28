"use client";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ElementType, type ReactNode } from "react";
import { DEFAULT_CUSTOM } from "@/content/base";
import { clone, fillBindings, fmtK, loadContent, textHtml, type Model, type Selection } from "@/lib/proposal";
import { sanitize } from "@/lib/sanitize";
import type { Library, ProposalState } from "@/lib/types";

export const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

type Ctx = {
  state: ProposalState;
  lib: Library;
  model: Model;
  /** Edit page is on: static copy and stages are editable. */
  editing: boolean;
  /** Staff view: Curate is on, empty idea slots show. */
  staff: boolean;
  update: (mut: (s: ProposalState) => void) => void;
  /** Bumped when the draft is replaced wholesale (Discard, Reset) so editable nodes reload their HTML. */
  epoch: number;
  selection: Selection;
  setSelection: (s: Selection) => void;
  reduced: boolean;
  storageKey: string;
};

const C = createContext<Ctx | null>(null);
export const useP = () => useContext(C)!;

export const store = {
  get<T>(k: string): T | null { try { return JSON.parse(localStorage.getItem(k) as string); } catch { return null; } },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

export function ProposalProvider(props: {
  state: ProposalState; lib: Library; slug: string; editing?: boolean; staff?: boolean; epoch?: number;
  onChange?: (next: ProposalState) => void; children: ReactNode;
}) {
  const { state, lib, onChange } = props;
  const model = useMemo(() => loadContent(state.content), [state.content]);
  const reduced = useReducedMotion();
  const storageKey = `hex-plan:${props.slug}`;
  const [selection, setSel] = useState<Selection>({ plan: null, custom: DEFAULT_CUSTOM });
  useEffect(() => {
    const saved = store.get<Selection>(storageKey);
    if (saved) setSel({ plan: saved.plan ?? null, custom: Array.isArray(saved.custom) ? saved.custom : [] });
  }, [storageKey]);
  const setSelection = useCallback((s: Selection) => { setSel(s); store.set(storageKey, s); }, [storageKey]);
  // Stages can disappear while editing; keep the custom pick valid.
  const liveSelection = useMemo(() => ({ ...selection, custom: selection.custom.filter(id => model.PH[id]) }), [selection, model]);
  const stateRef = useRef(state);
  stateRef.current = state;
  const update = useCallback((mut: (s: ProposalState) => void) => {
    if (!onChange) return;
    const next = clone(stateRef.current); mut(next); next.content ||= {};
    stateRef.current = next; onChange(next);
  }, [onChange]);
  const value: Ctx = {
    state, lib, model, editing: !!props.editing, staff: !!props.staff, update, epoch: props.epoch ?? 0,
    selection: liveSelection, setSelection, reduced, storageKey,
  };
  return <C.Provider value={value}>{props.children}</C.Provider>;
}

/**
 * A piece of static copy keyed like the reference (`section:n`).
 * Read-only: rendered HTML. Editing: contenteditable that owns its DOM, so typing never loses the caret.
 */
export function T({ k, as: Tag = "p", className, id }: { k: string; as?: ElementType; className?: string; id?: string }) {
  const { state, model, editing, update, epoch } = useP();
  const html = textHtml(k, state, model.rate);
  const ref = useRef<HTMLElement>(null);
  useIsoLayoutEffect(() => {
    if (editing && ref.current) ref.current.innerHTML = html;
    // Only on entering edit mode or a wholesale reset; live typing keeps its DOM.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, epoch]);
  // Keep bound values (company, rate, …) current inside edited copy.
  useEffect(() => {
    if (!editing || !ref.current) return;
    const map: Record<string, string> = { company: state.client.company, contact: state.client.contact, date: state.client.date, preparedBy: state.preparedBy };
    ref.current.querySelectorAll<HTMLElement>("[data-bind]").forEach(el => { el.textContent = map[el.dataset.bind!] ?? ""; });
    ref.current.querySelectorAll<HTMLElement>("[data-rate]").forEach(el => { el.textContent = fmtK(model.rate); });
  }, [editing, state.client, state.preparedBy, model.rate]);
  if (!editing) return <Tag ref={ref} className={className} id={id} data-t={k} dangerouslySetInnerHTML={{ __html: html }} />;
  return (
    <Tag
      ref={ref} className={className} id={id} data-t={k} contentEditable suppressContentEditableWarning spellCheck={false}
      onInput={(e: React.FormEvent<HTMLElement>) => { const v = sanitize(e.currentTarget.innerHTML); update(s => { (s.content.texts ||= {})[k] = v; }); }}
      onPaste={(e: React.ClipboardEvent) => { e.preventDefault(); document.execCommand("insertText", false, e.clipboardData.getData("text/plain")); }}
    />
  );
}

export { fillBindings };
