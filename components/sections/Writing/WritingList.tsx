'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

export type Essay = {
  slug: string;
  kind: string;
  year: string;
  title: string;
  dek: string;
  mark: 'models' | 'field';
};

const W = 300, H = 375;

/* Abundance: a field of small dots around the one that matters (seeded, so
   server and client agree) */
function fieldDots() {
  let seed = 9;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const dots: { x: string; y: string; r: string; o: string }[] = [];
  for (let i = 0; i < 120; i++) {
    const x = 6 + rnd() * 244, y = 6 + rnd() * 100;
    if (Math.hypot(x - 186, y - 54) < 18) continue;
    dots.push({ x: x.toFixed(1), y: y.toFixed(1), r: (0.8 + rnd() * 1.2).toFixed(2), o: (0.25 + rnd() * 0.5).toFixed(2) });
  }
  return dots;
}

function Mark({ kind }: { kind: Essay['mark'] }) {
  const dots = useMemo(() => (kind === 'field' ? fieldDots() : []), [kind]);
  if (kind === 'models') {
    return (
      <svg className="wr-mark" viewBox="0 0 256 112">
        {/* One task, three model sizes; the right size is chosen */}
        <circle className="m-dot" cx="16" cy="56" r="3.5" />
        <path className="m-line" d="M16 56 C 70 56, 90 22, 136 22 M16 56 H 136 M16 56 C 70 56, 90 90, 136 90" />
        <circle className="m-pick-ring" cx="150" cy="22" r="10" />
        <circle className="m-pick" cx="150" cy="22" r="4" />
        <circle className="m-ring" cx="158" cy="56" r="18" />
        <circle className="m-ring" cx="172" cy="90" r="28" strokeDasharray="2 3" />
        <text className="m-lbl" x="170" y="25">small</text>
        <text className="m-lbl" x="184" y="59">mid</text>
        <text className="m-lbl" x="208" y="93">frontier</text>
      </svg>
    );
  }
  return (
    <svg className="wr-mark" viewBox="0 0 256 112">
      {/* Many answers, one that means something */}
      {dots.map((d, i) => <circle key={i} className="m-dot" cx={d.x} cy={d.y} r={d.r} opacity={d.o} />)}
      <circle className="m-pick-ring" cx="186" cy="54" r="11" />
      <circle className="m-pick" cx="186" cy="54" r="4" />
    </svg>
  );
}

/**
 * WritingList — the essays as an index. On hover a page set for each essay
 * follows the pointer, sitting just past the end of the title.
 */
export default function WritingList({ essays }: { essays: Essay[] }) {
  const list = useRef<HTMLOListElement>(null);
  const preview = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState<number | null>(null);
  const live = useRef({ x: 0, y: 0, tx: 0, ty: 0, tilt: 0, raf: 0, on: false, calm: false, anchor: null as Element | null });


  useEffect(() => {
    const L = live.current;
    L.calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hide = () => { L.on = false; setShown(null); };
    addEventListener('scroll', hide, { passive: true });
    return () => { removeEventListener('scroll', hide); cancelAnimationFrame(L.raf); };
  }, []);

  const place = (px: number, py: number) => {
    const L = live.current;
    const tr = L.anchor ? L.anchor.getBoundingClientRect() : { left: 0, right: px };
    const drift = (px - (tr.left + tr.right) / 2) * 0.05;
    L.tx = Math.min(innerWidth - W - 16, Math.max(16, tr.right + 28 + drift));
    L.ty = Math.min(innerHeight - H - 16, Math.max(16, py - H * 0.5));
  };

  // the page follows the pointer with a little lag and leans into the motion
  const loop = () => {
    const L = live.current, el = preview.current;
    if (!el) return;
    const k = L.calm ? 1 : 0.14;
    const vx = (L.tx - L.x) * k;
    L.x += vx;
    L.y += (L.ty - L.y) * k;
    L.tilt += ((L.calm ? 0 : Math.max(-7, Math.min(7, vx * 0.35))) - L.tilt) * 0.12;
    el.style.transform = `translate3d(${L.x.toFixed(1)}px, ${L.y.toFixed(1)}px, 0) rotate(${L.tilt.toFixed(2)}deg)`;
    L.raf = L.on || Math.abs(L.tx - L.x) + Math.abs(L.ty - L.y) + Math.abs(L.tilt) > 0.2 ? requestAnimationFrame(loop) : 0;
  };

  const show = (i: number) => {
    const L = live.current;
    L.on = true;
    setShown(i);
    if (!L.raf) L.raf = requestAnimationFrame(loop);
  };
  const hide = () => { live.current.on = false; setShown(null); };
  const hovers = () => matchMedia('(hover: hover)').matches;

  return (
    <>
      <ol className="wr-list" ref={list}>
        {essays.map((e, i) => (
          <li className="wr-row" key={e.slug} style={{ '--r': i } as CSSProperties}>
            <Link
              className="wk-grid"
              href={`/writing/${e.slug}`}
              onPointerEnter={(ev) => {
                if (!hovers()) return;
                const L = live.current;
                L.anchor = ev.currentTarget.querySelector('.wr-title');
                if (!L.on) { place(ev.clientX, ev.clientY); L.x = L.tx; L.y = L.ty; }
                show(i);
              }}
              onPointerMove={(ev) => { if (hovers()) place(ev.clientX, ev.clientY); }}
              onPointerLeave={hide}
              onFocus={(ev) => {
                const a = ev.currentTarget;
                if (!hovers() || !a.matches(':focus-visible')) return;
                const L = live.current;
                L.anchor = a.querySelector('.wr-title');
                const r = a.getBoundingClientRect();
                place(r.left, r.top + r.height / 2);
                L.x = L.tx; L.y = L.ty;
                show(i);
              }}
              onBlur={hide}
            >
              <h3 className="wr-title">{e.title}</h3>
              <span className="wr-kind">{e.kind}</span>
              <span className="wr-year">{e.year}</span>
              <p className="wr-dek">{e.dek}</p>
            </Link>
          </li>
        ))}
      </ol>

      {/* one page per essay; each mark draws the essay’s idea */}
      <div className={`wr-preview${shown !== null ? ' is-on' : ''}`} ref={preview} aria-hidden="true">
        <div className="wr-sheet">
          {essays.map((e, i) => (
            <article className={`wr-page${shown === i ? ' is-on' : ''}`} key={e.slug}>
              <Mark kind={e.mark} />
              <blockquote>“{e.dek}”</blockquote>
              <footer><span>{e.kind}, {e.year}</span><b>Read</b></footer>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}
