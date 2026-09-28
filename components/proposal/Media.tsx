"use client";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { Media, Project } from "@/lib/types";
import { useP } from "./context";

export function MediaNode({ m, className, autoPlay = true }: { m: Media; className?: string; autoPlay?: boolean }) {
  const { reduced } = useP();
  if (m.kind === "video") {
    return (
      <video
        ref={v => { if (v) { v.muted = true; v.defaultMuted = true; } }}
        src={m.url} className={className} muted loop playsInline autoPlay={autoPlay && !reduced} preload="metadata"
      />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={m.url} alt={m.alt || ""} decoding="async" loading="lazy" className={className} />;
}

export function Poster({ p }: { p: Project }) {
  return (
    <div className="poster" style={{ "--pbg": p.palette[0], "--pfg": p.palette[1] } as CSSProperties}>
      <div className="poster-top"><span>{p.services}</span><span className="num">{p.year}</span></div>
      <div className="poster-name">{p.title}</div>
    </div>
  );
}

const DUR = 4200;

/**
 * The reference's fillMedia + watchMedia.
 * single: first item only. rotate: every item, either clicked through (← n/N →, halves, swipe) or, with `auto`, crossfaded on a timer.
 * Videos only play while at least a quarter of the box is on screen.
 */
export function MediaBox(props: {
  as?: "div"; className: string; list?: Media[]; fallback?: ReactNode; mode?: "rotate" | "single"; auto?: boolean;
  children?: ReactNode; "aria-hidden"?: boolean; id?: string;
}) {
  const { list = [], fallback = null, mode = "rotate", auto = false } = props;
  const { reduced } = useP();
  const box = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const [visible, setVisible] = useState(false);
  const [hover, setHover] = useState(false);
  const [cycle, setCycle] = useState(0); // restarts the dot fill animation
  const n = list.length;
  const multi = n > 1 && mode !== "single";
  const key = list.map(m => m.url).join("|");
  useEffect(() => setI(0), [key, mode]);

  // Play/pause videos with visibility; only the showing one in a stack.
  useEffect(() => {
    const el = box.current; if (!el) return;
    const io = new IntersectionObserver(entries => entries.forEach(e => setVisible(e.isIntersecting)), { threshold: .25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    box.current?.querySelectorAll("video").forEach(v => {
      const idle = v.closest(".media-stack") && !v.classList.contains("on");
      if (visible && !idle && !reduced) v.play().catch(() => {}); else v.pause();
    });
  }, [visible, i, reduced, key]);

  // Auto carousel (cover only).
  useEffect(() => {
    if (!multi || !auto || !visible || hover || reduced) return;
    const t = setInterval(() => { setI(k => (k + 1) % n); setCycle(c => c + 1); }, DUR);
    return () => clearInterval(t);
  }, [multi, auto, visible, hover, reduced, n]);

  const goTo = (k: number) => {
    const next = (k + n) % n;
    const v = box.current?.querySelectorAll(".media-stack > *")[next];
    if (v instanceof HTMLVideoElement && !reduced) { v.currentTime = 0; }
    setI(next);
  };
  const sx = useRef<number | null>(null);

  let media: ReactNode = fallback;
  if (n && !multi) media = <MediaNode m={list[0]} className="media-fill" />;
  if (multi) {
    media = (
      <div className="media-stack">
        {list.map((m, k) => <MediaNode key={m.url + k} m={m} autoPlay={k === 0} className={k === i ? "on" : undefined} />)}
      </div>
    );
  }

  return (
    <div
      ref={box} id={props.id} className={props.className} aria-hidden={props["aria-hidden"]}
      onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}
      onPointerDown={multi && !auto ? e => { if (e.pointerType !== "mouse") sx.current = e.clientX; } : undefined}
      onPointerUp={multi && !auto ? e => { if (sx.current == null) return; const dx = e.clientX - sx.current; sx.current = null; if (Math.abs(dx) > 40) goTo(i + (dx < 0 ? 1 : -1)); } : undefined}
    >
      {media}
      {props.children}
      {multi && auto && (
        <div className="dots" aria-hidden="true">
          {list.map((_, k) => <i key={k === i ? `on-${cycle}` : k} className={k === i && visible && !hover ? "on" : undefined} />)}
        </div>
      )}
      {multi && !auto && (
        <>
          <button type="button" className="zone prev" tabIndex={-1} aria-hidden="true" onClick={() => goTo(i - 1)} />
          <button type="button" className="zone next" tabIndex={-1} aria-hidden="true" onClick={() => goTo(i + 1)} />
          <div className="stepper">
            <button type="button" aria-label="Previous image" onClick={() => goTo(i - 1)}>←</button>
            <span className="st-count num" aria-live="polite">{`${i + 1} / ${n}`}</span>
            <button type="button" aria-label="Next image" onClick={() => goTo(i + 1)}>→</button>
          </div>
        </>
      )}
    </div>
  );
}
