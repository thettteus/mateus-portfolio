'use client';
import { useEffect, useRef } from 'react';

const STEPS_TEXT = [
  { title: 'Messy ideas', say: 'AI makes options cheap. Ideas, drafts and prototypes everywhere.' },
  { title: 'Judgment', say: 'I clarify the problem and make the product calls.' },
  { title: 'Production', say: 'One path, built and shipped. I own it end to end.' },
  { title: 'Business outcomes', say: 'Done means a number moved.' },
];

// where each step lives on the scroll (0–1 through the pinned track)
const STEPS: [number, number][] = [[0, 0.2], [0.2, 0.46], [0.46, 0.7], [0.7, 1]];

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type RGB = [number, number, number];
type Part = { phi: number; d: number; sp: number; sp2: number; p1: number; p2: number; p3: number; p4: number; r: number; a: number };

// options: many small particles, each with a home in a fan behind the crystal
let seed = 5;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const PARTS: Part[] = Array.from({ length: 220 }, () => ({
  phi: (rnd() * 2 - 1) * 0.9,
  d: 0.32 + 0.68 * Math.sqrt(rnd()),
  sp: 0.6 + rnd() * 0.9,
  sp2: 0.7 + rnd() * 0.8,
  p1: rnd() * 6.28, p2: rnd() * 6.28, p3: rnd() * 6.28, p4: rnd(),
  r: 0.8 + rnd() * 1.5,
  a: 0.35 + rnd() * 0.6,
}));

// the crystal: an octahedron spinning on the line of travel
const V = (s: number) => [[-0.62 * s, 0, 0], [0.62 * s, 0, 0], [0, -s, 0], [0, s, 0], [0, 0, -s], [0, 0, s]];
const EDGES = [[0, 2], [0, 3], [0, 4], [0, 5], [1, 2], [1, 3], [1, 4], [1, 5], [2, 4], [4, 3], [3, 5], [5, 2]];

/**
 * Leverage — "choosing is the job": a pinned scene where scattered options
 * (particles) funnel into one point of judgment (a crystal), leave as a single
 * path to production, and land on an outcome (a target). Four captions follow
 * the scroll; the progress bars jump between them.
 */
export default function Leverage() {
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const capsRef = useRef<HTMLOListElement>(null);
  const progRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const cvs = canvasRef.current;
    const ctx = cvs?.getContext('2d');
    if (!track || !cvs || !ctx || !capsRef.current || !progRef.current) return;
    const caps = [...capsRef.current.querySelectorAll<HTMLElement>('.lev-cap')];
    const segs = [...progRef.current.querySelectorAll<HTMLElement>('li')];
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

    // colours come from the theme; any CSS colour is normalised through a canvas
    let C: { ink: RGB; dot: RGB; accent: RGB } = { ink: [0, 0, 0], dot: [0, 0, 0], accent: [0, 0, 0] };
    const probe = document.createElement('canvas').getContext('2d')!;
    const toRGB = (v: string): RGB => {
      probe.fillStyle = '#000';
      probe.fillStyle = v.trim() || '#000';
      const h = String(probe.fillStyle);
      if (h.startsWith('#')) { const n = parseInt(h.slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
      const m = h.match(/[\d.]+/g) ?? ['0', '0', '0'];
      return [+m[0], +m[1], +m[2]];
    };
    const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;
    const readColors = () => {
      const cs = getComputedStyle(track);
      C = { ink: toRGB(cs.getPropertyValue('--ink')), dot: toRGB(cs.getPropertyValue('--lev-dot')), accent: toRGB(cs.getPropertyValue('--accent')) };
    };

    // layout: horizontal on wide screens, vertical on tall ones
    let W = 1, H = 1, dpr = 1;
    let L = { wide: true, ax: [1, 0], pp: [0, 1], K: [0, 0], T: [0, 0], s: 1, a: 1, entry: [0, 0], exit: [0, 0], reach: 1, scale: 1 };
    const resize = () => {
      const r = cvs.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      cvs.width = Math.round(W * dpr); cvs.height = Math.round(H * dpr);
      const wide = W >= H * 0.95;
      const ax = wide ? [1, 0] : [0, 1], pp = wide ? [0, 1] : [1, 0];
      let K, T, s;
      if (wide) { s = Math.min(H * 0.12, W * 0.07); K = [W * 0.5, H * 0.36]; T = [W * 0.84, H * 0.36]; }
      else { s = Math.min(W * 0.15, H * 0.07); K = [W * 0.5, H * 0.37]; T = [W * 0.5, H * 0.6]; }
      const a = s * 0.62;
      const entry = [K[0] - ax[0] * a, K[1] - ax[1] * a];
      const exit = [K[0] + ax[0] * a, K[1] + ax[1] * a];
      const reach = wide ? entry[0] - W * 0.06 : entry[1] - H * 0.09;
      const perpMax = wide ? H * 0.27 : W * 0.44;
      L = { wide, ax, pp, K, T, s, a, entry, exit, reach, scale: Math.min(1, perpMax / (Math.sin(0.9) * reach)) };
    };
    const home = (q: Part) => {
      const along = q.d * Math.cos(q.phi) * L.reach;
      const side = q.d * Math.sin(q.phi) * L.reach * L.scale;
      return [L.entry[0] - L.ax[0] * along + L.pp[0] * side, L.entry[1] - L.ax[1] * along + L.pp[1] * side];
    };
    const particleAt = (q: Part, h: number[], t: number, wf: number) => {
      const amp = 10 + 10 * q.d;
      const dx = Math.sin(t * 0.00061 * q.sp + q.p1) * amp + Math.sin(t * 0.00023 + q.p3) * amp * 0.6;
      const dy = Math.cos(t * 0.00049 * q.sp + q.p2) * amp;
      const f = (t * 0.00021 * q.sp2 + q.p4) % 1;
      const e = f * f;
      const fx = lerp(h[0], L.entry[0], e), fy = lerp(h[1], L.entry[1], e);
      const fade = smooth(0, 0.08, f) * (1 - smooth(0.86, 1, f));
      return [lerp(h[0] + dx, fx, wf), lerp(h[1] + dy, fy, wf), lerp(1, fade, wf)];
    };
    const drawCrystal = (t: number, k: number) => {
      if (k <= 0) return;
      const s = L.s * (0.75 + 0.25 * easeOut(k));
      const th = t * 0.00035;
      const pts = V(s).map(([x, y, z]) => {
        const y2 = y * Math.cos(th) - z * Math.sin(th);
        const z2 = y * Math.sin(th) + z * Math.cos(th);
        return [L.K[0] + L.ax[0] * x + L.pp[0] * y2, L.K[1] + L.ax[1] * x + L.pp[1] * y2, z2 / s];
      });
      ctx.lineWidth = 1.4;
      EDGES.forEach(([i, j]) => {
        const depth = (pts[i][2] + pts[j][2]) / 2;
        ctx.strokeStyle = rgba(C.ink, k * (0.28 + 0.62 * (depth + 1) / 2));
        ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[j][0], pts[j][1]); ctx.stroke();
      });
    };

    let pT = 0, p = 0, last = 0, raf = 0, inView = false;

    const draw = (t: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const wf = smooth(0.16, 0.38, p); // options start flowing to one point
      const k = smooth(0.2, 0.42, p); // crystal forms
      const b = smooth(0.46, 0.68, p); // the one path draws out
      const o = smooth(0.68, 0.86, p); // the target opens

      // faint threads from every option to the point of choice
      if (wf > 0.01) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = rgba(C.dot, 0.075 * wf);
        ctx.beginPath();
        PARTS.forEach((q) => { const h = home(q); ctx.moveTo(h[0], h[1]); ctx.lineTo(L.entry[0], L.entry[1]); });
        ctx.stroke();
      }

      // particles, with a short streak in the direction they move
      ctx.lineCap = 'round';
      PARTS.forEach((q) => {
        const h = home(q);
        const [x, y, f] = particleAt(q, h, t, wf);
        const [px, py] = particleAt(q, h, t - 70, wf);
        const alpha = q.a * f;
        if (alpha < 0.02) return;
        ctx.strokeStyle = rgba(C.dot, alpha);
        ctx.lineWidth = q.r * 1.6;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x + 0.01, y); ctx.stroke();
      });

      drawCrystal(t, k);

      // one path, with work moving along it at a steady pace
      if (b > 0.001) {
        const hx = lerp(L.exit[0], L.T[0], b), hy = lerp(L.exit[1], L.T[1], b);
        ctx.save();
        ctx.shadowColor = rgba(C.accent, 0.7);
        ctx.shadowBlur = 12;
        ctx.strokeStyle = rgba(C.accent, 1);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(L.exit[0], L.exit[1]); ctx.lineTo(hx, hy); ctx.stroke();
        ctx.restore();
        ctx.fillStyle = rgba(C.accent, 1);
        ctx.beginPath(); ctx.arc(L.exit[0], L.exit[1], 3, 0, 6.2832); ctx.fill();
        const N = 14;
        for (let i = 0; i < N; i++) {
          const fr = (t * 0.00014 + i / N) % 1;
          if (fr > b) continue;
          const end = 1 - smooth(0.9, 1, fr) * o;
          ctx.fillStyle = rgba(C.accent, 0.9 * end);
          ctx.beginPath();
          ctx.arc(lerp(L.exit[0], L.T[0], fr), lerp(L.exit[1], L.T[1], fr), 2.4, 0, 6.2832);
          ctx.fill();
        }
        if (b < 1) {
          ctx.fillStyle = rgba(C.accent, 1);
          ctx.beginPath(); ctx.arc(hx, hy, 3.5, 0, 6.2832); ctx.fill();
        }
      }

      // the outcome: a target that opens, then keeps answering
      if (o > 0.001) {
        const R = [0.42, 0.8, 1.2].map((m) => m * L.s);
        const A = [0.9, 0.5, 0.25];
        ctx.lineWidth = 1.4;
        R.forEach((r, j) => {
          const tj = smooth(j * 0.18, 0.55 + j * 0.18, o);
          if (tj <= 0) return;
          ctx.strokeStyle = rgba(C.accent, A[j] * tj);
          ctx.beginPath(); ctx.arc(L.T[0], L.T[1], r * (0.6 + 0.4 * easeOut(tj)), 0, 6.2832); ctx.stroke();
        });
        ctx.fillStyle = rgba(C.accent, o);
        ctx.beginPath(); ctx.arc(L.T[0], L.T[1], L.s * 0.11 * (0.4 + 0.6 * o), 0, 6.2832); ctx.fill();
        if (o > 0.6) {
          const ph = (t % 2000) / 2000;
          ctx.strokeStyle = rgba(C.accent, 0.4 * (1 - ph) * smooth(0.6, 1, o));
          ctx.beginPath(); ctx.arc(L.T[0], L.T[1], L.s * (0.12 + 1.6 * easeOut(ph)), 0, 6.2832); ctx.stroke();
        }
      }
    };

    const syncUI = () => {
      let step = 0;
      STEPS.forEach(([a], i) => { if (p >= a - 0.0001) step = i; });
      caps.forEach((c, i) => {
        c.classList.toggle('is-on', i === step);
        c.classList.toggle('is-past', i < step);
      });
      segs.forEach((li, i) => {
        const [a, z] = STEPS[i];
        li.querySelector<HTMLElement>('.lev-bar')?.style.setProperty('--f', clamp01((p - a) / (z - a)).toFixed(3));
        li.querySelector('button')?.setAttribute('aria-current', i === step ? 'step' : 'false');
      });
    };

    const frame = (now: number) => {
      const dt = last ? Math.min(64, now - last) : 16;
      last = now;
      p += (pT - p) * (1 - Math.exp(-dt / 120));
      draw(now);
      syncUI();
      if (inView) raf = requestAnimationFrame(frame);
      else { raf = 0; last = 0; }
    };
    const wake = () => { if (!raf) raf = requestAnimationFrame(frame); };
    const fromScroll = () => {
      const r = track.getBoundingClientRect();
      const span = r.height - innerHeight;
      pT = span > 0 ? clamp01(-r.top / span) : 1;
    };

    readColors();
    resize();

    // the site's theme toggle flips data-theme on <html>
    const themeObs = new MutationObserver(() => { readColors(); if (calm) draw(0); });
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });

    const cleanups: (() => void)[] = [() => themeObs.disconnect()];
    if (calm) {
      track.classList.add('is-static');
      resize();
      p = pT = 1;
      draw(0);
      caps.forEach((c) => c.classList.add('is-on'));
      const onResize = () => { resize(); draw(0); };
      addEventListener('resize', onResize);
      cleanups.push(() => removeEventListener('resize', onResize));
    } else {
      const io = new IntersectionObserver((entries) => {
        inView = entries.some((e) => e.isIntersecting);
        if (inView) { fromScroll(); wake(); }
      });
      io.observe(track);
      const onResize = () => { resize(); fromScroll(); };
      addEventListener('scroll', fromScroll, { passive: true });
      addEventListener('resize', onResize);
      const jumps = segs.map((li, i) => {
        const btn = li.querySelector('button')!;
        const go = () => {
          const r = track.getBoundingClientRect();
          const span = r.height - innerHeight;
          const [a, z] = STEPS[i];
          scrollTo({ top: scrollY + r.top + span * (a + (z - a) * 0.6), behavior: 'smooth' });
        };
        btn.addEventListener('click', go);
        return () => btn.removeEventListener('click', go);
      });
      fromScroll();
      syncUI();
      cleanups.push(
        () => io.disconnect(),
        () => removeEventListener('scroll', fromScroll),
        () => removeEventListener('resize', onResize),
        () => cancelAnimationFrame(raf),
        ...jumps,
      );
    }
    return () => cleanups.forEach((f) => f());
  }, []);

  return (
    <section className="lev" id="leverage" aria-labelledby="lev-title">
      <div className="container">
        <div className="lev-head wk-grid">
          <h2 id="lev-title">Generating options is easy now. <b>Choosing is the job.</b></h2>
          <p className="lev-intro">AI creates countless possibilities. I bring the judgment to pick one, then own it all the way to production, so nothing gets lost in a hand-off.</p>
        </div>
      </div>

      <div className="lev-track" ref={trackRef}>
        <div className="lev-pin">
          <canvas ref={canvasRef} aria-hidden="true" />

          <ol className="lev-captions" ref={capsRef}>
            {STEPS_TEXT.map(({ title, say }, i) => (
              <li className="lev-cap" key={title}>
                <p className="lev-cap-n">{i + 1}/{STEPS_TEXT.length}</p>
                <h3>{title}</h3>
                <p className="lev-say">{say}</p>
              </li>
            ))}
          </ol>

          <ol className="lev-progress" ref={progRef} aria-label="Steps">
            {STEPS_TEXT.map(({ title }) => (
              <li key={title}><button type="button" aria-label={title}><span className="lev-bar" /></button></li>
            ))}
          </ol>
        </div>
      </div>
      <div className="lev-after" />
    </section>
  );
}
