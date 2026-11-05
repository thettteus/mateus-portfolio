'use client';
import { useEffect, useRef } from 'react';
import { bindPinnedSteps } from '@/components/ui/pinnedSteps';

const STEPS_TEXT = [
  { title: 'Messy ideas', say: 'AI makes options cheap. Ideas, drafts and prototypes everywhere.' },
  { title: 'Judgment', say: 'I clarify the problem and make the product calls.' },
  { title: 'Execution', say: 'One path, built and shipped. I own it end to end.' },
  { title: 'Business outcomes', say: 'Done means a number moved.' },
];

// where the scene rests on each step (0–1 through the animation)
const LAND = [0, 0.44, 0.68, 1];

const STEP_MS = 520; // how long the scene takes to travel to the next step
const REVEAL_S = 1.1; // how long the target takes to open, and the line to reach into it
const SPIN_MS = 420; // how long the first letter's reel rolls
const SPIN_STAGGER_MS = 24; // each later letter rolls a little longer, so they stop left to right
const REEL = 9; // letters on each reel, the last one being the real letter

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeOutQuart = (t: number) => 1 - (1 - t) ** 4;
const easeInOut = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t); // gentle at both ends, but moves at once
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = LOWER.toUpperCase();
const spinChar = (c: string) => {
  const set = c === c.toLowerCase() ? (c === c.toUpperCase() ? '' : LOWER) : UPPER;
  return set ? set[Math.floor(Math.random() * set.length)] : c;
};

type RGB = [number, number, number];
type Part = { phi: number; d: number; sp: number; sp2: number; p1: number; p2: number; p3: number; p4: number; r: number; a: number };

// options: many small ideas, each with a home in a fan behind the point of judgment
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

// judgment: a crystal (an octahedron) spinning on the line of travel
const V = (s: number) => [[-0.62 * s, 0, 0], [0.62 * s, 0, 0], [0, -s, 0], [0, s, 0], [0, 0, -s], [0, 0, s]];
const EDGES = [[0, 2], [0, 3], [0, 4], [0, 5], [1, 2], [1, 3], [1, 4], [1, 5], [2, 4], [4, 3], [3, 5], [5, 2]];

/**
 * Leverage — "choosing is the job": a pinned scene where scattered ideas
 * funnel into one point of judgment (a spinning crystal), leave as a single
 * line of execution, and hit an outcome (a target, dead centre). Drawn in the
 * same line-art as Depth: thin strokes, grey for what comes in and green from
 * the moment my judgment takes over. While it's pinned,
 * each scroll gesture (wheel, swipe or key) moves exactly one step (see
 * pinnedSteps); the scene travels on its own clock and the new title spins its
 * letters into place. The progress bars jump between steps.
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
    let C: { ink: RGB; dot: RGB; accent: RGB; focus: RGB; bg: RGB } = { ink: [0, 0, 0], dot: [0, 0, 0], accent: [0, 0, 0], focus: [0, 0, 0], bg: [255, 255, 255] };
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
      C = { ink: toRGB(cs.getPropertyValue('--ink')), dot: toRGB(cs.getPropertyValue('--lev-dot')), accent: toRGB(cs.getPropertyValue('--accent')), focus: toRGB(cs.getPropertyValue('--focus')), bg: toRGB(cs.getPropertyValue('--bg')) };
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
    // judgment: the crystal turns on the line of travel — many ideas in at
    // one point, one way out at the other. Edges further back are fainter
    const drawJudgment = (t: number, k: number) => {
      if (k <= 0) return;
      const s = L.s * (0.75 + 0.25 * easeOut(k));
      const th = t * 0.00035;
      const pts = V(s).map(([x, y, z]) => {
        const y2 = y * Math.cos(th) - z * Math.sin(th);
        const z2 = y * Math.sin(th) + z * Math.cos(th);
        return [L.K[0] + L.ax[0] * x + L.pp[0] * y2, L.K[1] + L.ax[1] * x + L.pp[1] * y2, z2 / s];
      });
      ctx.lineWidth = 1.2;
      EDGES.forEach(([i, j]) => {
        const depth = (pts[i][2] + pts[j][2]) / 2;
        ctx.strokeStyle = rgba(C.accent, k * (0.25 + 0.75 * (depth + 1) / 2));
        ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[j][0], pts[j][1]); ctx.stroke();
      });
    };

    const N = STEPS_TEXT.length;
    // the step controller says where the scene is (0…N-1) and which way it's
    // moving; p is where that puts the animation
    let p = 0;
    // reveal: the target opening and the line reaching into it run on their
    // own, slower clock, from the moment the last step is chosen
    let reveal = 0, lastNow = 0;
    const pAt = (pos: number, travel: number) => {
      const lo = Math.floor(pos), hi = Math.min(N - 1, lo + 1);
      // answers the gesture at once and lands softly, whichever way it runs
      const t = pos - lo;
      return lerp(LAND[lo], LAND[hi], travel > 0 ? easeOutQuart(t) : 1 - easeOutQuart(1 - t));
    };

    const draw = (t: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const wf = smooth(0.16, 0.38, p); // options start flowing to one point
      const k = smooth(0.2, 0.42, p); // the point of judgment forms
      const b = smooth(0.46, 0.68, p); // the one path draws out
      const o = easeInOut(reveal); // the target opens

      // faint threads from every option to the point of choice
      if (wf > 0.01) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = rgba(C.dot, 0.075 * wf);
        ctx.beginPath();
        PARTS.forEach((q) => { const h = home(q); ctx.moveTo(h[0], h[1]); ctx.lineTo(L.entry[0], L.entry[1]); });
        ctx.stroke();
      }

      // ideas: small round dots, as in Depth
      PARTS.forEach((q) => {
        const h = home(q);
        const [x, y, f] = particleAt(q, h, t, wf);
        const alpha = q.a * f;
        if (alpha < 0.02) return;
        ctx.fillStyle = rgba(C.dot, alpha);
        ctx.beginPath(); ctx.arc(x, y, 0.9 + (q.r - 0.8) * 0.6, 0, 6.2832); ctx.fill();
      });

      drawJudgment(t, k);

      // results: a target that opens ring by ring — thin rings, the bands
      // between them alternating a faint green and nothing, a small solid
      // bullseye — then keeps answering. Drawn before the line, so execution
      // lands on top of it, dead centre
      if (o > 0.001) {
        const tint = (f: number, a: number) => rgba([0, 1, 2].map((c) => Math.round(lerp(C.bg[c], C.focus[c], f))) as RGB, a);
        const rings = [
          { r: 0.9, f: 0.1 },
          { r: 0.64, f: 0 },
          { r: 0.38, f: 0.16 },
        ];
        if (o > 0.6) {
          const ph = (t % 2000) / 2000;
          ctx.lineWidth = 1;
          ctx.strokeStyle = rgba(C.focus, 0.3 * (1 - ph) * smooth(0.6, 1, o));
          ctx.beginPath(); ctx.arc(L.T[0], L.T[1], L.s * (0.9 + 0.5 * easeOut(ph)), 0, 6.2832); ctx.stroke();
        }
        ctx.lineWidth = 1;
        rings.forEach(({ r, f }, j) => {
          // outer rings first, each opening a beat after the one around it
          const tj = smooth(j * 0.15, 0.5 + j * 0.15, o);
          if (tj <= 0) return;
          const rr = r * L.s * (0.6 + 0.4 * easeOut(tj));
          ctx.fillStyle = tint(f, tj);
          ctx.strokeStyle = rgba(C.focus, 0.5 * tj);
          ctx.beginPath(); ctx.arc(L.T[0], L.T[1], rr, 0, 6.2832); ctx.fill(); ctx.stroke();
        });
        const tc = smooth(0.45, 1, o);
        ctx.fillStyle = rgba(C.focus, tc);
        ctx.beginPath(); ctx.arc(L.T[0], L.T[1], L.s * 0.11 * (0.4 + 0.6 * tc), 0, 6.2832); ctx.fill();
      }

      // execution: one thin line drawn out from the crystal. It holds back short
      // of where the target will be, then, as the target opens, reaches on into
      // it and connects, dead centre
      if (b > 0.001) {
        const span = Math.hypot(L.T[0] - L.exit[0], L.T[1] - L.exit[1]);
        const held = Math.max(0, (span - L.s * 1.25) / span);
        const f = held * b + (1 - held) * o;
        const hx = lerp(L.exit[0], L.T[0], f), hy = lerp(L.exit[1], L.T[1], f);
        ctx.strokeStyle = rgba(C.accent, 1);
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(L.exit[0], L.exit[1]); ctx.lineTo(hx, hy); ctx.stroke();
      }

      // the drawing fades out toward both screen edges, as in Depth
      const mask = ctx.createLinearGradient(0, 0, W, 0);
      mask.addColorStop(0, 'rgba(0,0,0,0)');
      mask.addColorStop(0.08, 'rgba(0,0,0,1)');
      mask.addColorStop(0.92, 'rgba(0,0,0,1)');
      mask.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = mask;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
    };

    // the title of the step coming in rolls like a slot machine: every letter
    // is a reel of random letters that stops on the real one, left to right
    const spins = new Map<HTMLElement, number>();
    const spin = (el: HTMLElement) => {
      const text = el.dataset.text ?? '';
      clearTimeout(spins.get(el));
      el.textContent = '';
      let i = 0, longest = 0;
      text.split(' ').forEach((word, w) => {
        if (w) el.append(' ');
        const part = document.createElement('span');
        part.className = 'lev-wordpart';
        [...word].forEach((c) => {
          const reel = document.createElement('span');
          const strip = document.createElement('span');
          reel.className = 'lev-reel';
          strip.className = 'lev-strip';
          for (let k = 0; k < REEL; k++) {
            const it = document.createElement('span');
            it.textContent = k === REEL - 1 ? c : spinChar(c);
            strip.append(it);
          }
          // the real letter, unseen, sets the reel's width
          const sizer = document.createElement('span');
          sizer.className = 'lev-sizer';
          sizer.textContent = c;
          reel.append(sizer, strip);
          part.append(reel);
          const duration = SPIN_MS + i++ * SPIN_STAGGER_MS;
          strip.animate(
            [{ transform: 'translateY(0)' }, { transform: `translateY(${(-(REEL - 1) / REEL) * 100}%)` }],
            { duration, easing: 'cubic-bezier(0.2, 0.6, 0.15, 1)', fill: 'both' },
          );
          longest = Math.max(longest, duration);
        });
        el.append(part);
      });
      // once every reel has stopped, the plain word goes back
      spins.set(el, window.setTimeout(() => { el.textContent = text; spins.delete(el); }, longest + 60));
    };
    let shown = -1;
    const showCaption = (step: number, animate: boolean) => {
      if (step === shown) return;
      shown = step;
      caps.forEach((c, i) => {
        c.classList.toggle('is-on', i === step);
        c.classList.toggle('is-past', i < step);
      });
      const title = caps[step]?.querySelector<HTMLElement>('.lev-word');
      if (title && animate) spin(title);
    };

    const syncUI = (target: number) => {
      segs.forEach((li, i) => {
        // the first bar is full on arrival; each later one fills on the way in
        const f = i === 0 ? 1 : clamp01((p - LAND[i - 1]) / (LAND[i] - LAND[i - 1]));
        li.querySelector<HTMLElement>('.lev-bar')?.style.setProperty('--f', f.toFixed(3));
        li.querySelector('button')?.setAttribute('aria-current', i === target ? 'step' : 'false');
      });
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
      p = 1;
      reveal = 1;
      draw(0);
      caps.forEach((c) => c.classList.add('is-on'));
      const onResize = () => { resize(); draw(0); };
      addEventListener('resize', onResize);
      cleanups.push(() => removeEventListener('resize', onResize));
    } else {
      addEventListener('resize', resize);
      const steps = bindPinnedSteps({
        track,
        count: N,
        stepMs: STEP_MS,
        onStep: showCaption,
        onFrame: (now, s) => {
          const dt = lastNow ? Math.min(0.064, (now - lastNow) / 1000) : 0.016;
          lastNow = now;
          p = pAt(s.cur, s.travel);
          const goal = s.target >= N - 1 ? 1 : 0;
          reveal = goal > reveal ? Math.min(1, reveal + dt / REVEAL_S) : Math.max(0, reveal - dt / REVEAL_S);
          draw(now);
          syncUI(s.target);
        },
      });
      // picking a step walks the scene there, one step after another
      const jumps = segs.map((li, i) => {
        const btn = li.querySelector('button')!;
        const pick = () => steps.go(i);
        btn.addEventListener('click', pick);
        return () => btn.removeEventListener('click', pick);
      });
      cleanups.push(
        () => removeEventListener('resize', resize),
        steps.destroy,
        () => spins.forEach((id) => clearTimeout(id)),
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
                <h3 aria-label={title}><span className="lev-word" data-text={title} aria-hidden="true">{title}</span></h3>
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
    </section>
  );
}
