"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { DEFAULT_COVER, NAV, PLANS } from "@/content/base";
import { initials, planPhases, weeksOf } from "@/lib/proposal";
import type { Company, Media } from "@/lib/types";
import { T, useIsoLayoutEffect, useP } from "./context";
import { MediaBox, Poster } from "./Media";

const HexMark = () => <svg viewBox="0 0 15 17" aria-hidden="true"><path d="M7.5 0 15 4.25v8.5L7.5 17 0 12.75v-8.5z" fill="currentColor" /></svg>;

/* ================= COVER ================= */
export function Cover() {
  const { state } = useP();
  const title = useRef<HTMLSpanElement>(null);
  const company = state.client.company;
  // Fit the one-line title to the width on wide screens.
  useIsoLayoutEffect(() => {
    const fit = () => {
      const el = title.current; if (!el) return;
      const h1 = el.parentElement!;
      h1.style.fontSize = "";
      if (innerWidth <= 860) return;
      const avail = h1.clientWidth, w = el.scrollWidth;
      if (w > avail) h1.style.fontSize = (parseFloat(getComputedStyle(h1).fontSize) * avail / w * .99) + "px";
    };
    fit();
    addEventListener("resize", fit);
    document.fonts?.ready.then(fit);
    return () => removeEventListener("resize", fit);
  }, [company]);
  const list = state.hero.media || [];
  return (
    <header className="cover" aria-labelledby="heroTitle">
      {list.length
        ? <MediaBox className="cover-media" id="coverMedia" aria-hidden list={list} auto />
        : <MediaBox className="cover-media" id="coverMedia" aria-hidden list={[{ kind: "video", url: DEFAULT_COVER }]} mode="single" />}
      <div className="cover-top">
        <a className="logo" href="https://www.hex.inc" target="_blank" rel="noopener" aria-label="HEX website"><HexMark />HEX</a>
        <div className="right">
          <a className="btn btn-ghost" href="https://www.hex.inc" target="_blank" rel="noopener">Visit hex.inc</a>
          <a className="btn btn-primary" href="#next-steps">Get started <span className="arr" aria-hidden="true">→</span></a>
        </div>
      </div>
      <div className="cover-foot">
        <div className="cover-meta"><span>Proposal for <span data-bind="company">{company}</span></span><span data-bind="date">{state.client.date}</span></div>
        <h1 className="cover-title"><span id="heroTitle" ref={title}>{`HEX + ${company}`}</span></h1>
      </div>
    </header>
  );
}

/* ================= NAV ================= */
export function useIdeasVisible() {
  const { state, staff } = useP();
  return staff || state.ideas.some(i => i.media.length);
}

function NavList({ current }: { current: string | null }) {
  const ideas = useIdeasVisible();
  return (
    <ol className="nav" data-nav="">
      {NAV.map(([id, label]) => (
        <li key={id} data-for={id} hidden={id === "ideas" && !ideas}>
          <a href={`#${id}`} aria-current={current === id ? "true" : "false"}>{label}</a>
        </li>
      ))}
    </ol>
  );
}

export function Frame({ children }: { children: React.ReactNode }) {
  const { state } = useP();
  const [current, setCurrent] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const progress = useRef<HTMLElement>(null);
  useEffect(() => {
    let queued = false;
    const spy = () => {
      const probe = innerHeight * 0.35;
      let cur: string | null = null;
      for (const [id] of NAV) { const s = document.getElementById(id); if (!s || s.hidden) continue; if (s.getBoundingClientRect().top <= probe) cur = id; }
      setCurrent(cur);
      const max = document.documentElement.scrollHeight - innerHeight;
      if (progress.current) progress.current.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
    };
    const on = () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; spy(); }); } };
    spy();
    addEventListener("scroll", on, { passive: true });
    addEventListener("resize", on);
    return () => { removeEventListener("scroll", on); removeEventListener("resize", on); };
  }, []);

  return (
    <div className="app">
      <aside className="sidebar" aria-label="Proposal">
        <a className="logo" href="#top" aria-label="HEX, back to top"><HexMark />HEX</a>
        <nav aria-label="Sections"><NavList current={current} /></nav>
        <div className="side-foot">
          <p className="side-meta">Prepared for <b data-bind="company">{state.client.company}</b><br /><span data-bind="date">{state.client.date}</span></p>
          <div className="progress" aria-hidden="true"><i id="progress" ref={progress} /></div>
          <a className="side-cta" href="#next-steps"><span>Get started</span><span className="arr" aria-hidden="true">→</span></a>
        </div>
      </aside>

      <header className="mobilebar">
        <a className="logo" href="#top" aria-label="HEX, back to top"><HexMark />HEX</a>
        <div className="right">
          <button className="btn btn-ghost" id="sheetBtn" aria-expanded={sheet} aria-controls="sheet" onClick={() => setSheet(s => !s)}>{sheet ? "Close" : "Sections"}</button>
          <a className="btn btn-primary" href="#next-steps">Get started</a>
        </div>
      </header>
      <div className={`sheet${sheet ? " on" : ""}`} id="sheet" onClick={e => { if ((e.target as HTMLElement).closest("a")) setSheet(false); }}>
        <nav aria-label="Sections"><NavList current={current} /></nav>
      </div>

      <main id="top">{children}</main>
    </div>
  );
}

/* ================= HERO ================= */
export function Hero() {
  const { state, model, lib } = useP();
  const lo = weeksOf(planPhases(PLANS[0], model), model), hi = weeksOf(model.ORDER, model);
  const rows: [string, string][] = [["Scope", "Brand, web and extended assets"], ["Timeline", `${lo} to ${hi} weeks`], ["Team", `${lib.team.length} core collaborators`], ["Date", state.client.date]];
  return (
    <section className="hero" aria-label="Introduction">
      <div className="hero-grid">
        <div className="hero-intro">
          <T k="hero:1" />
          <dl className="parties">
            <div><dt>Prepared by</dt><dd data-bind="preparedBy">{state.preparedBy}</dd></div>
            <div><dt>Prepared for</dt><dd data-bind="contact">{state.client.contact}</dd></div>
          </dl>
        </div>
        <dl className="glance num" id="glance">
          {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
        </dl>
      </div>
    </section>
  );
}

/* ================= APPROACH ================= */
export function Approach() {
  return (
    <section className="section" id="approach" aria-labelledby="h-approach">
      <div className="section-head"><T k="approach:1" as="h2" id="h-approach" /><T k="approach:2" as="span" className="meta" /></div>
      <div className="section-body">
        <T k="approach:3" className="lede" />
        <div className="approach-grid">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <article className="approach-item" key={i}><T k={`approach:${4 + i * 2}`} as="h3" /><T k={`approach:${5 + i * 2}`} /></article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================= WORK ================= */
export function Work() {
  const { state, lib } = useP();
  const bySlug = Object.fromEntries(lib.projects.map(p => [p.slug, p]));
  const cards = state.slots.map((slug, i) => {
    const p = bySlug[slug] || lib.projects[i];
    const own = state.media?.[p.slug];
    const list: Media[] = own && own.length ? own : lib.projectMedia[p.slug] || [];
    const url = p.url || `https://www.hex.inc/work/${p.slug}`;
    return (
      <article className="work-card" style={{ "--i": i } as CSSProperties} key={i}>
        <MediaBox className="work-media" list={list} fallback={<Poster p={p} />} mode={state.display[p.slug] || "rotate"} />
        <div className="work-foot">
          <h3><a href={url} target="_blank" rel="noopener">{p.title}<span className="open" aria-hidden="true">↗</span><span className="sr"> (opens case study in a new tab)</span></a></h3>
          <div className="tags">{p.tags.map(t => <span className="tag" key={t}>{t}</span>)}</div>
          <p>{p.lede}</p>
        </div>
      </article>
    );
  });
  return (
    <section className="section" id="work" aria-labelledby="h-work">
      <div className="section-head"><T k="work:1" as="h2" id="h-work" /><a className="btn-bar" href="https://www.hex.inc/work" target="_blank" rel="noopener"><span>More HEX work</span><span className="arr" aria-hidden="true">→</span></a></div>
      <div className="work-grid" id="workGrid">
        <div className="work-col">{cards.filter((_, i) => i % 2 === 0)}</div>
        <div className="work-col">{cards.filter((_, i) => i % 2 === 1)}</div>
      </div>
      <div className="work-strip">
        <T k="work:2" />
        <a className="btn-bar" href="https://www.hex.inc/figma-links" target="_blank" rel="noopener"><span>View all projects</span><span className="arr" aria-hidden="true">→</span></a>
      </div>
    </section>
  );
}

/* ================= NOTES ================= */
function CompanyMark({ c, focusable }: { c: Company; focusable: boolean }) {
  // Logos are tinted to --ink with a mask so they match both palettes; "keep original colours" opts out.
  const mark = c.logo
    ? c.logoKeepColors
      // eslint-disable-next-line @next/next/no-img-element
      ? <img className="note-logo-img" src={c.logo} alt={c.name} />
      : <span className="note-logo" role="img" aria-label={c.name} style={{ "--logo": `url("${c.logo}")` } as CSSProperties} />
    : c.name;
  return c.url ? <a href={c.url} target="_blank" rel="noopener" style={{ textDecoration: "none" }} tabIndex={focusable ? 0 : -1}>{mark}</a> : <>{mark}</>;
}

export function Notes() {
  const { lib } = useP();
  const co = Object.fromEntries(lib.companies.map(c => [c.id, c]));
  const notes = lib.testimonials.filter(t => co[t.companyId]);
  const N = notes.length;
  const [idx, setIdx] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const cur = useRef(0);

  /* Quote slides a few px in the direction you're going: out fast, in a beat later. Done on the DOM, like the reference, so the incoming note starts offset. */
  const show = (i: number, dir = Math.sign(i - cur.current) || 1) => {
    const next = ((i % N) + N) % N;
    cur.current = next;
    const st = stage.current!;
    st.style.setProperty("--dir", String(dir));
    st.querySelectorAll<HTMLElement>(".note").forEach((n, k) => {
      const on = k === next;
      if (on && !n.classList.contains("on")) {
        n.style.transition = "none"; n.style.transform = `translateX(${dir * 14}px)`; void n.offsetWidth;
        n.style.transition = ""; n.style.transform = "";
      }
      n.classList.toggle("on", on); n.setAttribute("aria-hidden", String(!on));
      n.querySelectorAll("a").forEach(a => { a.tabIndex = on ? 0 : -1; });
    });
    setIdx(next);
  };
  const swipe = useRef<number | null>(null);
  const clients = lib.companies.filter(c => c.showInClients).sort((a, b) => a.sort - b.sort);

  return (
    <section className="section" id="notes" aria-labelledby="h-notes">
      <div className="section-head"><T k="notes:1" as="h2" id="h-notes" /><span className="meta num" id="notesMeta">{N ? `${idx + 1} of ${N}` : ""}</span></div>
      <div className="notes" id="notes-root" tabIndex={-1} onKeyDown={e => {
        if (e.key === "ArrowLeft") { e.preventDefault(); show(cur.current - 1, -1); }
        if (e.key === "ArrowRight") { e.preventDefault(); show(cur.current + 1, 1); }
      }}>
        <div className="notes-stage" id="notesStage" aria-live="polite" ref={stage}
          onPointerDown={e => { swipe.current = e.clientX; }}
          onPointerUp={e => { if (swipe.current == null) return; const dx = e.clientX - swipe.current; swipe.current = null; if (Math.abs(dx) > 50) show(cur.current + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); }}>
          {notes.map((n, i) => {
            const c = co[n.companyId];
            return (
              <figure className={`note${i === 0 ? " on" : ""}`} id={`note-${i}`} aria-hidden={i !== 0} key={n.id}>
                <div className="note-co"><CompanyMark c={c} focusable={i === 0} /></div>
                <div className="note-kind">{n.kind}</div>
                <blockquote>{n.quote.map((p, k) => <p key={k}>{p}</p>)}</blockquote>
                <figcaption><span className="avatar" aria-hidden="true">{initials(n.name)}</span>
                  <span>
                    {n.nameUrl ? <a href={n.nameUrl} target="_blank" rel="noopener" tabIndex={i === 0 ? 0 : -1}>{n.name}</a> : n.name}<br />
                    {`${n.role}, `}{c.url ? <a href={c.url} target="_blank" rel="noopener" tabIndex={i === 0 ? 0 : -1}>{c.name}</a> : c.name}
                  </span>
                </figcaption>
              </figure>
            );
          })}
        </div>
        <div className="notes-nav">
          <button className="prev" type="button" id="notePrev" aria-label="Previous note" onClick={() => show(cur.current - 1, -1)}><span className="arr">←</span> Prev</button>
          <div className="notes-count" id="notesDots" role="group" aria-label="Choose a note">
            {notes.map((n, i) => <button type="button" key={n.id} aria-label={`Note ${i + 1}: ${co[n.companyId].name}`} aria-current={i === idx} onClick={() => show(i)} />)}
          </div>
          <button className="next" type="button" id="noteNext" aria-label="Next note" onClick={() => show(cur.current + 1, 1)}>Next <span className="arr">→</span></button>
        </div>
      </div>
      <div className="clients">
        <T k="notes:3" as="h3" />
        <ul className="client-list num" id="clientList">
          {clients.map(c => <li key={c.id}>{c.name}{c.figure ? <span>{c.figure}</span> : null}</li>)}
        </ul>
      </div>
    </section>
  );
}

/* ================= TEAM ================= */
export function Team() {
  const { state, lib } = useP();
  return (
    <section className="section" id="team" aria-labelledby="h-team">
      <div className="section-head"><T k="team:1" as="h2" id="h-team" /><T k="team:2" as="span" className="meta" /></div>
      <div className="section-body">
        <div className="team-intro"><T k="team:3" /><T k="team:4" /></div>
        <ul className="team-list" id="teamGrid">
          {lib.team.map(m => {
            const ph = state.photos?.[m.name] || m.photo;
            return (
              <li key={m.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <span className="who"><span className="pic" aria-hidden="true">{ph ? <img src={ph} alt="" /> : initials(m.name)}</span>{m.name}</span>
                <span className="role">{m.role}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ================= FAQ ================= */
export function Faq() {
  const { editing } = useP();
  const q = (k: string) => <span onClick={editing ? e => e.preventDefault() : undefined} style={{ display: "contents" }}><T k={k} as="span" className="q" /></span>;
  return (
    <section className="section" id="faq" aria-labelledby="h-faq">
      <div className="section-head"><T k="faq:1" as="h2" id="h-faq" /><T k="faq:2" as="span" className="meta" /></div>
      <div className="section-body">
        <div className="faq">
          {[[3, 4], [5, 6], [7, 8]].map(([a, b], i) => (
            <details open={i === 0 || undefined} key={a}>
              <summary>{q(`faq:${a}`)}<span className="pm" aria-hidden="true" /></summary>
              <div className="ans"><T k={`faq:${b}`} /></div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================= IDEAS ================= */
const PLACEHOLDER_IDEAS = [{ caption: "Direction A", media: [] }, { caption: "Direction B", media: [] }, { caption: "Direction C", media: [] }];
export function Ideas() {
  const { state, staff } = useP();
  const withMedia = state.ideas.filter(i => i.media.length);
  const list = staff ? (state.ideas.length ? state.ideas : PLACEHOLDER_IDEAS) : withMedia;
  return (
    <section className="section" id="ideas" aria-labelledby="h-ideas" hidden={!list.length}>
      <div className="section-head"><T k="ideas:1" as="h2" id="h-ideas" /><T k="ideas:2" as="span" className="meta" /></div>
      <div className="section-body"><div className="ideas" id="ideasGrid">
        {list.map((idea, i) => (
          <figure className="idea" style={{ margin: 0 }} key={i}>
            {idea.media.length
              ? <MediaBox className="work-media" list={idea.media} />
              : <div className="work-media"><div className="slot-empty">{`Add early ideas from Curate. This section stays hidden from ${state.client.company} until it has media.`}</div></div>}
            <p>{idea.caption}</p>
          </figure>
        ))}
      </div></div>
    </section>
  );
}

/* ================= FOOTER ================= */
export function Footer() {
  return (
    <footer className="foot">
      <T k="foot:1" as="span" />
      <nav aria-label="HEX elsewhere">
        <a href="mailto:hey@hex.inc">hey@hex.inc</a>
        <a href="https://twitter.com/ayushsoni_io" target="_blank" rel="noopener">Twitter</a>
        <a href="https://www.linkedin.com/in/ayushsoni-io/" target="_blank" rel="noopener">LinkedIn</a>
        <a href="https://www.instagram.com/_hex.inc/" target="_blank" rel="noopener">Instagram</a>
        <a href="https://www.hex.inc" target="_blank" rel="noopener">hex.inc</a>
      </nav>
      <a href="#top">Back to top ↑</a>
    </footer>
  );
}
