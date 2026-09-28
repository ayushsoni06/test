"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { clone, money, reindex, selectedPhases, currentPlan, shade, weeksOf, fmtK, type Model } from "@/lib/proposal";
import type { Group, Phase, ProposalState } from "@/lib/types";
import { T, useP } from "./context";

/** Small count-up so totals feel alive when they change. */
export function TweenK({ k, suffix = "", id }: { k: number; suffix?: string; id?: string }) {
  const { reduced } = useP();
  const ref = useRef<HTMLSpanElement>(null);
  const last = useRef(k);
  useEffect(() => {
    const el = ref.current!; const from = last.current; last.current = k;
    if (reduced || from === k) { el.textContent = fmtK(k) + suffix; return; }
    const t0 = performance.now(), d = 260; let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / d), e = 1 - Math.pow(1 - t, 3);
      el.textContent = fmtK(Math.round((from + (k - from) * e) * 2) / 2) + suffix;
      if (t < 1) raf = requestAnimationFrame(tick); else el.textContent = fmtK(k) + suffix;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [k, suffix, reduced]);
  return <span ref={ref} id={id}>{fmtK(k) + suffix}</span>;
}

/** contenteditable leaf for stage fields. Owns its DOM while focused so the caret never jumps. */
function F({ as: Tag = "span", value, onText, ...rest }: { as?: "span" | "p" | "h5" | "dt" | "dd" | "h3"; value: string; onText: (v: string) => void; [k: string]: unknown }) {
  const { editing } = useP();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { const el = ref.current; if (el && document.activeElement !== el && el.textContent !== value) el.textContent = value; }, [value, editing]);
  if (!editing) return <Tag {...rest}>{value}</Tag>;
  return (
    <Tag
      {...rest} ref={ref as never} contentEditable suppressContentEditableWarning spellCheck={false}
      onInput={(e: React.FormEvent<HTMLElement>) => onText(e.currentTarget.textContent!.replace(/\s+/g, " ").trim())}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
      onPaste={(e: React.ClipboardEvent) => { e.preventDefault(); document.execCommand("insertText", false, e.clipboardData.getData("text/plain")); }}
    />
  );
}

const newId = (p: string) => p + "-" + Date.now().toString(36);

export function Process() {
  const { state, model, editing, update, selection } = useP();
  const [hot, setHot] = useState<string | null>(null);
  const [armed, setArmed] = useState<string | null>(null);
  const focusNext = useRef<string | null>(null);
  const E = editing;

  useEffect(() => {
    if (!focusNext.current) return;
    const el = document.querySelector<HTMLElement>(focusNext.current); focusNext.current = null;
    if (el) { el.focus(); document.getSelection()?.selectAllChildren(el); }
  });

  /* ---- editing: every change rewrites content.phases + content.groups, like commitPhases ---- */
  const edit = (mut: (phases: Phase[], groups: Group[]) => void | string, focus?: string) => {
    update((s: ProposalState) => {
      const m = reindex(clone(model.phases), clone(model.groups), model.rate);
      const f = mut(m.phases, m.groups);
      const r = reindex(m.phases, m.groups, model.rate);
      s.content.phases = r.phases; s.content.groups = r.groups;
      if (typeof f === "string") focusNext.current = f; else if (focus) focusNext.current = focus;
    });
  };
  const field = (id: string, fn: (p: Phase) => void) => edit(ph => { const p = ph.find(q => q.id === id); if (p) fn(p); });

  const ids = selectedPhases(selection, model);
  const active = new Set(ids);
  const total = weeksOf(ids, model) || 1;
  const plan = currentPlan(selection, model);
  const hov = (id: string) => ({ onPointerEnter: () => setHot(id), onPointerLeave: () => setHot(h => (h === id ? null : h)) });

  const first = model.ORDER[0], last = model.ORDER[model.ORDER.length - 1];

  const x = (onClick: () => void, label = "Remove", extra: Record<string, unknown> = {}) =>
    E ? <button type="button" className="x" aria-label={label} onClick={onClick} {...extra}>×</button> : null;

  const deliv = (p: Phase, label: string | undefined, items: string[] | undefined, s: number | null) => {
    if (!items && !E) return null;
    const holder = (q: Phase) => (s == null ? q : q.subs![s]);
    return (
      <div className="deliv"><b>{label || "Deliverables"}</b>
        {(items || []).map((t, n) => (
          <span className="chip" key={n}>
            <F value={t} data-f="item" data-n={n} data-s={s ?? undefined} onText={v => field(p.id, q => { holder(q).items![n] = v; })} />
            {x(() => field(p.id, q => { holder(q).items!.splice(n, 1); }))}
          </span>
        ))}
        {E && <button type="button" className="add" onClick={() => edit(ph => {
          const q = ph.find(q => q.id === p.id)!, h = holder(q); h.items ||= []; h.label ||= "Deliverables"; h.items.push("New item");
          return `.phase[data-phase="${p.id}"] [data-f="item"][data-n="${h.items.length - 1}"]${s == null ? ":not([data-s])" : `[data-s="${s}"]`}`;
        })}>+ Add</button>}
      </div>
    );
  };

  const move = (p: Phase, up: boolean) => edit(PH => {
    const me = PH.find(q => q.id === p.id)!;
    const sib = PH.filter(q => q.group === me.group), k = sib.indexOf(me), groups = model.groups, pg = groups.findIndex(g => g.key === me.group);
    const swap = (o: Phase) => { const a1 = PH.indexOf(o), a2 = PH.indexOf(me); [PH[a1], PH[a2]] = [me, o]; };
    if (up && k > 0) swap(sib[k - 1]);
    else if (!up && k < sib.length - 1) swap(sib[k + 1]);
    else if (up && pg > 0) { PH.splice(PH.indexOf(me), 1); me.group = groups[pg - 1].key; PH.push(me); }
    else if (!up && pg < groups.length - 1) { PH.splice(PH.indexOf(me), 1); me.group = groups[pg + 1].key; PH.unshift(me); }
  });

  const phase = (p: Phase) => {
    const wk = `${p.weeks} week${p.weeks === 1 ? "" : "s"}`;
    const on = active.has(p.id);
    return (
      <article key={p.id} className={`phase${on ? "" : " out"}${hot === p.id ? " hot" : ""}`} data-phase={p.id} {...hov(p.id)}>
        <div className="phase-head">
          <h4><F value={p.title} data-f="title" onText={v => field(p.id, q => { q.title = v; if (q.id !== "moodboarding") q.short = v; })} /><span className="phase-flag">Not in this plan</span></h4>
          {E ? (
            <span className="cost num">
              <span className="wk">
                <button type="button" className="wk-btn" aria-label="One week less" onClick={() => field(p.id, q => { q.weeks = Math.max(1, q.weeks - 1); })}>−</button>
                <span>{wk}</span>
                <button type="button" className="wk-btn" aria-label="One week more" onClick={() => field(p.id, q => { q.weeks = Math.min(12, q.weeks + 1); })}>+</button>
              </span>
              <span>{money(p.weeks, model)}</span>
              <span className="stools">
                <button type="button" className="mv" aria-label="Move stage up" disabled={first === p.id} onClick={() => move(p, true)}>↑</button>
                <button type="button" className="mv" aria-label="Move stage down" disabled={last === p.id} onClick={() => move(p, false)}>↓</button>
                {x(() => edit(ph => { ph.splice(ph.findIndex(q => q.id === p.id), 1); }), "Remove stage")}
              </span>
            </span>
          ) : (
            <span className="cost num"><span>{wk}</span><span>{money(p.weeks, model)}</span></span>
          )}
        </div>
        {p.subs?.map((sb, s) => (
          <div className="sub" key={s}>
            <F as="h5" value={sb.title} data-f="sub-title" data-s={s} onText={v => field(p.id, q => { q.subs![s].title = v; })} />
            <div className="phase-body"><F as="p" value={sb.body} data-f="sub-body" data-s={s} onText={v => field(p.id, q => { q.subs![s].body = v; })} /></div>
            {deliv(p, sb.label, sb.items, s)}
          </div>
        ))}
        {p.body && <div className="phase-body">{p.body.map((t, n) => <F as="p" key={n} value={t} data-f="body" data-n={n} onText={v => field(p.id, q => { q.body![n] = v; })} />)}</div>}
        {p.list && (
          <>
            <div className="deliv"><b>Deliverables</b></div>
            <dl className="deliv-list phase-body">
              {p.list.map(([t, d], n) => (
                <div key={n}>
                  <F as="dt" value={t} data-f="dt" data-n={n} onText={v => field(p.id, q => { q.list![n][0] = v; })} />
                  <F as="dd" value={d} data-f="dd" data-n={n} onText={v => field(p.id, q => { q.list![n][1] = v; })} />
                  {x(() => field(p.id, q => { q.list!.splice(n, 1); }))}
                </div>
              ))}
            </dl>
            {E && <button type="button" className="add" onClick={() => edit(ph => { const q = ph.find(q => q.id === p.id)!; q.list!.push(["New line", "What it covers"]); return `.phase[data-phase="${p.id}"] [data-f="dt"][data-n="${q.list!.length - 1}"]`; })}>+ Add line</button>}
          </>
        )}
        {!p.list && deliv(p, p.label, p.items, null)}
      </article>
    );
  };

  const removeGroup = (g: Group) => {
    const count = model.phases.filter(q => q.group === g.key).length;
    if (count && armed !== g.key) { setArmed(g.key); setTimeout(() => setArmed(a => (a === g.key ? null : a)), 3000); return; }
    setArmed(null);
    edit((ph, groups) => {
      for (let i = ph.length - 1; i >= 0; i--) if (ph[i].group === g.key) ph.splice(i, 1);
      groups.splice(groups.findIndex(q => q.key === g.key), 1);
    });
  };
  const moveGroup = (gi: number, d: -1 | 1) => edit((_, groups) => { [groups[gi + d], groups[gi]] = [groups[gi], groups[gi + d]]; });

  // Timeline: bars laid end to end across the selected stages.
  let cursor = 0;
  const bars = model.phases.map(p => {
    const on = active.has(p.id);
    const style: CSSProperties = { background: shade(p.group, model) };
    if (on) { style.left = (cursor / total * 100) + "%"; style.width = `calc(${p.weeks / total * 100}% - 3px)`; cursor += p.weeks; }
    return { p, on, style };
  });
  const used = new Set(model.phases.map(p => p.group));

  return (
    <section className="section" id="process" aria-labelledby="h-process">
      <div className="section-head"><T k="process:1" as="h2" id="h-process" /><T k="process:2" as="span" className="meta" /></div>
      <div className="section-body">
        <T k="process:3" className="lede" />
        <div className="process-grid">
          <div id="phaseList">
            {model.groups.map((g, gi) => {
              const list = model.phases.filter(p => p.group === g.key);
              if (!list.length && !E) return null;
              return (
                <div className="phase-group" data-group={g.key} key={g.key}>
                  {E ? (
                    <div className="group-head">
                      <F as="h3" value={g.name} data-gname={g.key} onText={v => edit((_, groups) => { const q = groups.find(q => q.key === g.key); if (q) q.name = v || "Untitled"; })} />
                      <span className="gtools">
                        <button type="button" className="mv" aria-label="Move bucket up" disabled={!gi} onClick={() => moveGroup(gi, -1)}>↑</button>
                        <button type="button" className="mv" aria-label="Move bucket down" disabled={gi >= model.groups.length - 1} onClick={() => moveGroup(gi, 1)}>↓</button>
                        <button type="button" className={`x${armed === g.key ? " armed" : ""}`} aria-label="Remove bucket" onClick={() => removeGroup(g)}>
                          {armed === g.key ? `Remove bucket + ${list.length} stage${list.length > 1 ? "s" : ""}?` : "×"}
                        </button>
                      </span>
                    </div>
                  ) : (
                    <div className="group-head"><h3>{g.name}</h3></div>
                  )}
                  <div className="phases">{list.length ? list.map(phase) : <div className="empty-group">No stages yet.</div>}</div>
                  {E && <button type="button" className="add add-stage" onClick={() => {
                    const id = newId("stage");
                    edit(ph => { ph.push({ id, group: g.key, title: "New stage", short: "New stage", weeks: 1, body: ["Describe what happens in this stage."], added: true }); },
                      `.phase[data-phase="${id}"] [data-f="title"]`);
                  }}>{`+ Add stage to ${g.name.toLowerCase()}`}</button>}
                </div>
              );
            })}
            {E && <button type="button" className="add add-group" onClick={() => {
              const key = newId("bucket");
              edit((ph, groups) => {
                groups.push({ key, name: "New bucket" });
                ph.push({ id: newId("stage"), group: key, title: "New stage", short: "New stage", weeks: 1, body: ["Describe what happens in this stage."], added: true });
              }, `[data-gname="${key}"]`);
            }}>+ Add bucket</button>}
          </div>
          <aside className="gantt" aria-label="Timeline">
            <div className="gantt-head"><h3>Timeline</h3><span id="ganttLabel">{plan ? plan.name : "Full scope"}</span></div>
            <div className="gantt-grid" id="gantt" style={{ "--cols": total } as CSSProperties}>
              <div className="gantt-weeks" id="ganttWeeksRow"><span />{Array.from({ length: total }, (_, i) => <span key={i}>{i + 1}</span>)}</div>
              {bars.map(({ p, on, style }) => (
                <div key={p.id} className={`gantt-row${on ? "" : " out"}${hot === p.id ? " hot" : ""}`} data-phase={p.id} {...hov(p.id)}>
                  <span>{p.short}</span><div className="gantt-track"><i className="gantt-bar" style={style} /></div>
                </div>
              ))}
            </div>
            <div className="gantt-legend" id="ganttLegend">
              {model.groups.filter(g => used.has(g.key)).map(g => <span key={g.key}><i style={{ background: shade(g.key, model) }} />{g.name}</span>)}
            </div>
            <div className="gantt-foot num"><span id="ganttWeeks">{`${weeksOf(ids, model)} weeks`}</span><TweenK id="ganttCost" k={weeksOf(ids, model) * model.rate} suffix=" USD" /></div>
          </aside>
        </div>
      </div>
    </section>
  );
}

export type { Model };
