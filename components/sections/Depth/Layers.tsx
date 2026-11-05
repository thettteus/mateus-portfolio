'use client';
import { useEffect, useRef } from 'react';
import { bindPinnedSteps, type PinnedSteps } from '@/components/ui/pinnedSteps';

export type Layer = {
  short: string; // the big word
  title: string;
  items: string[];
};

const STEP_MS = 520; // how long the scene takes to move one layer down (Leverage's pace)
const SWEEP_S = 0.9; // how long a layer's change takes to spread across the screen

const TAU = Math.PI * 2;
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeOutQuart = (t: number) => 1 - (1 - t) ** 4;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type RGB = [number, number, number];

// seeded, so the drawing is the same on every visit
let seed = 11;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
// 1 · loose ideas: how far each one strays from its place in the line
const IDEAS = Array.from({ length: 140 }, () => ({
  jx: rnd() * 2 - 1, jy: rnd() * 2 - 1, ph: rnd() * TAU, sp: 0.6 + rnd() * 0.8, r: 1 + rnd() * 0.9, a: 0.45 + rnd() * 0.5,
}));
// 3 · handmade pieces: each one a different size, set down at a different angle
const PIECES = Array.from({ length: 80 }, () => ({
  jx: rnd() * 2 - 1, jy: rnd() * 2 - 1, size: 5 + rnd() * 6, rot: (rnd() * 2 - 1) * 0.5, ph: rnd() * TAU,
}));

/**
 * Layers — "problems cut across layers": the same pinned frame as Leverage.
 * Four strata run across the screen, product on top, operations at the bottom,
 * and each scroll gesture moves one layer down (see pinnedSteps). In every
 * layer the work flows left to right: grey and loose on the left (the
 * problem), green and in order once it crosses into the right side (my
 * impact). Ideas line up; tangled wiring becomes a system (UI → API → data)
 * with requests running through it; handmade work goes through a pipeline
 * (automate → validate → ship) and comes out uniform, checked and faster; a
 * noisy signal goes calm.
 * A layer's impact spreads out once the scene reaches it.
 */
export default function Layers({ layers }: { layers: Layer[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const capsRef = useRef<HTMLOListElement>(null);
  const progRef = useRef<HTMLOListElement>(null);
  const N = layers.length;

  useEffect(() => {
    const track = trackRef.current;
    const cvs = canvasRef.current;
    const ctx = cvs?.getContext('2d');
    const capList = capsRef.current;
    if (!track || !cvs || !ctx || !capList || !progRef.current) return;
    const caps = [...capList.querySelectorAll<HTMLElement>(':scope > .dl-cap')];
    const segs = [...progRef.current.querySelectorAll<HTMLElement>(':scope > li')];
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

    // colours come from the theme; any CSS colour is normalised through a canvas
    let C: { ink: RGB; dot: RGB; accent: RGB; rule: RGB; bg: RGB } = { ink: [0, 0, 0], dot: [0, 0, 0], accent: [0, 0, 0], rule: [0, 0, 0], bg: [255, 255, 255] };
    let font = 'sans-serif';
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
    // grey turning green: the problem becoming the impact
    const toGreen = (s: number, a: number) => rgba([0, 1, 2].map((k) => Math.round(lerp(C.dot[k], C.accent[k], s))) as RGB, a);
    const readColors = () => {
      const cs = getComputedStyle(track);
      C = {
        ink: toRGB(cs.getPropertyValue('--ink')),
        dot: toRGB(cs.getPropertyValue('--dl-dot')),
        accent: toRGB(cs.getPropertyValue('--accent')),
        rule: toRGB(cs.getPropertyValue('--rule')),
        bg: toRGB(cs.getPropertyValue('--bg')),
      };
      font = cs.getPropertyValue('--font-sans').trim() || 'sans-serif';
    };

    // layout: the strata fill the space above the caption, edge to edge
    let W = 1, H = 1, dpr = 1;
    let G = { top: 0, bh: 1, xc: 0, edge: 0 };
    const resize = () => {
      const r = cvs.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      cvs.width = Math.round(W * dpr); cvs.height = Math.round(H * dpr);
      const wide = W >= H * 0.95;
      const top = H * (wide ? 0.13 : 0.12);
      const bottom = H * (wide ? 0.57 : 0.5);
      G = { top, bh: (bottom - top) / N, xc: W * (wide ? 0.6 : 0.4), edge: capList.getBoundingClientRect().left - r.left };
    };
    const y0 = (i: number) => G.top + i * G.bh;
    const cy = (i: number) => y0(i) + G.bh / 2;

    // p: where the scene is, 0 … N-1 (eased); sweep: how far each layer's
    // impact has spread out to the right, 0 … 1
    let p = 0;
    const sweep = layers.map(() => 0);
    const pAt = (pos: number, travel: number) => {
      const lo = Math.floor(pos), t = pos - lo;
      // answers the gesture at once and lands softly, whichever way it runs
      return lo + (travel > 0 ? easeOutQuart(t) : 1 - easeOutQuart(1 - t));
    };
    // the leading edge of layer i's impact
    const frontOf = (i: number) => G.xc + easeOut(sweep[i]) * (W - G.xc + 80);
    // how far along the change is at x: 0 on the left, 1 once x has crossed
    // over (within `zone` px of the line between them) and the impact has
    // spread that far
    const settledAt = (i: number, x: number, zone = 6) =>
      smooth(G.xc - zone, G.xc + zone, x) * clamp01((frontOf(i) - x) / 70);
    // a stroke that is grey up to the line, green across the settled stretch
    // and grey again past the impact's front
    const impactStroke = (i: number, a: number) => {
      const at = (x: number) => clamp01(x / W);
      const front = frontOf(i);
      const g = ctx.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, rgba(C.dot, a));
      g.addColorStop(at(G.xc - 6), rgba(C.dot, a));
      if (front > G.xc + 6) {
        g.addColorStop(at(G.xc + 6), rgba(C.accent, a));
        g.addColorStop(at(Math.max(G.xc + 6, front - 70)), rgba(C.accent, a));
        g.addColorStop(at(front), rgba(C.dot, a));
      }
      g.addColorStop(1, rgba(C.dot, a));
      return g;
    };
    // the right side's working area, where the drawings sit
    const span = () => W * 0.9 - G.xc;
    const label = (text: string, x: number, y: number, a: number) => {
      ctx.font = `400 10px ${font}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = rgba(C.ink, 0.5 * a);
      ctx.fillText(text, x, y);
      ctx.textAlign = 'left';
    };
    // work that flows left to right: the k-th item's position, evenly spaced
    const flow = (k: number, gap: number, speed: number, t: number) => {
      const loop = (Math.ceil(W / gap) + 2) * gap;
      return ((k * gap + t * speed) % loop) - gap;
    };

    // 1 · shaping the product: loose ideas drift in; across the line they
    // fall into a single, evenly spaced line, strung on one thread
    const drawShaping = (i: number, t: number, e: number) => {
      const yc = cy(i), gap = 22;
      const front = frontOf(i);
      if (front > G.xc + 10) {
        const g = ctx.createLinearGradient(G.xc - 40, 0, front, 0);
        g.addColorStop(0, rgba(C.accent, 0));
        g.addColorStop(0.25, rgba(C.accent, 0.5 * e));
        g.addColorStop(Math.max(0.25, 1 - 70 / (front - G.xc + 40)), rgba(C.accent, 0.5 * e));
        g.addColorStop(1, rgba(C.accent, 0));
        ctx.strokeStyle = g;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(G.xc - 40, yc); ctx.lineTo(front, yc); ctx.stroke();
      }
      for (let k = 0; k < Math.ceil(W / gap) + 2; k++) {
        const q = IDEAS[k % IDEAS.length];
        const bx = flow(k, gap, 0.032, t);
        const s = settledAt(i, bx, 48);
        const loose = 1 - s;
        const x = bx + loose * (q.jx * gap * 0.9 + Math.sin(t * 0.0007 * q.sp + q.ph) * 6);
        const y = yc + loose * (q.jy * G.bh * 0.34 + Math.cos(t * 0.0006 * q.sp + q.ph) * 5);
        ctx.fillStyle = toGreen(s, e * lerp(q.a, 1, s));
        ctx.beginPath(); ctx.arc(x, y, lerp(q.r, 2.5, s), 0, TAU); ctx.fill();
      }
    };

    // 2 · designing & shipping: tangled wiring on the left; across the line it
    // straightens into clean routes through a designed system. Clients (a UI,
    // an SDK, direct calls) come in through an API; behind it, inside the
    // production boundary, an agent working with retrieval (RAG) and a data
    // model, and the whole thing live. Requests run every route.
    type Pt = [number, number];
    const along = (path: Pt[], d: number): Pt => {
      for (let k = 1; k < path.length; k++) {
        const [ax, ay] = path[k - 1], [bx, by] = path[k];
        const len = Math.hypot(bx - ax, by - ay);
        if (d <= len) return [ax + ((bx - ax) * d) / len, ay + ((by - ay) * d) / len];
        d -= len;
      }
      return path[path.length - 1];
    };
    const lengthOf = (path: Pt[]) => path.reduce((sum, [x, y], k) => (k ? sum + Math.hypot(x - path[k - 1][0], y - path[k - 1][1]) : 0), 0);
    const drawSystem = (i: number, t: number, e: number) => {
      const yc = cy(i), bh = G.bh, h = bh * 0.2;
      const S = W * 0.88 - G.xc;
      const top = yc - bh * 0.25, mid = yc, bot = yc + bh * 0.18;
      const col = [0.1, 0.35, 0.62, 0.85].map((f) => G.xc + S * f);
      // the parts: where they sit, how wide they are, what they're called
      const P = {
        ui: { x: col[0], y: top, w: h * 1.4, name: 'UI', above: true },
        sdk: { x: col[0], y: bot, w: h * 0.95, name: 'SDK', above: false },
        api: { x: col[1], y: mid, w: h * 1.15, name: 'API', above: false },
        agent: { x: col[2], y: top, w: h, name: 'agent', above: false },
        data: { x: col[2], y: bot, w: h * 0.9, name: 'data model', above: false },
        rag: { x: col[3], y: top, w: h * 0.85, name: 'RAG', above: false },
      };
      const L = (p: { x: number; w: number }) => p.x - p.w / 2;
      const R = (p: { x: number; w: number }) => p.x + p.w / 2;
      const front = frontOf(i);

      // three tangled wires; each straightens into its own way in
      const lanes = [top, mid, bot];
      const ends = [P.ui.x, P.api.x, P.sdk.x];
      ctx.lineWidth = 1.1;
      for (let w = 0; w < 3; w++) {
        const trace = (x0: number, x1: number) => {
          ctx.beginPath();
          for (let x = x0; x <= x1 + 2; x += 3) {
            const u = x - t * 0.04;
            const tangled = yc + bh * 0.28 * (0.65 * Math.sin(u * 0.016 + w * 2.1) + 0.35 * Math.sin(u * 0.037 + w * 4.2));
            const y = lerp(tangled, lanes[w], settledAt(i, x, 40));
            if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        };
        ctx.strokeStyle = impactStroke(i, e);
        trace(0, ends[w]);
        // past where a wire ends it only shows while still tangled
        const g = ctx.createLinearGradient(0, 0, W, 0);
        [ends[w], front - 70, front, W].filter((x) => x >= ends[w] && x <= W).sort((a, b) => a - b)
          .forEach((x) => g.addColorStop(clamp01(x / W), rgba(C.dot, e * (1 - clamp01((front - x) / 70)))));
        ctx.strokeStyle = g;
        trace(ends[w], W);
      }

      // routes between the parts, squared off
      const in1 = (Math.max(R(P.ui), R(P.sdk)) + L(P.api)) / 2;
      const in2 = (R(P.api) + Math.min(L(P.agent), L(P.data))) / 2;
      const routes: Pt[][] = [
        [[R(P.ui), top], [in1, top], [in1, mid], [L(P.api), mid]],
        [[R(P.sdk), bot], [in1, bot], [in1, mid], [L(P.api), mid]],
        [[R(P.api), mid], [in2, mid], [in2, top], [L(P.agent), top]],
        [[R(P.api), mid], [in2, mid], [in2, bot], [L(P.data), bot]],
        [[R(P.agent), top], [L(P.rag), top]],
      ];
      ctx.lineWidth = 1.1;
      routes.forEach((r) => {
        const vis = settledAt(i, r[r.length - 1][0]);
        if (vis < 0.01) return;
        ctx.strokeStyle = rgba(C.accent, 0.8 * e * vis);
        ctx.beginPath();
        r.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
      });

      // the production boundary around everything behind the API
      const box = { x0: L(P.api) - 16, x1: R(P.rag) + 24, y0: yc - bh * 0.46, y1: yc + bh * 0.475 };
      const boxVis = settledAt(i, box.x1);
      if (boxVis > 0.01) {
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1;
        ctx.strokeStyle = rgba(C.accent, 0.45 * e * boxVis);
        ctx.beginPath(); ctx.roundRect(box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0, 6); ctx.stroke();
        ctx.restore();
      }

      // requests: in along the three ways, then along every route
      ctx.fillStyle = rgba(C.accent, e);
      const dot = ([x, y]: Pt) => { ctx.beginPath(); ctx.arc(x, y, 2, 0, TAU); ctx.fill(); };
      lanes.forEach((ly, l) => {
        const stop = l === 1 ? L(P.api) : l === 0 ? L(P.ui) : L(P.sdk);
        for (let k = 0; k < Math.ceil(W / 44) + 2; k++) {
          const x = flow(k, 44, 0.06, t + l * 230);
          if (x < G.xc + 30 || x > stop - 4 || settledAt(i, x, 40) < 0.95) continue;
          dot([x, ly]);
        }
      });
      routes.forEach((r, n) => {
        if (settledAt(i, r[r.length - 1][0]) < 0.95) return;
        const len = lengthOf(r);
        for (let d = (t * 0.06 + n * 17) % 40; d < len - 3; d += 40) if (d > 3) dot(along(r, d));
      });

      // the parts themselves, on a clean ground so the routes stop at them
      ctx.lineWidth = 1.2;
      (Object.keys(P) as (keyof typeof P)[]).forEach((key) => {
        const { x, y, w, name, above } = P[key];
        const vis = settledAt(i, x);
        if (vis < 0.01) return;
        ctx.strokeStyle = rgba(C.accent, e * vis);
        ctx.fillStyle = rgba(C.bg, vis);
        const y0p = y - h / 2;
        ctx.beginPath();
        if (key === 'data') {
          const ry = h * 0.16;
          ctx.ellipse(x, y0p + ry, w / 2, ry, 0, Math.PI, TAU);
          ctx.lineTo(x + w / 2, y0p + h - ry);
          ctx.ellipse(x, y0p + h - ry, w / 2, ry, 0, 0, Math.PI);
          ctx.closePath();
          ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.ellipse(x, y0p + ry, w / 2, ry, 0, 0, Math.PI); ctx.stroke();
        } else if (key === 'sdk') {
          // a package: a cube
          const r = h * 0.52, c30 = Math.cos(Math.PI / 6);
          const v: Pt[] = [[0, -r], [r * c30, -r / 2], [r * c30, r / 2], [0, r], [-r * c30, r / 2], [-r * c30, -r / 2]];
          v.forEach(([vx, vy], k) => (k ? ctx.lineTo(x + vx, y + vy) : ctx.moveTo(x + vx, y + vy)));
          ctx.closePath();
          ctx.fill(); ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x, y); ctx.lineTo(x + v[1][0], y + v[1][1]);
          ctx.moveTo(x, y); ctx.lineTo(x + v[5][0], y + v[5][1]);
          ctx.moveTo(x, y); ctx.lineTo(x, y + r);
          ctx.stroke();
        } else if (key === 'agent') {
          // an agent: a spark in a ring
          ctx.arc(x, y, h / 2, 0, TAU);
          ctx.fill(); ctx.stroke();
          const r = h * 0.3, k2 = r * 0.22;
          ctx.beginPath();
          ctx.moveTo(x, y - r);
          ctx.quadraticCurveTo(x + k2, y - k2, x + r, y);
          ctx.quadraticCurveTo(x + k2, y + k2, x, y + r);
          ctx.quadraticCurveTo(x - k2, y + k2, x - r, y);
          ctx.quadraticCurveTo(x - k2, y - k2, x, y - r);
          ctx.stroke();
        } else if (key === 'rag') {
          // retrieval: a stack of documents
          const dw = w, dh = h * 0.95;
          ctx.roundRect(x - dw / 2 + 3, y - dh / 2 - 3, dw, dh, 2);
          ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.roundRect(x - dw / 2, y - dh / 2, dw, dh, 2);
          ctx.fill(); ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x - dw * 0.28, y - dh * 0.15); ctx.lineTo(x + dw * 0.28, y - dh * 0.15);
          ctx.moveTo(x - dw * 0.28, y + dh * 0.12); ctx.lineTo(x + dw * 0.12, y + dh * 0.12);
          ctx.stroke();
        } else {
          ctx.roundRect(x - w / 2, y0p, w, h, 3);
          ctx.fill(); ctx.stroke();
          ctx.beginPath();
          if (key === 'ui') {
            // UI: a window with its title bar
            ctx.moveTo(x - w / 2, y0p + h * 0.3); ctx.lineTo(x + w / 2, y0p + h * 0.3);
            ctx.moveTo(x - w * 0.28, y0p + h * 0.64); ctx.lineTo(x + w * 0.16, y0p + h * 0.64);
          } else {
            // API: < >
            ctx.moveTo(x - w * 0.1, y - h * 0.2); ctx.lineTo(x - w * 0.27, y); ctx.lineTo(x - w * 0.1, y + h * 0.2);
            ctx.moveTo(x + w * 0.1, y - h * 0.2); ctx.lineTo(x + w * 0.27, y); ctx.lineTo(x + w * 0.1, y + h * 0.2);
          }
          ctx.stroke();
        }
        label(name, x, above ? y0p - 13 : y0p + h + 4, e * vis);
      });

      // live: the system is running, and it's mine to keep running
      const liveVis = settledAt(i, col[3]);
      if (liveVis > 0.01) {
        const lx = col[3] - 8, ph = (t % 2000) / 2000;
        ctx.fillStyle = rgba(C.accent, e * liveVis);
        ctx.beginPath(); ctx.arc(lx, bot, 2.6, 0, TAU); ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = rgba(C.accent, 0.5 * e * liveVis * (1 - ph));
        ctx.beginPath(); ctx.arc(lx, bot, 2.6 + 7 * easeOut(ph), 0, TAU); ctx.stroke();
        ctx.font = `400 10px ${font}`;
        ctx.textBaseline = 'middle';
        ctx.fillStyle = rgba(C.ink, 0.5 * e * liveVis);
        ctx.fillText('live', lx + 12, bot + 0.5);
      }
    };

    // 3 · building the tools that build: work done by hand on the left, every
    // piece a little different, moving at an uneven pace; across the line it
    // runs through a pipeline — automate, validate, ship — and comes out
    // identical, checked, finished, and faster
    const drawTooling = (i: number, t: number, e: number) => {
      const yc = cy(i), size = 7, gh = G.bh * 0.42;
      const gates = [
        { name: 'automate', x: G.xc + span() * 0.16 },
        { name: 'validate', x: G.xc + span() * 0.5 },
        { name: 'ship', x: G.xc + span() * 0.84 },
      ];
      // the belt runs slow by hand and fast once automated: the same stream of
      // pieces bunches up on the left and spreads out on the right
      const sw = easeOut(sweep[i]);
      const V0 = W * 0.8;
      const toX = (v: number) => lerp(v, v < V0 ? (v * G.xc) / V0 : G.xc + ((v - V0) * (W - G.xc)) / (W - V0), sw);

      ctx.lineWidth = 1;
      ctx.strokeStyle = impactStroke(i, 0.3 * e);
      ctx.beginPath(); ctx.moveTo(0, yc + size / 2 + 3.5); ctx.lineTo(W, yc + size / 2 + 3.5); ctx.stroke();

      gates.forEach(({ name, x }) => {
        const vis = settledAt(i, x);
        if (vis < 0.01) return;
        // an arch the belt runs through
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = rgba(C.accent, e * vis);
        ctx.beginPath();
        ctx.moveTo(x - 8, yc + gh / 2); ctx.lineTo(x - 8, yc - gh / 2); ctx.lineTo(x + 8, yc - gh / 2); ctx.lineTo(x + 8, yc + gh / 2);
        ctx.stroke();
        label(name, x, yc + gh / 2 + 5, e * vis);
      });

      for (let k = 0; k < Math.ceil(W / 26) + 2; k++) {
        const q = PIECES[k % PIECES.length];
        let x = toX(flow(k, 26, 0.04, t));
        const s = settledAt(i, x, 10);
        // by hand until the first gate: odd sizes, turned, stop and go
        const hand = 1 - smooth(gates[0].x - 10, gates[0].x + 6, x) * s;
        x += hand * Math.sin(t * 0.0021 + q.ph) * 6;
        const y = yc + hand * q.jy * G.bh * 0.06;
        const sz = lerp(size, q.size, hand);
        const checked = smooth(gates[1].x - 4, gates[1].x + 8, x) * s;
        const shipped = smooth(gates[2].x - 4, gates[2].x + 8, x) * s;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(hand * (q.rot + Math.sin(t * 0.0013 + q.ph) * 0.12));
        ctx.lineWidth = 1;
        ctx.strokeStyle = toGreen(1 - hand, e * lerp(0.85, 1, 1 - hand));
        ctx.strokeRect(-sz / 2 + 0.5, -sz / 2 + 0.5, sz - 1, sz - 1);
        if (shipped > 0) {
          ctx.fillStyle = rgba(C.accent, e * shipped);
          ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
        }
        ctx.restore();
        if (checked > 0.01) {
          // validated: a tick rides along above the piece
          ctx.lineWidth = 1.3;
          ctx.strokeStyle = rgba(C.accent, e * checked);
          ctx.beginPath();
          ctx.moveTo(x - 3, y - sz / 2 - 6); ctx.lineTo(x - 1, y - sz / 2 - 4); ctx.lineTo(x + 3, y - sz / 2 - 9);
          ctx.stroke();
        }
      }
    };

    // 4 · running lean & secure: a noisy, spiking signal; across the line it
    // runs low and steady
    const drawSignal = (i: number, t: number, e: number) => {
      const yc = cy(i), A = G.bh * 0.24;
      ctx.lineWidth = 1.1;
      ctx.strokeStyle = impactStroke(i, e);
      ctx.beginPath();
      for (let x = 0; x <= W; x += 3) {
        const u = x - t * 0.06;
        const rough = 0.5 * Math.sin(u * 0.045) + 0.3 * Math.sin(u * 0.11 + 1.3) + 0.2 * Math.sin(u * 0.23 + 2.1) + 1.1 * Math.max(0, Math.sin(u * 0.013)) ** 14;
        const steady = 0.16 * Math.sin(u * 0.02);
        const y = yc - A * lerp(rough, steady, settledAt(i, x));
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };
    const TEXTURES = [drawShaping, drawSystem, drawTooling, drawSignal];

    const draw = (t: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // the strata: a hairline between layers, fading out at the screen edges
      const fade = ctx.createLinearGradient(0, 0, W, 0);
      fade.addColorStop(0, rgba(C.rule, 0));
      fade.addColorStop(0.1, rgba(C.rule, 1));
      fade.addColorStop(0.9, rgba(C.rule, 1));
      fade.addColorStop(1, rgba(C.rule, 0));
      ctx.strokeStyle = fade;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= N; i++) { const y = Math.round(y0(i)) + 0.5; ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke();

      // the layer the scene is on reads at full strength, the ones it passed
      // at half, the ones still ahead barely
      const here = layers.map((_, i) => 1 - smooth(0, 1, Math.abs(p - i)));
      for (let i = 0; i < N; i++) {
        TEXTURES[i % TEXTURES.length](i, t, 0.16 + 0.29 * Math.min(1, sweep[i] * 1.5) + 0.55 * here[i]);
      }
      // the drawing fades out toward both screen edges
      const mask = ctx.createLinearGradient(0, 0, W, 0);
      mask.addColorStop(0, 'rgba(0,0,0,0)');
      mask.addColorStop(0.14, 'rgba(0,0,0,1)');
      mask.addColorStop(0.86, 'rgba(0,0,0,1)');
      mask.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = mask;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';

      ctx.font = `500 11px ${font}`;
      ctx.textBaseline = 'top';
      for (let i = 0; i < N; i++) {
        ctx.fillStyle = rgba(C.ink, 0.3 + 0.7 * here[i]);
        ctx.fillText(String(i + 1).padStart(2, '0'), G.edge, y0(i) + 10);
      }
    };

    const showCaption = (step: number) => {
      caps.forEach((c, i) => {
        c.classList.toggle('is-on', i === step);
        c.classList.toggle('is-past', i < step);
      });
    };
    const syncUI = (target: number) => {
      segs.forEach((li, i) => {
        // the first bar is full on arrival; each later one fills on the way in
        const f = i === 0 ? 1 : clamp01(p - (i - 1));
        li.querySelector<HTMLElement>('.dl-bar')?.style.setProperty('--f', f.toFixed(3));
        li.querySelector('button')?.setAttribute('aria-current', i === target ? 'step' : 'false');
      });
    };

    let last = 0;
    const frame = (now: number, s: PinnedSteps) => {
      const dt = last ? Math.min(0.064, (now - last) / 1000) : 0.016;
      last = now;
      p = pAt(s.cur, s.travel);
      // a layer's impact spreads once the scene reaches it, and pulls back when
      // the scene goes back above it
      sweep.forEach((v, i) => {
        const goal = p >= i - 0.35 ? 1 : 0;
        sweep[i] = goal > v ? Math.min(goal, v + dt / SWEEP_S) : Math.max(goal, v - dt / SWEEP_S);
      });
      draw(now);
      syncUI(s.target);
    };

    readColors();
    resize();

    // the site's theme toggle flips data-theme on <html>
    const themeObs = new MutationObserver(() => { readColors(); if (calm) draw(0); });
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });

    const cleanups: (() => void)[] = [() => themeObs.disconnect()];
    if (calm) {
      // reduced motion: no pinning, the finished picture and all four layers
      track.classList.add('is-static');
      resize();
      p = N - 1;
      sweep.fill(1);
      draw(0);
      caps.forEach((c) => c.classList.add('is-on'));
      const onResize = () => { resize(); draw(0); };
      addEventListener('resize', onResize);
      cleanups.push(() => removeEventListener('resize', onResize));
    } else {
      addEventListener('resize', resize);
      const steps = bindPinnedSteps({ track, count: N, stepMs: STEP_MS, onStep: showCaption, onFrame: frame });
      // picking a layer walks the scene there, one layer after another
      const jumps = segs.map((li, i) => {
        const btn = li.querySelector('button')!;
        const pick = () => steps.go(i);
        btn.addEventListener('click', pick);
        return () => btn.removeEventListener('click', pick);
      });
      cleanups.push(() => removeEventListener('resize', resize), steps.destroy, ...jumps);
    }
    return () => cleanups.forEach((f) => f());
  }, [N, layers]);

  return (
    <div className="dl-track" ref={trackRef}>
      <div className="dl-pin">
        <canvas ref={canvasRef} aria-hidden="true" />

        <ol className="dl-captions" ref={capsRef}>
          {layers.map(({ short, title, items }, i) => (
            <li className="dl-cap" key={short}>
              <p className="dl-cap-n"><span>{i + 1}/{N}</span>{title}</p>
              <h3><span className="dl-word">{short}</span></h3>
              <ul className="dl-items">
                {items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </li>
          ))}
        </ol>

        <ol className="dl-progress" ref={progRef} aria-label="Layers">
          {layers.map(({ short }) => (
            <li key={short}><button type="button" aria-label={short}><span className="dl-bar" /></button></li>
          ))}
        </ol>
      </div>
    </div>
  );
}
