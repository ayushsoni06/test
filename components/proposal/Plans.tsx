"use client";
import { Fragment, useEffect, useRef, useState } from "react";
import { DEFAULT_CUSTOM, PLAN_DETAILS_OPEN, PLANS } from "@/content/base";
import { currentPlan, money, planPhases, svc, weeksOf } from "@/lib/proposal";
import { store, T, useP } from "./context";

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
import { TweenK } from "./Process";

const Chevron = () => (
  <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export function Overview() {
  const { model, selection, setSelection } = useP();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  useEffect(() => { setOpen(store.get<Record<string, boolean>>("hex-plan-open") || {}); }, []);
  const isOpen = (id: string) => open[id] ?? PLAN_DETAILS_OPEN;
  const toggle = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const next = { ...open, [id]: !isOpen(id) }; setOpen(next); store.set("hex-plan-open", next);
  };
  const pick = (plan: string) => setSelection({ plan, custom: plan === "custom" && !selection.custom.length ? DEFAULT_CUSTOM : selection.custom });
  const tok = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const set = new Set(selection.custom);
    set.has(id) ? set.delete(id) : set.add(id);
    const custom = model.ORDER.filter(x => set.has(x));
    setSelection({ plan: custom.length ? "custom" : null, custom });
  };
  const cw = weeksOf(selection.custom, model);
  const toggleBtn = (id: string) => (
    <button type="button" className="plan-toggle" aria-expanded={isOpen(id)} aria-label={isOpen(id) ? "Hide services" : "Show services"} onClick={toggle(id)}><Chevron /></button>
  );

  return (
    <section className="section" id="overview" aria-labelledby="h-overview">
      <div className="section-head"><T k="overview:1" as="h2" id="h-overview" /><T k="overview:2" as="span" className="meta" /></div>
      <div className="section-body">
        <T k="overview:3" className="lede" />
        <div className="plan-list" id="plans" role="radiogroup" aria-label="Plans">
          {PLANS.map((p, i) => {
            const ids = planPhases(p, model), prev = i ? new Set(planPhases(PLANS[i - 1], model)) : null, w = weeksOf(ids, model);
            return (
              <label className={`plan-row${isOpen(p.id) ? "" : " shut"}`} key={p.id}>
                <input type="radio" name="plan" value={p.id} checked={selection.plan === p.id} onChange={() => pick(p.id)} />
                <div className="plan-main">
                  <div className="plan-top"><h3>{p.name}</h3><div className="facts num"><span>{`${money(w, model)} USD`}</span><span>{`${w} weeks`}</span>{toggleBtn(p.id)}</div></div>
                  <div className="plan-more"><div><p dangerouslySetInnerHTML={{ __html: ids.map(id => prev && !prev.has(id) ? `<b>${esc(svc(id, model))}</b>` : esc(svc(id, model))).join(", ") }} /></div></div>
                </div>
              </label>
            );
          })}
          <label className={`plan-row${isOpen("custom") ? "" : " shut"}`}>
            <input type="radio" name="plan" value="custom" checked={selection.plan === "custom"} onChange={() => pick("custom")} />
            <div className="plan-main">
              <div className="plan-top"><h3>Custom plan</h3><div className="facts num">{cw ? <TweenK id="customFacts" k={cw * model.rate} suffix=" USD" /> : <span id="customFacts" />}{toggleBtn("custom")}</div></div>
              <div className="plan-more"><div><p className="rich">{"Build your own from the stages above. Tap to add or drop: "}
                {model.phases.map((p, i) => (
                  <Fragment key={p.id}>{i ? " " : null}<span className="tw"><button type="button" className="tok" data-id={p.id} aria-pressed={selection.custom.includes(p.id)} onClick={tok(p.id)}>{p.short}</button>{i < model.phases.length - 1 ? "," : null}</span></Fragment>
                ))}
                {". "}<span className="sum num" id="customSum">{cw ? `That’s ${cw} week${cw === 1 ? "" : "s"}, ${money(cw, model)}.` : "Nothing picked yet."}</span>
              </p></div></div>
            </div>
          </label>
        </div>
      </div>
    </section>
  );
}

export function NextSteps() {
  const { state, model, selection, reduced } = useP();
  const plan = currentPlan(selection, model);
  const on = !!(plan && plan.phases.length), w = on ? weeksOf(plan!.phases, model) : 0;
  const msg = on
    ? `HEX x ${state.client.company} proposal\nPlan: ${plan!.name}\nInvestment: ${money(w, model)} USD\nTimeline: ${w} weeks\nScope: ${plan!.phases.map(id => svc(id, model)).join(", ")}`
    : "";
  const [copied, setCopied] = useState<null | { ok: boolean; msg: string }>(null);
  const [label, setLabel] = useState<string | null>(null);
  const pre = useRef<HTMLPreElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Any change of plan resets the panel, like renderCTA.
  useEffect(() => { setCopied(null); setLabel(null); clearTimeout(timer.current); }, [msg]);
  useEffect(() => {
    if (copied && !copied.ok && pre.current) { const r = document.createRange(); r.selectNodeContents(pre.current); const s = getSelection()!; s.removeAllRanges(); s.addRange(r); }
  }, [copied]);

  const click = async () => {
    if (!msg) { document.getElementById("overview")!.scrollIntoView({ behavior: reduced ? "auto" : "smooth" }); return; }
    const ok = await copyText(msg);
    setCopied({ ok, msg }); setLabel(ok ? "Copied ✓" : "Select and copy");
    clearTimeout(timer.current); timer.current = setTimeout(() => setLabel("Copy again"), 2400);
  };

  return (
    <section className="section" id="next-steps" aria-labelledby="h-next">
      <div className="section-head"><T k="next-steps:1" as="h2" id="h-next" /><T k="next-steps:2" as="span" className="meta" /></div>
      <div className="section-body">
        <ol className="steps">
          {[3, 4, 5, 6].map(n => <li key={n}><T k={`next-steps:${n}`} as="span" /></li>)}
        </ol>
        <div className="go">
          <p id="goText">{on
            ? <>{`Going with ${plan!.name.toLowerCase()}. `}<span className="num">{`${w} weeks, ${money(w, model)} USD.`}</span></>
            : <>Ready when you are. <span>Pick a plan above to get started.</span></>}</p>
          <button className={`btn btn-primary btn-lg${copied ? " done" : ""}`} type="button" id="ctaCopy" onClick={click}>
            <span id="ctaLabel">{label ?? (on ? "Get started" : "Choose a plan")}</span> <span className="arr" aria-hidden="true">→</span>
          </button>
        </div>
        <div className={`go-copied${copied ? " on" : ""}`} id="goCopied" aria-live="polite"><div><div className="gc-in">
          <p className="gc-head" id="gcHead">{copied && <><b>{copied.ok ? "Plan, cost and timeline copied." : "Copy your plan below."}</b><span>Paste it into our email thread with any questions, or to let us know you’d like to go ahead.</span></>}</p>
          <pre className="gc-msg" id="gcMsg" ref={pre}>{copied?.msg}</pre>
        </div></div></div>
      </div>
    </section>
  );
}

async function copyText(t: string) {
  try { await navigator.clipboard.writeText(t); return true; } catch {}
  try {
    const ta = document.createElement("textarea"); ta.value = t; ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0"; document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy"); ta.remove(); return ok;
  } catch { return false; }
}
