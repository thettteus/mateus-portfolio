'use client';
import { useEffect, useRef, useState } from 'react';
import { FITZ } from './skyline';

const NAME = 'Matt P. S.';

const AREAS = [
  { title: 'Product', sub: 'Scoping, MVPs, UX thinking' },
  { title: 'Engineering', sub: 'Full-stack, distributed systems' },
  { title: 'Data', sub: 'Pipelines, Postgres, Kafka' },
  { title: 'AI', sub: 'LLM apps, RAG, agents' },
];

// how tall the range stands, in letter heights: the whole skyline spans RELIEF
// from summit to floor. The range is drawn in front of the name, so it must
// never touch a letter: its summit stops CLEAR (in font sizes) under the
// name's real baseline, below the overshoot of round letters and the dots.
const RELIEF = 0.9 * 1.35;
const CLEAR = 0.045;

// The skyline is pinned to the name, not to the screen, so the summits always
// fall in the same places between the letters. In name widths: the profile
// runs LEAD before the M and TRAIL after the last dot. The foothills on either
// side stretch to reach the screen's edges; only past MAX_TRAIL of free space
// on the right (ultrawide monitors) does the range end early, fading out.
const LEAD = 0.0433;
const TRAIL = 0.1487;
const MAX_TRAIL = 0.4;
const U_L = LEAD / (1 + LEAD + TRAIL); // where the M starts along the profile
const U_R = (1 + LEAD) / (1 + LEAD + TRAIL); // where the last dot ends

// the one entrance: the lines draw from the back (the crest) to the front,
// then the name rises out of the range — all within 1.5s
const LINE_MS = 420; // one line drawing left to right
const LINES_MS = 900; // the last line done
const NAME_FROM = 650;
const NAME_MS = 850;

// the scroll scene, in order: the name sets behind the range, the title rises
// out of it as soon as the name is gone, and the range flattens into a rule.
// Like the range stack and Leverage, one scroll gesture plays one step on its
// own clock: step 1 sets the name and raises the title, step 2 flattens the
// range. These are fractions of the whole scene.
const SET: [number, number] = [0, 0.32];
const RISE: [number, number] = [0.32, 0.62];
const FLAT: [number, number] = [0.62, 1];
const STEPS = 3; // positions: at rest, title risen, flat
const STEP_AT = [0, RISE[1], 1]; // where each position sits in the scene
const STEP_MS = [1000, 600]; // how long each step takes to play
const GESTURE_GAP_MS = 180; // a pause this long between wheel events starts a new gesture
const SUSTAIN_MS = 300; // a wheel still spinning this long after a landing moves on again
const SWIPE_PX = 40; // touch travel that counts as a swipe
const BYPASS_MS = 2000; // in-page link scrolls pass straight through for this long
// the cut follows the crest from the first pixel of the drop; this short ramp
// only keeps the dot from blinking out the instant the scroll starts
const ENGAGE = 0.05;

type Mode = 'row' | 'title' | 'calm';
type Piece = { el: HTMLElement; x: number; y: number; w: number; travel: number };
type Geo = {
  W: number; H: number; base: number; cap: number;
  nameL: number; nameR: number; end: number;
  lineY: number; shift: number; // where the range flattens to, and how far what follows rises to meet it
  xs: Float32Array; c0: Float32Array; mean: number; gap: number; lines: number; low: number;
  nameX: number; nameY: number; nameW: number; travelName: number; lift: number;
  pieces: Piece[];
};

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const phase = ([a, b]: [number, number], p: number) => clamp01((p - a) / (b - a));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const smoothstep = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// The range as ASCII (data-range="ascii" on <html>): Fitz Roy itself, set in
// micro monospace glyphs. The relief is the photo the skyline was traced from,
// stored crest-relative (column = along the profile, row = photo px under the
// crest), so it follows the drawn crest wherever the scene moves it. Each cell
// takes the glyph whose ink, over a 2×3 grid, best matches the rock under it:
// the silhouette, the walls and the cracks come out of the glyphs' own shapes.
const RELIEF_SRC = '/assets/hero/fitz-roy-relief.webp';
const RELIEF_PX = 291.4; // photo px from the summit to the skyline's lowest point (one unit of FITZ)
// every printable glyph but the straight bars
const GLYPHS = ` .,'\`:;!ilIj1rt(){}[]?<>+*^"cvxzsunoaeLJTYFCUOQ0ZXmwqpdbkhgyfAEVKPRSDGHNBW8M#%&$@`;
// smooth rock is set from a ramp of round, even glyphs so it reads as tone, not
// as noise; only cells with an edge in them (the crest, a wall, a couloir)
// reach for the whole set to match its shape
const RAMP_FROM = '.:;*+cosaexzun%#&8$@BWM';
const RAMP_STEPS = 16;
const EDGE = 0.32; // ink spread inside a cell that makes it an edge
const SUB_X = 2, SUB_Y = 3; // the grid a glyph's ink is compared on
// the tone curve from rock to ink: on paper the rock is the ink and the snow
// the paper, so the pivot sits lower; on the dark field the light is the ink
const CONTRAST = 8, PIVOT_PAPER = 0.4, PIVOT_DARK = 0.52;
const GLYPH_PX: [number, number] = [4.5, 5.5]; // micro: the likeness lives in resolution
// TEMP tuning overrides (?px=…&k=…&pp=…&pd=…&w=…&ac=0)
const TUNE = typeof location === 'undefined' ? new URLSearchParams() : new URLSearchParams(location.search);
const tune = (k: string, d: number) => (TUNE.has(k) ? Number(TUNE.get(k)) : d);

/**
 * Hero — a magazine cover: the name is the masthead, set as wide as the page
 * in front of Fitz Roy drawn as a survey plate. Scrolling plays the scene one
 * step per gesture: the name sets behind the range like a sun and the title
 * rises out of it; then the range flattens into the rule over the next section.
 */
export default function Hero() {
  const track = useRef<HTMLDivElement>(null);
  const cover = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const sky = useRef<HTMLDivElement>(null);
  const mast = useRef<HTMLHeadingElement>(null);
  const inner = useRef<HTMLSpanElement>(null);
  const land = useRef<HTMLCanvasElement>(null);
  const rise = useRef<HTMLDivElement>(null);
  const after = useRef<HTMLDivElement>(null);
  // 'row': title, words and buttons rise (wide screens); 'title': only the
  // title rises, the rest follows the hero (narrow); 'calm': reduced motion
  // null until the screen has been read: nothing is shown before that
  const [picked, setMode] = useState<Mode | null>(null);
  const mode: Mode = picked ?? 'row';

  useEffect(() => {
    const calmMQ = matchMedia('(prefers-reduced-motion: reduce)');
    const wideMQ = matchMedia('(min-width: 960px)');
    const pick = () => setMode(calmMQ.matches ? 'calm' : wideMQ.matches ? 'row' : 'title');
    pick();
    calmMQ.addEventListener('change', pick);
    wideMQ.addEventListener('change', pick);
    return () => { calmMQ.removeEventListener('change', pick); wideMQ.removeEventListener('change', pick); };
  }, []);

  useEffect(() => {
    const T = track.current, C = cover.current, S = stage.current, K = sky.current;
    const m = mast.current, inn = inner.current, cvs = land.current, row = rise.current, next = after.current;
    const ctx = cvs?.getContext('2d');
    if (!picked || !T || !C || !S || !K || !m || !inn || !cvs || !ctx || !row || !next) return;
    const calm = mode === 'calm';
    // what rises, each on its own so each comes up from right under the crest
    const risers = [...row.children] as HTMLElement[];
    const role = inn.querySelector<HTMLElement>('.hero-role')!;

    let g: Geo | null = null;
    let raf = 0, disposed = false;
    let crest = new Float32Array(0); // the crest as drawn this frame, one value per sample
    let entryAt = calm ? -1e9 : Infinity; // set once the font is in
    let p = 0; // where the scene stands (0 at rest … 1 flat)
    // cur walks toward target (positions 0 … STEPS-1) on the step clock
    let cur = 0, target = 0, last = 0, readyAt = 0;
    let bypass = 0, programmatic = false, lastRaw = 0, swipedAt = 0;
    const sceneAt = (pos: number) => {
      const lo = Math.min(STEPS - 2, Math.floor(pos));
      return STEP_AT[lo] + (STEP_AT[lo + 1] - STEP_AT[lo]) * (pos - lo);
    };

    // colours come from the theme
    const probe = document.createElement('canvas').getContext('2d')!;
    let ink = '#000', rule = '#ccc', inkRGB = '0,0,0';
    const readColors = () => {
      const cs = getComputedStyle(document.documentElement);
      ink = cs.getPropertyValue('--ink').trim() || '#000';
      rule = cs.getPropertyValue('--rule').trim() || '#ccc';
      probe.fillStyle = '#000';
      probe.fillStyle = ink;
      const v = String(probe.fillStyle);
      inkRGB = v.startsWith('#')
        ? [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16)).join(',')
        : (v.match(/[\d.]+/g) ?? ['0', '0', '0']).slice(0, 3).join(',');
    };

    // where a glyph's ink starts, right of its origin: drawn and scanned, since
    // Safari's measureText bounds can't be trusted
    const glyph = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
    const inkLeft = (cs: CSSStyleDeclaration, ch: string) => {
      const size = parseFloat(cs.fontSize), pad = Math.ceil(size * 0.5);
      const w = Math.ceil(size * 1.5) + pad, h = Math.ceil(size * 1.6);
      glyph.canvas.width = w;
      glyph.canvas.height = h;
      glyph.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      glyph.textBaseline = 'middle';
      glyph.fillText(ch, pad, h / 2);
      const data = glyph.getImageData(0, 0, w, h).data;
      for (let x = 0; x < w; x++)
        for (let y = 0; y < h; y++) if (data[(y * w + x) * 4 + 3] > 64) return x - pad;
      return 0;
    };
    // the masthead fills the width, but never more than a third of the screen height
    // the masthead fills the width, up to `most` px (set so the whole cover fits)
    const fit = (most = Infinity) => {
      m.style.fontSize = '100px';
      const width = inn.getBoundingClientRect().width;
      const byWidth = (100 * m.clientWidth / width) * 0.99;
      m.style.fontSize = Math.min(byWidth, most).toFixed(2) + 'px';
      m.style.setProperty('--name-size', m.style.fontSize);
      // Align actual glyph edges, not the different font sizes' line boxes.
      const nameStyle = getComputedStyle(m), roleStyle = getComputedStyle(role);
      const nameInset = inkLeft(nameStyle, NAME[0]);
      const roleInset = inkLeft(roleStyle, 'S');
      role.style.setProperty('--role-inset', `${nameInset - roleInset}px`);
    };
    // the smallest the screen gets (100svh): mobile toolbars never hide the cover
    const probe100 = document.createElement('div');
    probe100.style.cssText = 'position:absolute;top:0;height:100svh;width:0;visibility:hidden;pointer-events:none';

    // the range at x (stage px), before it flattens
    const crest0 = (base: number, cap: number, nameL: number, nameR: number, end: number, x: number) => {
      const t = x < nameL ? U_L * Math.max(0, x / nameL)
        : x < nameR ? U_L + (U_R - U_L) * (x - nameL) / (nameR - nameL)
        : U_R + (1 - U_R) * Math.min(1, (x - nameR) / (end - nameR));
      const u = t * (FITZ.length - 1);
      const i = Math.floor(u), f = u - i;
      const v = FITZ[i] * (1 - f) + FITZ[Math.min(FITZ.length - 1, i + 1)] * f;
      return base + cap * RELIEF * v;
    };

    const measure = (): Geo => {
      const fs = parseFloat(m.style.fontSize);
      const W = S.clientWidth;
      // the name is measured where it rests, with the scene's motion lifted for
      // a moment, so the scene never feeds back into itself
      const moved = inn.style.transform;
      inn.style.transform = 'none';
      const sr = S.getBoundingClientRect(), ir = inn.getBoundingClientRect();
      const nameX = ir.left - sr.left, nameY = ir.top - sr.top, nameW = ir.width;
      // the name's real baseline, read off a marker set on it; `base` is where
      // the summit may reach, just clear of the letters
      const cap = fs * 0.72, base = role.getBoundingClientRect().bottom - sr.top + Math.max(16, fs * CLEAR);
      inn.style.transform = moved;
      const nameL = nameX, nameR = nameX + nameW;
      const end = nameR + Math.min(MAX_TRAIL * nameW, Math.max(TRAIL * nameW, W - nameR));
      const H = S.offsetHeight;
      const step = W > 900 ? 4 : 3;
      const n = Math.ceil(W / step) + 1;
      const xs = new Float32Array(n), c0 = new Float32Array(n);
      let sum = 0, hi = Infinity, lo = -Infinity;
      for (let i = 0; i < n; i++) {
        xs[i] = Math.min(W, i * step);
        c0[i] = crest0(base, cap, nameL, nameR, end, xs[i]);
        sum += c0[i]; hi = Math.min(hi, c0[i]); lo = Math.max(lo, c0[i]);
      }
      const gap = Math.max(5, cap * 0.045);
      const lines = Math.max(1, Math.floor((cap * 0.95) / gap));
      const maxUnder = (x0: number, x1: number) => {
        let mx = -Infinity;
        for (let x = x0; x <= x1; x += 4) mx = Math.max(mx, crest0(base, cap, nameL, nameR, end, x));
        return mx;
      };
      const rowX = K.offsetLeft + row.offsetLeft, rowY = K.offsetTop + row.offsetTop;
      // a riser is hidden once its top is under the crest everywhere beneath it
      const pieces = risers.map((el) => {
        const x = rowX + el.offsetLeft, y = rowY + el.offsetTop, w = el.offsetWidth;
        return { el, x, y, w, travel: Math.max(0, maxUnder(x, x + w) - y + 4) };
      });
      // flat, the range is the rule right under the risen words
      const lineY = calm ? H - 0.5 : Math.min(H - 0.5, rowY + row.offsetHeight + Math.min(56, Math.max(32, innerHeight * 0.05)));
      return {
        W, H, base, cap, nameL, nameR, end, lineY, shift: H - 0.5 - lineY,
        xs, c0, mean: sum / n, gap, lines, low: Math.min(H - 40, lo),
        // the name sinks until it is under the range, and under the rule it becomes
        nameX, nameY, nameW, travelName: Math.max(maxUnder(nameL, nameR), lineY) - nameY + 6,
        lift: base - hi + 4,
        pieces,
      };
    };

    // room under the name for the foothills, and — when the rising words are
    // taller than the name and its range — room above the name to hold them
    // The whole cover — the name, the range, and the areas under it — fits the
    // screen at rest: if the areas would end below it, the name (and with it
    // the range, which is sized from the name) comes down until they don't.
    const areas = next.querySelector<HTMLElement>('.areas')!;
    const layout = () => {
      const footK = matchMedia('(max-width: 599px)').matches ? 1.18 : 1.02;
      document.body.append(probe100);
      const screenH = Math.min(innerHeight, probe100.offsetHeight);
      probe100.remove();
      let most = Infinity;
      for (let i = 0; i < 4; i++) {
        fit(most);
        const fs = parseFloat(m.style.fontSize);
        K.style.paddingBottom = Math.round(fs * footK) + 'px';
        K.style.paddingTop = '0px';
        if (!calm) {
          const need = row.offsetHeight + 24 - K.offsetHeight;
          if (need > 0) K.style.paddingTop = Math.ceil(need) + 'px';
        }
        // where the cover's last line ends at rest (with the scene's motion lifted)
        const moved = next.style.transform;
        next.style.transform = 'none';
        const last = calm ? S : areas;
        const bottom = last.getBoundingClientRect().bottom - C.getBoundingClientRect().top;
        next.style.transform = moved;
        const over = bottom - (screenH - 16);
        if (over <= 1) break;
        most = fs - over / (0.95 + footK);
      }
      g = measure();
      if (TUNE.has('dump')) document.documentElement.dataset.geo = JSON.stringify({ W: g.W, H: g.H, base: g.base, cap: g.cap, nameL: g.nameL, nameR: g.nameR, end: g.end, lineY: g.lineY }); // TEMP
      const dpr = Math.min(2, devicePixelRatio || 1);
      cvs.width = Math.round(g.W * dpr);
      cvs.height = Math.round(g.H * dpr);
      T.style.setProperty('--cover-height', `${C.offsetHeight}px`);
      // what follows the hero rises to meet the rule, so the page continues right under it
      T.style.marginBottom = g.shift ? `${-g.shift}px` : '';
      // keep the page on the step the scene is on
      if (!calm && inside(geo().raw)) go(target);
      cancelAnimationFrame(raf);
      frame(performance.now());
    };

    const flatAmt = () => easeInOut(phase(FLAT, p));
    // The page under the hero sits right below the areas once the scene is
    // done (see the track's margin). Each step moves the scroll at once while
    // the scene plays on its own clock, so the next section is held back by
    // exactly what the scene still owes: it stays glued under the areas and
    // rises with them, like an ordinary scroll, never ahead of them.
    const page = T.nextElementSibling as HTMLElement | null;
    const holdPage = () => {
      if (!page || !g || calm) return;
      const G2 = geo();
      const ahead = Math.max(0, G2.top + G2.span - scrollY); // scroll still to come in the track
      const hold = g.shift * (1 - flatAmt()) - ahead;
      page.style.transform = Math.abs(hold) > 0.5 ? `translate3d(0, ${hold.toFixed(2)}px, 0)` : '';
    };
    // the crest at x, as the clips see it
    const crestAt = (x: number) => {
      const G = g!;
      const y = crest0(G.base, G.cap, G.nameL, G.nameR, G.end, x);
      return y + (G.lineY - y) * flatAmt();
    };

    // a clip that keeps what is above the crest, in the element's own space
    const clipAbove = (x0: number, w: number, y0: number, dy: number, drop: number) => {
      const pts: string[] = [`-20px -4000px`, `${(w + 20).toFixed(0)}px -4000px`];
      const step = Math.max(6, w / 90);
      for (let x = w + 20; x >= -20; x -= step) {
        const y = crestAt(x0 + x) + drop - y0 - dy;
        pts.push(`${x.toFixed(1)}px ${y.toFixed(1)}px`);
      }
      return `polygon(${pts.join(',')})`;
    };

    let ascii = document.documentElement.dataset.range === 'ascii';
    // the relief, read once into plain arrays; on failure the range falls back to lines
    let relief: { w: number; h: number; lum: Uint8ClampedArray } | null = null;
    const reliefReady = !ascii ? Promise.resolve() : new Promise<void>((done) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const x = c.getContext('2d', { willReadFrequently: true })!;
        x.drawImage(img, 0, 0);
        const px = x.getImageData(0, 0, c.width, c.height).data;
        // luminance in the red channel, presence in alpha: no photo reads as -1
        const lum = new Uint8ClampedArray(c.width * c.height);
        for (let i = 0; i < lum.length; i++) lum[i] = px[i * 4 + 3] < 128 ? 0 : 1 + Math.min(254, px[i * 4]);
        relief = { w: c.width, h: c.height, lum };
        done();
      };
      img.onerror = () => { ascii = false; done(); };
      img.src = RELIEF_SRC;
    });

    // the glyphs, each set once in the ink, and how their ink falls over the sub-grid
    const atlas = document.createElement('canvas'), sheet = document.createElement('canvas');
    const sctx = sheet.getContext('2d')!;
    let glyphKey = '', sheetKey = '', cellW = 0, cellH = 0;
    let feat = new Float32Array(0), mean = new Float32Array(0), ramp: number[] = [];
    const buildGlyphs = (G: Geo, dpr: number) => {
      const px = tune('px', Math.max(GLYPH_PX[0], Math.min(GLYPH_PX[1], G.cap * 0.022)));
      const key = `${px.toFixed(2)}|${dpr}|${inkRGB}`;
      if (key === glyphKey) return;
      glyphKey = key;
      sheetKey = '';
      const mono = getComputedStyle(document.documentElement).getPropertyValue('--font-code').trim() || 'monospace';
      const a = atlas.getContext('2d', { willReadFrequently: true })!;
      a.font = `${tune('w', 600)} ${px}px ${mono}`;
      cellW = a.measureText('M').width;
      cellH = px * 1.16;
      const gw = Math.ceil(cellW * dpr), gh = Math.ceil(cellH * dpr);
      atlas.width = gw * GLYPHS.length;
      atlas.height = gh;
      a.setTransform(dpr, 0, 0, dpr, 0, 0);
      a.font = `${tune('w', 600)} ${px}px ${mono}`;
      a.textAlign = 'center';
      a.textBaseline = 'middle';
      a.fillStyle = `rgb(${inkRGB})`;
      for (let i = 0; i < GLYPHS.length; i++) a.fillText(GLYPHS[i], (i * gw) / dpr + cellW / 2, cellH / 2);
      // ink per sub-block, scaled so the densest glyph reads as full darkness
      const data = a.getImageData(0, 0, atlas.width, gh).data;
      const S = SUB_X * SUB_Y;
      feat = new Float32Array(GLYPHS.length * S);
      mean = new Float32Array(GLYPHS.length);
      let most = 0;
      for (let i = 0; i < GLYPHS.length; i++) {
        for (let sy = 0; sy < SUB_Y; sy++) for (let sx = 0; sx < SUB_X; sx++) {
          const x0 = Math.floor((sx * gw) / SUB_X), x1 = Math.floor(((sx + 1) * gw) / SUB_X);
          const y0 = Math.floor((sy * gh) / SUB_Y), y1 = Math.floor(((sy + 1) * gh) / SUB_Y);
          let sum = 0;
          for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) sum += data[(y * atlas.width + i * gw + x) * 4 + 3];
          feat[i * S + sy * SUB_X + sx] = sum / (255 * Math.max(1, (x1 - x0) * (y1 - y0)));
        }
        let m = 0;
        for (let k = 0; k < S; k++) m += feat[i * S + k];
        mean[i] = m / S;
        most = Math.max(most, mean[i]);
      }
      for (let k = 0; k < feat.length; k++) feat[k] /= most;
      for (let i = 0; i < mean.length; i++) mean[i] /= most;
      // the ramp: for each step of ink, the closest round glyph not yet taken
      const pool = [...RAMP_FROM].map((ch) => GLYPHS.indexOf(ch)).filter((i) => i > 0);
      ramp = [];
      for (let k = 1; k <= RAMP_STEPS; k++) {
        let pick = -1;
        for (const i of pool) if (!ramp.includes(i) && (pick < 0 || Math.abs(mean[i] - k / RAMP_STEPS) < Math.abs(mean[pick] - k / RAMP_STEPS))) pick = i;
        if (pick >= 0) ramp.push(pick);
      }
      ramp.sort((x, y) => mean[x] - mean[y]);
    };
    // the crest as first laid out, anywhere along the stage
    const crestBase = (G: Geo, x: number) => {
      const st = G.xs[1] - G.xs[0], u = Math.max(0, Math.min(G.xs.length - 1.001, x / st));
      const i = Math.floor(u);
      return G.c0[i] + (G.c0[i + 1] - G.c0[i]) * (u - i);
    };
    // where x falls along the profile (0…1), as crest0 lays it out
    const along = (G: Geo, x: number) => x < G.nameL ? U_L * Math.max(0, x / G.nameL)
      : x < G.nameR ? U_L + (U_R - U_L) * (x - G.nameL) / (G.nameR - G.nameL)
      : U_R + (1 - U_R) * Math.min(1, (x - G.nameR) / (G.end - G.nameR));
    // the rock's darkness as ink (0 bare … 1 densest), `d` stage px under the crest
    const inkAt = (G: Geo, x: number, d: number, fx: number, fy: number, darkInk: boolean) => {
      const R = relief!;
      const c = along(G, x) * (R.w - 1), r = (d * RELIEF_PX) / (G.cap * RELIEF);
      // average over the cell's footprint in the photo, so small screens don't alias
      const nx = Math.max(1, Math.min(4, Math.round(fx))), ny = Math.max(1, Math.min(4, Math.round(fy)));
      let sum = 0, hits = 0;
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const tx = Math.round(c + ((i + 0.5) / nx - 0.5) * fx), ty = Math.round(r + ((j + 0.5) / ny - 0.5) * fy);
        if (tx < 0 || ty < 0 || tx >= R.w || ty >= R.h) continue;
        const v = R.lum[ty * R.w + tx];
        if (!v) continue;
        sum += (v - 1) / 254;
        hits++;
      }
      if (!hits) return 0;
      const L = sum / hits;
      // on paper the shadows carry the ink; on the dark field, the light does
      const t = darkInk ? 1 - L : L;
      // an S-curve: snow and lit faces fall away, shadow and cracks set dense
      const k = tune('k', CONTRAST), pv = darkInk ? tune('pp', PIVOT_PAPER) : tune('pd', PIVOT_DARK);
      const s = (z: number) => 1 / (1 + Math.exp(-k * (z - pv)));
      return clamp01((s(t) - s(0)) / (s(1) - s(0))) * (hits / (nx * ny));
    };
    // the whole range at rest, set once per size and theme
    const buildSheet = (G: Geo, dpr: number) => {
      buildGlyphs(G, dpr);
      const key = `${G.W}x${G.H}|${glyphKey}|${G.base}|${G.nameL}|${G.nameR}`;
      if (key === sheetKey || !relief) return;
      sheetKey = key;
      if (sheet.width !== cvs.width || sheet.height !== cvs.height) { sheet.width = cvs.width; sheet.height = cvs.height; }
      sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sctx.clearRect(0, 0, G.W, G.H);
      sctx.globalAlpha = 1;
      const [ir, ig, ib] = inkRGB.split(',').map(Number);
      const darkInk = 0.2126 * ir + 0.7152 * ig + 0.0722 * ib < 128;
      const S = SUB_X * SUB_Y, t = new Float32Array(S);
      const subW = cellW / SUB_X, subH = cellH / SUB_Y;
      const scaleY = RELIEF_PX / (G.cap * RELIEF);
      const gw = Math.ceil(cellW * dpr), gh = Math.ceil(cellH * dpr);
      const cols = Math.ceil(G.W / cellW), rows = Math.ceil(G.H / cellH);
      for (let col = 0; col < cols; col++) {
        const xc = (col + 0.5) * cellW;
        // photo px per stage px across, where this column falls on the profile
        const scaleX = ((along(G, xc + 1) - along(G, xc - 1)) / 2) * (relief.w - 1);
        const top = Math.floor((crestBase(G, xc) - cellH) / cellH);
        for (let row = Math.max(0, top); row < rows; row++) {
          const y0 = row * cellH;
          // the range dissolves toward the bottom of the stage
          const fade = 1 - smoothstep(0.62, 1, (y0 - G.base) / Math.max(1, G.H - G.base));
          if (fade <= 0) break;
          let any = 0, low = 1, tm = 0;
          for (let sy = 0; sy < SUB_Y; sy++) for (let sx = 0; sx < SUB_X; sx++) {
            const x = col * cellW + (sx + 0.5) * subW, y = y0 + (sy + 0.5) * subH;
            const d = y - crestBase(G, x);
            const v = d < 0 ? 0 : inkAt(G, x, d, subW * scaleX, subH * scaleY, darkInk) * fade;
            t[sy * SUB_X + sx] = v;
            tm += v;
            any = Math.max(any, v);
            low = Math.min(low, v);
          }
          if (any < 0.04) continue;
          tm /= S;
          let best = 0;
          if (any - low > tune('edge', EDGE)) {
            // an edge: the glyph that matches the cell's shape, held to its tone
            let bestErr = Infinity;
            for (let i = 0; i < GLYPHS.length; i++) {
              let e = 0;
              for (let k = 0; k < S; k++) { const q = t[k] - feat[i * S + k]; e += q * q; }
              const dm = tm - mean[i];
              e += dm * dm * S;
              if (e < bestErr) { bestErr = e; best = i; }
            }
          } else {
            // smooth rock: the ramp glyph at or just above the tone
            best = ramp[ramp.length - 1];
            for (const i of ramp) if (mean[i] >= tm) { best = i; break; }
          }
          if (best === 0) continue;
          // the glyph keeps its shape; its opacity settles the tone exactly
          sctx.globalAlpha = tune('ac', 1) ? clamp01(tm / Math.max(0.05, mean[best])) : 1;
          sctx.drawImage(atlas, best * gw, 0, gw, gh, col * cellW, y0, gw / dpr, gh / dpr);
        }
      }
      sctx.globalAlpha = 1;
    };
    // per frame, each column of the sheet follows its own crest: down into the
    // rule as the range flattens, and in from the back on the entrance
    const drawRelief = (G: Geo, f: number, keep: number, te: number, dpr: number) => {
      buildSheet(G, dpr);
      if (!relief || sheetKey === '') return;
      const full = te >= LINES_MS;
      if (full && f === 0) { ctx.drawImage(sheet, 0, 0, G.W, G.H); return; }
      const stagger = (LINES_MS - LINE_MS) / Math.max(1, G.lines);
      const cols = Math.ceil(G.W / cellW);
      for (let col = 0; col < cols; col++) {
        const x0 = col * cellW, xc = x0 + cellW / 2;
        const c = crestBase(G, xc), now = c + (G.lineY - c) * f;
        const top = Math.max(0, (Math.floor(c / cellH) - 1) * cellH);
        let h = G.H - top;
        if (!full) {
          // the k-th contour reaches xc once te passes k·stagger + LINE_MS·xc/W
          const k = (te - (LINE_MS * xc) / G.W) / stagger;
          if (k < 0) continue;
          h = Math.min(h, c - top + (Math.floor(k) + 1) * G.gap);
        }
        if (h <= 0) continue;
        ctx.drawImage(sheet, x0 * dpr, top * dpr, cellW * dpr, h * dpr, x0, now + (top - c) * keep, cellW, h * keep);
      }
    };

    const draw = (te: number) => {
      const G = g!;
      const dpr = cvs.width / G.W;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, G.W, G.H);
      const f = flatAmt(), keep = 1 - f;
      const n = G.xs.length;
      // line k = 0 is the crest (the back); larger k come forward
      const stagger = (LINES_MS - LINE_MS) / Math.max(1, G.lines);
      const drawn = (k: number) => clamp01((te - k * stagger) / LINE_MS);
      const lineAt = (k: number, i: number) => {
        const y0 = G.c0[i];
        const dk = k * G.gap, flat = k ? 1 - Math.exp(-dk / (G.cap * 0.55)) : 0;
        const y = y0 + dk + flat * (G.mean - y0) * 0.85;
        return y + (G.lineY - y) * f;
      };
      if (crest.length !== n) crest = new Float32Array(n);
      for (let i = 0; i < n; i++) crest[i] = lineAt(0, i);

      if (ascii && keep > 0.001) drawRelief(G, f, keep, te, dpr);
      // contours, dissolving toward the bottom and into the rule as it flattens
      if (!ascii && keep > 0.001) {
        const fadeOut = ctx.createLinearGradient(0, G.low, 0, G.H);
        fadeOut.addColorStop(0, `rgba(${inkRGB},1)`);
        fadeOut.addColorStop(1, `rgba(${inkRGB},0)`);
        ctx.strokeStyle = fadeOut;
        ctx.lineWidth = 0.6;
        for (let k = 1; k <= G.lines; k++) {
          const r = drawn(k);
          if (r <= 0) break;
          const fade = Math.max(0, 1 - (k * G.gap) / (G.cap * 0.95));
          if (fade <= 0) break;
          ctx.globalAlpha = 0.22 * fade * keep;
          const until = r * G.W;
          ctx.beginPath();
          let on = false;
          for (let i = 0; i < n; i++) {
            if (G.xs[i] > until) break;
            const y = lineAt(k, i);
            if (y < crest[i] + 1) { on = false; continue; }
            if (!on) { ctx.moveTo(G.xs[i], y); on = true; } else ctx.lineTo(G.xs[i], y);
          }
          ctx.stroke();
        }
      }

      // the crest, one clean line; flat, it becomes the section rule
      const r0 = drawn(0);
      if (r0 > 0) {
        const until = r0 * G.W;
        const stroke = () => {
          ctx.beginPath();
          for (let i = 0; i < n; i++) {
            if (G.xs[i] > until) break;
            if (i) ctx.lineTo(G.xs[i], crest[i]); else ctx.moveTo(G.xs[i], crest[i]);
          }
          ctx.stroke();
        };
        ctx.lineWidth = 1;
        if (!ascii && keep > 0.001) { ctx.strokeStyle = ink; ctx.globalAlpha = 0.45 * keep; stroke(); }
        if (f > 0.001) { ctx.strokeStyle = rule; ctx.globalAlpha = f; stroke(); }
      }
      ctx.globalAlpha = 1;

      // on an ultrawide screen the range ends past the name and fades out,
      // instead of running on to the edge as a flat line
      if (G.W - G.end > 1 && keep > 0.001) {
        const fadeW = (G.end - G.nameR) * 0.35;
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = keep;
        const out = ctx.createLinearGradient(G.end - fadeW, 0, G.end, 0);
        out.addColorStop(0, 'rgba(0,0,0,0)');
        out.addColorStop(1, 'rgba(0,0,0,1)');
        ctx.fillStyle = out;
        ctx.fillRect(G.end - fadeW, 0, fadeW, G.H);
        ctx.fillStyle = '#000';
        ctx.fillRect(G.end, 0, G.W - G.end, G.H);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }
    };

    // the name and the rising words: where they stand, and what the range hides
    const place = (te: number) => {
      const G = g!;
      if (calm) return;
      const enter = easeOut(clamp01((te - NAME_FROM) / NAME_MS));
      const set = easeInOut(phase(SET, p));
      const dName = G.travelName * Math.max(1 - enter, set);
      inn.style.transform = `translate3d(0, ${dName.toFixed(2)}px, 0)`;
      // at rest nothing covers the name; once it moves, the crest is the cut
      const engage = clamp01(dName / (ENGAGE * G.travelName));
      inn.style.clipPath = engage > 0.001
        ? clipAbove(G.nameX, G.nameW, G.nameY, dName, (1 - engage) * G.lift)
        : 'none';

      next.style.transform = `translate3d(0, ${(-G.shift * flatAmt()).toFixed(2)}px, 0)`;
      holdPage();
      const up = easeOut(phase(RISE, p));
      G.pieces.forEach((q) => {
        const d = q.travel * (1 - up);
        q.el.style.transform = `translate3d(0, ${d.toFixed(2)}px, 0)`;
        q.el.style.clipPath = clipAbove(q.x, q.w, q.y, d, 0);
      });
    };

    const frame = (now: number) => {
      raf = 0;
      if (!g || disposed) return;
      const dt = last ? Math.min(64, now - last) : 16;
      last = now;
      const d = target - cur;
      if (d) {
        // the step being played sets the pace
        const seg = Math.min(STEPS - 2, Math.floor(d > 0 ? cur : cur - 1e-6));
        const by = dt / STEP_MS[Math.max(0, seg)];
        cur = Math.abs(d) <= by ? target : cur + Math.sign(d) * by;
        if (cur === target) readyAt = now;
      }
      p = sceneAt(cur);
      const te = now - entryAt;
      draw(te);
      place(te);
      if (cur !== target || te < NAME_FROM + NAME_MS) raf = requestAnimationFrame(frame);
      else last = 0;
    };
    const kick = () => { if (!raf && g && !disposed) raf = requestAnimationFrame(frame); };

    // page scroll ↔ step: each position has its own scroll offset in the track
    const geo = () => {
      const r = T.getBoundingClientRect();
      const span = T.offsetHeight - C.offsetHeight;
      return { top: scrollY + r.top, span, raw: span > 0 ? (-r.top / span) * (STEPS - 1) : -1 };
    };
    const go = (to: number) => {
      const G = geo();
      target = to;
      const top = G.top + (G.span * to) / (STEPS - 1);
      // a no-op scrollTo fires no scroll event, so only flag a real move
      if (Math.abs(scrollY - top) > 0.5) {
        programmatic = true;
        scrollTo({ top, behavior: 'instant' });
      }
      lastRaw = to;
      holdPage(); // in the same frame as the jump, so nothing flickers
      kick();
    };
    const inside = (raw: number) => raw > -0.01 && raw < STEPS - 1 + 0.01;
    const ready = () => cur === target;
    // one step in `dir`; false when that would leave the scene (let the page go)
    const step = (dir: number) => {
      const to = target + dir;
      if (to < 0 || to > STEPS - 1) return false;
      go(to);
      return true;
    };
    // at the end, scrolling on hands control back to the page
    const atEnd = (dir: number) => (target <= 0 && dir < 0) || (target >= STEPS - 1 && dir > 0);
    // a new gesture at either end lets the page go, even while that step plays;
    // the momentum of the gesture that got there never does
    let letGo = false;
    const leaving = (dir: number) => atEnd(dir) && (ready() || letGo);
    // a new gesture is taken mid-step too, once the step is half played
    const canTake = (dir: number) => Math.abs(target + dir - cur) <= 1.5;

    const fromScroll = () => {
      holdPage();
      const G = geo();
      if (programmatic) { programmatic = false; return; }
      const prev = lastRaw;
      lastRaw = G.raw;
      // a flick's momentum that can't be cancelled can carry the page clean
      // through the track in one go: hold it on the step it's on
      const now = performance.now();
      const through = now >= bypass && now - swipedAt < 600 &&
        ((G.raw > STEPS - 1 && prev < STEPS - 1 && target < STEPS - 1) || (G.raw < 0 && prev > 0 && target > 0));
      if (through) { go(target); return; }
      // coming back up into the scene (a swipe can't be stopped before it
      // crosses in): take that as a step back, in the direction of travel,
      // rather than pulling the page down against it
      if (prev > STEPS - 1 && G.raw < STEPS - 1 && target >= STEPS - 1 && now >= bypass) { go(STEPS - 2); return; }
      // past the track the scene rests at its nearest end: jump, no travel
      if (G.raw < 0 || G.raw > STEPS - 1) {
        const end = G.raw < 0 ? 0 : STEPS - 1;
        if (target !== end || cur !== end) { target = cur = end; kick(); }
        return;
      }
      // in-page links scroll straight through; the scene just follows
      if (now < bypass) {
        const to = Math.max(0, Math.min(STEPS - 1, Math.round(G.raw)));
        if (to !== target) { target = to; kick(); }
        return;
      }
      // momentum, scrollbar or keys landing mid-track: hold the page where the
      // scene is — only gestures move it on
      go(target);
    };

    let lastWheel = 0, lastDelta = 0, peak = 0;
    let outside = false;
    const onWheel = (e: WheelEvent) => {
      const now = performance.now();
      const mag = Math.abs(e.deltaY);
      swipedAt = now;
      // the scroll that carried the page in is not a gesture of its own
      if (!inside(geo().raw) || now < bypass) { outside = true; lastWheel = now; lastDelta = mag; return; }
      if (outside) { outside = false; readyAt = now; }
      if (!e.cancelable) { lastWheel = now; lastDelta = mag; return; }
      const dir = Math.sign(e.deltaY);
      if (!dir) return;
      // a new gesture: a pause after the last one, or a fresh flick rising out
      // of a decaying inertia tail
      const fresh = now - lastWheel > GESTURE_GAP_MS || (mag > 20 && mag > lastDelta * 1.6);
      if (fresh) letGo = atEnd(dir);
      if (leaving(dir)) { lastWheel = now; lastDelta = mag; return; }
      e.preventDefault();
      peak = fresh ? mag : Math.max(peak, mag);
      // a wheel kept spinning at strength moves on, one landing at a time
      const sustained = now - readyAt > SUSTAIN_MS && mag >= peak * 0.6 && mag >= lastDelta;
      lastWheel = now;
      lastDelta = mag;
      if (fresh ? canTake(dir) : sustained && ready()) step(dir);
    };
    let touchY = 0, touchDir = 0;
    const onTouchStart = (e: TouchEvent) => { touchY = e.touches[0].clientY; touchDir = 0; letGo = false; };
    const onTouchMove = (e: TouchEvent) => {
      swipedAt = performance.now();
      if (!inside(geo().raw) || performance.now() < bypass) { touchDir = 1; return; }
      const dy = touchY - e.touches[0].clientY;
      const dir = Math.sign(dy);
      if (!dir) return;
      if (!touchDir) letGo = atEnd(dir);
      if (leaving(dir)) return;
      e.preventDefault();
      if (!touchDir && Math.abs(dy) > SWIPE_PX && canTake(dir)) { touchDir = dir; step(dir); }
    };
    const onKey = (e: KeyboardEvent) => {
      if (!inside(geo().raw) || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable)) return;
      const dir = ['ArrowDown', 'PageDown', ' '].includes(e.key) ? (e.shiftKey && e.key === ' ' ? -1 : 1)
        : ['ArrowUp', 'PageUp'].includes(e.key) ? -1 : 0;
      if (!dir || atEnd(dir)) return;
      e.preventDefault();
      if (canTake(dir)) step(dir);
    };
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element).closest<HTMLAnchorElement>('a[href*="#"]');
      if (!link) return;
      bypass = performance.now() + BYPASS_MS;
      if (link.getAttribute('href') !== '#top' || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      target = cur = p = lastRaw = 0;
      last = 0;
      readyAt = performance.now();
      swipedAt = 0;
      lastWheel = lastDelta = peak = 0;
      outside = letGo = false;
      programmatic = true;
      entryAt = calm ? -1e9 : performance.now();
      window.scrollTo({ top: 0, behavior: 'instant' });
      history.replaceState(history.state, '', '#top');
      if (g) { draw(0); place(calm ? 1e9 : 0); kick(); }
      C.focus({ preventScroll: true });
    };

    readColors();
    // the site's theme toggle flips data-theme on <html>: redraw at once, so the
    // theme sweep captures the range in its new colours
    const themeObs = new MutationObserver(() => { readColors(); if (g) draw(performance.now() - entryAt); });
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    let rz = 0;
    const ro = new ResizeObserver(() => { clearTimeout(rz); rz = window.setTimeout(() => { if (g) layout(); }, 80); });

    // the relief comes in with the font, so the entrance never starts half-drawn
    Promise.all([document.fonts.ready, reliefReady]).then(() => {
      if (disposed) return;
      // a reload part-way down the page lands on the nearest step, with no travel
      if (!calm) {
        const raw = geo().raw;
        const start = raw < 0 ? 0 : raw > STEPS - 1 ? STEPS - 1 : Math.round(raw);
        target = cur = start;
        p = sceneAt(start);
        lastRaw = raw;
        outside = !inside(raw);
      }
      layout();
      C.classList.add('is-live');
      if (!calm) entryAt = performance.now();
      ro.observe(S);
      ro.observe(row);
      kick();
    });

    if (!calm) {
      addEventListener('scroll', fromScroll, { passive: true });
      addEventListener('wheel', onWheel, { passive: false });
      addEventListener('touchstart', onTouchStart, { passive: true });
      addEventListener('touchmove', onTouchMove, { passive: false });
      addEventListener('keydown', onKey);
    }
    document.addEventListener('click', onClick, true);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      clearTimeout(rz);
      ro.disconnect();
      themeObs.disconnect();
      removeEventListener('scroll', fromScroll);
      removeEventListener('wheel', onWheel);
      removeEventListener('touchstart', onTouchStart);
      removeEventListener('touchmove', onTouchMove);
      removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick, true);
      C.classList.remove('is-live');
      inn.style.transform = inn.style.clipPath = next.style.transform = '';
      if (page) page.style.transform = '';
      risers.forEach((el) => { el.style.transform = el.style.clipPath = ''; });
      T.style.marginBottom = '';
    };
  }, [mode, picked]);

  const title = (
    <p className="cover-line">
      <span className="line">From ambiguity</span>
      <span className="line">to production.</span>
    </p>
  );
  const side = (
    <div className="side">
      <p className="dek">I’m a senior full-stack software engineer with a product mindset. I work across frontend, backend, infrastructure, data, and AI, connecting technical decisions to real problems and owning the work through production.</p>
      <p className="links">
        <a className="cta" href="#contact">Book a call</a>
        <a className="quiet" href="#projects">See selected work</a>
      </p>
    </div>
  );

  return (
    <div className="cover-track" id="top" ref={track}>
      <section ref={cover} tabIndex={-1} className={`cover is-${mode}`} aria-labelledby="hero-name">
        <noscript dangerouslySetInnerHTML={{ __html: '<style>.cover .masthead .in,.cover .rise,.cover .after{visibility:visible!important}</style>' }} />
        <div className="stage" ref={stage}>
          <canvas className="land" ref={land} aria-hidden="true" />
          <div className="container sky" ref={sky}>
            <h1 className="masthead" id="hero-name" ref={mast} aria-label={`${NAME}, senior software engineer`}>
              <span className="in" ref={inner} aria-hidden="true">
                {[...NAME].map((c, i) => (
                  <span className={`ch${c === ' ' ? ' sp' : ''}`} key={i}>{c === ' ' ? '\u00a0' : c}</span>
                ))}
                <span className="hero-role">Senior Software Engineer</span>
              </span>
            </h1>
            {mode !== 'calm' && (
              <div className={`rise${mode === 'row' ? ' wk-grid' : ''}`} ref={rise}>
                {title}
                {mode === 'row' && side}
              </div>
            )}
          </div>
        </div>

        <div className="after" ref={after}>
          {mode === 'calm' && (
            <div className="container">
              <div className="rise is-flow wk-grid" ref={rise}>{title}{side}</div>
            </div>
          )}
          <div className="container">
            <ul className="areas wk-grid" aria-label="Areas">
              {AREAS.map((a) => (
                <li key={a.title}><b>{a.title}</b><span>{a.sub}</span></li>
              ))}
            </ul>
          </div>
          {/* narrow screens: the words and buttons follow the areas, so the
              cover (name, range, areas) fits the screen */}
          {mode === 'title' && <div className="container side-flow">{side}</div>}
        </div>
      </section>
    </div>
  );
}
