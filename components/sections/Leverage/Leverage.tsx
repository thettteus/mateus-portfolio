'use client';
import { useEffect, useRef } from 'react';

const STEPS_TEXT = [
  { title: 'Messy ideas', say: 'AI makes options cheap. Ideas, drafts and prototypes everywhere.' },
  { title: 'Judgment', say: 'I clarify the problem and make the product calls.' },
  { title: 'Production', say: 'One path, built and shipped. I own it end to end.' },
  { title: 'Business outcomes', say: 'Done means a number moved.' },
];

// where the scene rests on each step (0–1 through the animation)
const LAND = [0, 0.44, 0.68, 1];

const STEP_MS = 850; // how long the scene takes to travel to the next step
const GESTURE_GAP_MS = 180; // a pause this long between wheel events starts a new gesture
const SUSTAIN_MS = 300; // a wheel still spinning this long after a landing moves on again
const SWIPE_PX = 40; // touch travel that counts as a swipe
const BYPASS_MS = 2000; // in-page link scrolls pass straight through for this long
const SPIN_MS = 420; // how long the first letter's reel rolls
const SPIN_STAGGER_MS = 24; // each later letter rolls a little longer, so they stop left to right
const REEL = 9; // letters on each reel, the last one being the real letter

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = LOWER.toUpperCase();
const spinChar = (c: string) => {
  const set = c === c.toLowerCase() ? (c === c.toUpperCase() ? '' : LOWER) : UPPER;
  return set ? set[Math.floor(Math.random() * set.length)] : c;
};

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
 * path to production, and land on an outcome (a target). While it's pinned,
 * each scroll gesture (wheel, swipe or key) moves exactly one step, like the
 * range stack; the scene travels on its own clock and the new title spins its
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

    const N = STEPS_TEXT.length;
    // cur walks toward target (both step positions 0…N-1); p is where that
    // puts the animation
    let cur = 0, target = 0, p = 0, last = 0, raf = 0, inView = false;
    let readyAt = 0, bypass = 0, programmatic = false;
    let lastRaw = -1, swipedAt = 0; // where the last scroll left the page; when a wheel/swipe last moved
    const pAt = (pos: number) => {
      const lo = Math.floor(pos), hi = Math.min(N - 1, lo + 1);
      return lerp(LAND[lo], LAND[hi], easeInOut(pos - lo));
    };

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

    const syncUI = () => {
      segs.forEach((li, i) => {
        // the first bar is full on arrival; each later one fills on the way in
        const f = i === 0 ? 1 : clamp01((p - LAND[i - 1]) / (LAND[i] - LAND[i - 1]));
        li.querySelector<HTMLElement>('.lev-bar')?.style.setProperty('--f', f.toFixed(3));
        li.querySelector('button')?.setAttribute('aria-current', i === target ? 'step' : 'false');
      });
    };

    // walk the scene toward the target at one step per STEP_MS
    const frame = (now: number) => {
      const dt = last ? Math.min(64, now - last) : 16;
      last = now;
      const d = target - cur, by = dt / STEP_MS;
      if (d) {
        cur = Math.abs(d) <= by ? target : cur + Math.sign(d) * by;
        if (cur === target) readyAt = now;
      }
      p = pAt(cur);
      draw(now);
      syncUI();
      if (inView) raf = requestAnimationFrame(frame);
      else { raf = 0; last = 0; }
    };
    const wake = () => { if (!raf) raf = requestAnimationFrame(frame); };

    // page scroll ↔ step: each step has its own scroll offset inside the track
    const geo = () => {
      const r = track.getBoundingClientRect();
      const span = r.height - innerHeight;
      return { top: scrollY + r.top, span, raw: span > 0 ? (-r.top / span) * (N - 1) : -1 };
    };
    const go = (to: number) => {
      const g = geo();
      target = to;
      showCaption(to, true);
      const top = g.top + (g.span * to) / (N - 1);
      // a no-op scrollTo fires no scroll event, so only flag a real move
      if (Math.abs(scrollY - top) > 0.5) {
        programmatic = true;
        scrollTo({ top, behavior: 'instant' });
      }
      lastRaw = to;
      wake();
    };
    const inside = (raw: number) => raw > -0.01 && raw < N - 1 + 0.01;
    const ready = () => cur === target;
    // one step in `dir`; false when that would leave the scene (let the page go)
    const step = (dir: number) => {
      const to = target + dir;
      if (to < 0 || to > N - 1) return false;
      go(to);
      return true;
    };
    // at either end, scrolling outward hands control back to the page
    const leaving = (dir: number) => ready() && ((target <= 0 && dir < 0) || (target >= N - 1 && dir > 0));

    const fromScroll = () => {
      const g = geo();
      if (programmatic) { programmatic = false; return; }
      const prev = lastRaw;
      lastRaw = g.raw;
      // Chrome only lets the first wheel event of a scroll be cancelled, so a
      // flick that began outside keeps its momentum and can carry the page
      // clean through the track in one go. Hold it on the step it's on.
      const now = performance.now();
      const through = now >= bypass && now - swipedAt < 600 &&
        ((g.raw > N - 1 && prev < N - 1 && target < N - 1) || (g.raw < 0 && prev > 0 && target > 0));
      if (through) { go(target); return; }
      // outside the track the scene rests at its nearest end: jump, no travel
      if (g.raw < 0 || g.raw > N - 1) {
        const end = g.raw < 0 ? 0 : N - 1;
        if (target !== end || cur !== end) { target = cur = end; p = pAt(end); showCaption(end, false); syncUI(); }
        return;
      }
      // in-page links scroll straight through; the scene just follows
      if (performance.now() < bypass) {
        const to = Math.max(0, Math.min(N - 1, Math.round(g.raw)));
        if (to !== target) { target = to; showCaption(to, true); wake(); }
        return;
      }
      // momentum, scrollbar or keys landing mid-track: hold the page where
      // the scene is — only gestures move it on
      go(target);
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
      draw(0);
      caps.forEach((c) => c.classList.add('is-on'));
      const onResize = () => { resize(); draw(0); };
      addEventListener('resize', onResize);
      cleanups.push(() => removeEventListener('resize', onResize));
    } else {
      let lastWheel = 0;
      let lastDelta = 0;
      let peak = 0; // strongest wheel event of the current gesture
      let outside = true;
      let entering = false; // still in the gesture that carried the page in
      const onWheel = (e: WheelEvent) => {
        const now = performance.now();
        const mag = Math.abs(e.deltaY);
        swipedAt = now;
        // the scroll that carried the page in is not a gesture of its own:
        // keep timing it outside, and count arriving as a landing
        if (!inside(geo().raw) || now < bypass) {
          outside = true;
          lastWheel = now;
          lastDelta = mag;
          return;
        }
        if (outside) { outside = false; entering = true; readyAt = now; }
        // momentum that can no longer be cancelled is still the scroll that
        // carried the page in: the hold in fromScroll keeps the page, it never steps
        if (!e.cancelable) { lastWheel = now; lastDelta = mag; return; }
        const dir = Math.sign(e.deltaY);
        if (!dir || leaving(dir)) return;
        e.preventDefault();
        // a new gesture: a pause after the last one, or a fresh flick rising out
        // of a decaying inertia tail
        const fresh = now - lastWheel > GESTURE_GAP_MS || (mag > 20 && mag > lastDelta * 1.6);
        peak = fresh ? mag : Math.max(peak, mag);
        if (fresh) entering = false;
        // a wheel kept spinning at strength moves on, one landing at a time;
        // a trackpad's fading inertia tail never counts
        // the spin that carried the page in only lands; it never moves on
        const sustained = !entering && now - readyAt > SUSTAIN_MS && mag >= peak * 0.6 && mag >= lastDelta;
        lastWheel = now;
        lastDelta = mag;
        if ((fresh || sustained) && ready()) step(dir);
      };
      let touchY = 0;
      let touchDir = 0;
      const onTouchStart = (e: TouchEvent) => { touchY = e.touches[0].clientY; touchDir = 0; };
      const onTouchMove = (e: TouchEvent) => {
        swipedAt = performance.now();
        // a swipe that carried the page in only lands; the next one moves on
        if (!inside(geo().raw) || performance.now() < bypass) { touchDir = 1; return; }
        const dy = touchY - e.touches[0].clientY;
        const dir = Math.sign(dy);
        if (!dir || leaving(dir)) return;
        e.preventDefault();
        if (!touchDir && Math.abs(dy) > SWIPE_PX && ready()) { touchDir = dir; step(dir); }
      };
      const onKey = (e: KeyboardEvent) => {
        if (!inside(geo().raw) || e.metaKey || e.ctrlKey || e.altKey) return;
        const el = document.activeElement as HTMLElement | null;
        if (el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable)) return;
        const dir = ['ArrowDown', 'PageDown', ' '].includes(e.key) ? (e.shiftKey && e.key === ' ' ? -1 : 1)
          : ['ArrowUp', 'PageUp'].includes(e.key) ? -1 : 0;
        if (!dir || leaving(dir)) return;
        e.preventDefault();
        if (ready()) step(dir);
      };
      const onClick = (e: MouseEvent) => {
        if ((e.target as Element).closest?.('a[href*="#"]')) bypass = performance.now() + BYPASS_MS;
      };

      const io = new IntersectionObserver((entries) => {
        inView = entries.some((e) => e.isIntersecting);
        if (inView) wake();
      });
      io.observe(track);
      const onResize = () => { resize(); if (inside(geo().raw)) go(target); };
      addEventListener('scroll', fromScroll, { passive: true });
      addEventListener('wheel', onWheel, { passive: false });
      addEventListener('touchstart', onTouchStart, { passive: true });
      addEventListener('touchmove', onTouchMove, { passive: false });
      addEventListener('keydown', onKey);
      document.addEventListener('click', onClick, true);
      addEventListener('resize', onResize);
      // picking a step walks the scene there, one step after another
      const jumps = segs.map((li, i) => {
        const btn = li.querySelector('button')!;
        const pick = () => go(i);
        btn.addEventListener('click', pick);
        return () => btn.removeEventListener('click', pick);
      });
      const start = Math.max(0, Math.min(N - 1, Math.round(geo().raw)));
      target = cur = start;
      p = pAt(start);
      showCaption(start, false);
      syncUI();
      cleanups.push(
        () => io.disconnect(),
        () => removeEventListener('scroll', fromScroll),
        () => removeEventListener('wheel', onWheel),
        () => removeEventListener('touchstart', onTouchStart),
        () => removeEventListener('touchmove', onTouchMove),
        () => removeEventListener('keydown', onKey),
        () => document.removeEventListener('click', onClick, true),
        () => removeEventListener('resize', onResize),
        () => cancelAnimationFrame(raf),
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
      <div className="lev-after" />
    </section>
  );
}
