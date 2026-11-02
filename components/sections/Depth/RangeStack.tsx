'use client';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { IsoLayer } from '@/components/ui/generative/IsoLayer';
import { type LineArtVariant } from '@/components/ui/generative/LineArt';

export type RangeLayer = {
  ix: string;
  title: string;
  items: string[];
  art: LineArtVariant;
};

// stack geometry, in units of a 300-wide tile face (scaled to the real tile)
const S = 26; // spacing in the closed stack
const OPEN = 172; // gap that reveals a face
const OPEN_TOP = 44; // gap under the top plate when it is selected
const LIFT = 12; // the selected plate rises a little
const DROP = 140; // how far plates fall from on first assemble
const TILE_RATIO = 150 / 280; // IsoLayer viewBox height / width

const STEP_SVH = 30; // page length per step, so the pinned screen has room to scroll through
const STEP_MS = 510; // how long one plate takes to travel to the next layer
const GESTURE_GAP_MS = 180; // a pause this long between wheel events starts a new gesture
const SUSTAIN_MS = 300; // a wheel still spinning this long after a landing moves on again
const SWIPE_PX = 40; // touch travel that counts as a swipe
const BYPASS_MS = 2000; // in-page link scrolls pass straight through for this long

const TEXT_MS = 360; // how long a label takes to hand over once its plate lands

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
// glide out, ease through the middle, then a quick final push into place.
// Two Hermite segments; speeds are relative to an even, linear glide.
const SNAP_AT = 0.7; // share of the travel spent gliding before the push
const SNAP_FROM = 0.55; // how far the plates have got when the push starts
const V_START = 1.3;
const V_MID = 0.5; // slowest point, just before the push
const V_END = 2.8; // speed as the plate lands
const hermite = (x: number, p0: number, p1: number, m0: number, m1: number) => {
  const x2 = x * x;
  const x3 = x2 * x;
  return (2 * x3 - 3 * x2 + 1) * p0 + (x3 - 2 * x2 + x) * m0 + (-2 * x3 + 3 * x2) * p1 + (x3 - x2) * m1;
};
const ease = (t: number) =>
  t < SNAP_AT
    ? hermite(t / SNAP_AT, 0, SNAP_FROM, V_START * SNAP_AT, V_MID * SNAP_AT)
    : hermite((t - SNAP_AT) / (1 - SNAP_AT), SNAP_FROM, 1, V_MID * (1 - SNAP_AT), V_END * (1 - SNAP_AT));

/**
 * RangeStack — the range layers as a pinned isometric stack. While it's pinned,
 * each scroll gesture (wheel, swipe or key) moves exactly one layer: the plates
 * glide there on their own clock, and the label hands over once they land.
 * The page scroll follows along underneath, so leaving at either end is natural.
 */
// `head` is the section heading: it rides in the pinned screen, so it stays in
// view for the whole walk through the stack
export default function RangeStack({ layers, head }: { layers: RangeLayer[]; head?: ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const plates = useRef<(HTMLDivElement | null)[]>([]);
  const labels = useRef<(HTMLLIElement | null)[]>([]);
  const descs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);
  // the plates are in place from the start: the hero's opening is the only entrance
  const assembled = true;
  const settled = true;
  const [tileW, setTileW] = useState(0);
  const n = layers.length;
  // positions run 0 (first layer open) … n-1, then n (closed at the end)

  // live values the frame loop reads without re-rendering
  const live = useRef({ w: 0, h: 0, target: 0, cur: 0, dir: 1, assembled: true, raf: 0, last: 0, bypass: 0, programmatic: false, readyAt: 0, descH: [] as number[],
    // label handover: `open` per label, tweened from `from` toward `label`
    label: 0, open: [1] as number[], from: [] as number[], textStart: 0, textRaf: 0 });

  // stack offsets with layer `a` open (a = -1 or a = n → closed)
  const ys = useCallback((a: number) => {
    if (a >= n) a = -1;
    const { w, h } = live.current;
    const tileH = w * TILE_RATIO;
    const u = (w * 0.8) / 300; // IsoLayer's face spans 80% of the tile width
    const gap = a > 0 ? OPEN : a === 0 ? OPEN_TOP : 0;
    const top = (h - ((n - 1) * S * u + tileH + gap * u)) / 2;
    return Array.from({ length: n }, (_, i) => {
      let y = top + i * S * u;
      if (a > 0 && i >= a) y += OPEN * u;
      if (a === 0 && i >= 1) y += OPEN_TOP * u;
      if (i === a) y -= LIFT * u;
      return y;
    });
  }, [n]);

  // write each label's openness (height, colour, pill fade)
  const paintLabels = useCallback(() => {
    const L = live.current;
    labels.current.forEach((el, i) => {
      const open = L.open[i] ?? 0;
      el?.style.setProperty('--open', open.toFixed(3));
      const d = descs.current[i];
      if (d) d.style.height = `${(open * (L.descH[i] ?? 0)).toFixed(2)}px`;
    });
  }, []);

  // the leaving label folds as the next one unfolds, on its own clock
  const textTick = useCallback((now: number) => {
    const L = live.current;
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const k = calm ? 1 : clamp((now - L.textStart) / TEXT_MS, 0, 1);
    const e = easeInOut(k);
    for (let i = 0; i < n; i++) {
      const from = L.from[i] ?? 0;
      L.open[i] = from + ((i === L.label ? 1 : 0) - from) * e;
    }
    paintLabels();
    L.textRaf = k < 1 ? requestAnimationFrame(textTick) : 0;
  }, [n, paintLabels]);
  const handOver = useCallback((label: number) => {
    const L = live.current;
    if (label === L.label) return;
    L.label = label;
    L.from = Array.from({ length: n }, (_, i) => L.open[i] ?? 0);
    L.textStart = performance.now();
    if (!L.textRaf) L.textRaf = requestAnimationFrame(textTick);
  }, [n, textTick]);

  // write plate transforms for a fractional position along the stack
  const paint = useCallback((pos: number) => {
    const L = live.current;
    const u = (L.w * 0.8) / 300;
    const lo = Math.floor(pos);
    const hi = Math.min(n, lo + 1);
    const raw = pos - lo;
    // the push lands at the far end of the travel, whichever way it runs
    const t = L.dir > 0 ? ease(raw) : 1 - ease(1 - raw);
    let at: number[];
    if (!L.assembled) {
      at = ys(-1).map((y) => y - DROP * u);
    } else {
      const a = ys(lo);
      const b = ys(hi);
      at = a.map((y, i) => y + (b[i] - y) * t);
    }
    plates.current.forEach((el, i) => {
      if (el) el.style.transform = `translate(-50%, ${at[i].toFixed(2)}px)`;
    });
    // the label and active state (lit plate, motif replay) hand over only
    // once the plate has landed
    const landed = L.dir > 0 ? Math.floor(pos + 1e-6) : Math.ceil(pos - 1e-6);
    const next = landed >= n ? -1 : clamp(landed, -1, n - 1);
    setActive(next);
    handOver(next);
  }, [n, ys, handOver]);

  // walk the drawn position toward the target at one step per STEP_MS
  const tick = useCallback((now: number) => {
    const L = live.current;
    const dt = L.last ? Math.min(50, now - L.last) : 1000 / 60;
    L.last = now;
    const d = L.target - L.cur;
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const stepBy = dt / STEP_MS;
    L.cur = calm || Math.abs(d) <= stepBy ? L.target : L.cur + Math.sign(d) * stepBy;
    paint(L.cur);
    if (L.cur === L.target) L.readyAt = now;
    L.raf = L.cur === L.target ? 0 : requestAnimationFrame(tick);
  }, [paint]);
  const kick = useCallback(() => {
    if (live.current.raf) return;
    live.current.last = 0;
    live.current.raf = requestAnimationFrame(tick);
  }, [tick]);

  // size the tile to the stage so the open stack always fits
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      const w = Math.max(0, Math.min(width * 0.92, height / 1.42, 400));
      Object.assign(live.current, { w, h: height });
      setTileW(w);
      paint(live.current.cur);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [paint]);

  // remember each label's natural height so it can unfold to exactly that
  useEffect(() => {
    const ro = new ResizeObserver((entries) => {
      entries.forEach((e) => {
        const i = descs.current.findIndex((d) => d?.firstElementChild === e.target);
        if (i >= 0) live.current.descH[i] = (e.target as HTMLElement).offsetHeight;
      });
      paintLabels();
    });
    descs.current.forEach((d) => d?.firstElementChild && ro.observe(d.firstElementChild));
    return () => ro.disconnect();
  }, [paintLabels]);

  // page scroll ↔ stack position: each position has its own scroll offset
  // inside the pinned track
  const geo = useCallback(() => {
    const el = track.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const span = r.height - innerHeight;
    return { top: scrollY + r.top, span, raw: span > 0 ? (-r.top / span) * n : -1 };
  }, [n]);
  const go = useCallback((to: number) => {
    const L = live.current;
    const g = geo();
    if (!g) return;
    if (to !== L.target) L.dir = Math.sign(to - L.cur) || 1;
    L.target = to;
    const top = g.top + (g.span * to) / n;
    // a no-op scrollTo fires no scroll event, so only flag a real move
    if (Math.abs(scrollY - top) > 0.5) {
      L.programmatic = true;
      scrollTo({ top, behavior: 'instant' });
    }
    kick();
  }, [geo, kick, n]);

  useEffect(() => {
    const L = live.current;
    const inside = (raw: number) => raw > -0.01 && raw < n + 0.01;
    const ready = () => L.cur === L.target;
    // one step in `dir`; false when that would leave the stack (let the page go)
    const step = (dir: number) => {
      const to = L.target + dir;
      if (to < 0 || to > n) return false;
      go(to);
      return true;
    };
    // at either closed end, scrolling outward hands control back to the page
    const atEnd = (dir: number) => (L.target <= 0 && dir < 0) || (L.target >= n && dir > 0);
    // a new gesture at either end lets the page go, even while that step plays;
    // the momentum of the gesture that got there never does
    let letGo = false;
    const leaving = (dir: number) => atEnd(dir) && (ready() || letGo);
    // a new gesture is taken mid-step too, once the step is half played
    const canTake = (dir: number) => Math.abs(L.target + dir - L.cur) <= 1.5;

    let prevRaw = -1;
    const fromScroll = () => {
      const g = geo();
      if (!g) return;
      if (L.programmatic) { L.programmatic = false; prevRaw = g.raw; return; }
      const prev = prevRaw;
      prevRaw = g.raw;
      // outside the track the stack rests at its nearest end: jump, no travel
      if (g.raw < 0 || g.raw > n) {
        const end = g.raw < 0 ? 0 : n;
        if (L.target !== end || L.cur !== end) { L.target = end; L.cur = end; paint(end); }
        return;
      }
      // coming back up into the stack (a swipe can't be stopped before it
      // crosses in): take that as a step back, in the direction of travel,
      // rather than pulling the page down against it
      if (prev > n && g.raw < n && L.target >= n && performance.now() >= L.bypass) { go(n - 1); return; }
      // in-page links scroll straight through; the stack just follows
      if (performance.now() < L.bypass) {
        const to = clamp(Math.round(g.raw), 0, n);
        if (to !== L.target) { L.dir = Math.sign(to - L.cur) || 1; L.target = to; kick(); }
        return;
      }
      // momentum, scrollbar or keys landing mid-track: hold the page where
      // the stack is — only gestures move it on
      go(L.target);
    };

    let lastWheel = 0;
    let lastDelta = 0;
    let peak = 0; // strongest wheel event of the current gesture
    let outside = true; // the page was last outside the track
    let entering = false; // still in the gesture that carried the page in
    const onWheel = (e: WheelEvent) => {
      const g = geo();
      if (!g || !inside(g.raw) || performance.now() < L.bypass) {
        outside = true;
        lastWheel = performance.now();
        lastDelta = Math.abs(e.deltaY);
        return;
      }
      // the scroll that carried the page in only lands on the first card; it
      // never moves the stack on by itself
      if (outside) { outside = false; entering = true; }
      const dir = Math.sign(e.deltaY);
      if (!dir) return;
      const now = performance.now();
      const mag = Math.abs(e.deltaY);
      // a new gesture: a pause after the last one, or a fresh flick rising out
      // of a decaying inertia tail
      const fresh = now - lastWheel > GESTURE_GAP_MS || (mag > 20 && mag > lastDelta * 1.6);
      if (fresh) { letGo = atEnd(dir); entering = false; }
      if (leaving(dir)) { lastWheel = now; lastDelta = mag; return; }
      e.preventDefault();
      peak = fresh ? mag : Math.max(peak, mag);
      // a wheel kept spinning at strength also moves on, one landing at a time.
      // A trackpad flick ramps up, peaks, then its inertia only ever fades —
      // so a fading or weak tail never counts, however long it runs.
      const sustained = now - L.readyAt > SUSTAIN_MS && mag >= peak * 0.6 && mag >= lastDelta;
      lastWheel = now;
      lastDelta = mag;
      if (fresh ? canTake(dir) : sustained && !entering && ready()) step(dir);
    };
    let touchY = 0;
    let touchDir = 0;
    const onTouchStart = (e: TouchEvent) => { touchY = e.touches[0].clientY; touchDir = 0; letGo = false; };
    const onTouchMove = (e: TouchEvent) => {
      const g = geo();
      if (!g || !inside(g.raw) || performance.now() < L.bypass) return;
      const dy = touchY - e.touches[0].clientY;
      const dir = Math.sign(dy);
      if (!dir) return;
      if (!touchDir) letGo = atEnd(dir);
      if (leaving(dir)) return;
      e.preventDefault();
      if (!touchDir && Math.abs(dy) > SWIPE_PX && canTake(dir)) { touchDir = dir; step(dir); }
    };
    const onKey = (e: KeyboardEvent) => {
      const g = geo();
      if (!g || !inside(g.raw) || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable)) return;
      const dir = ['ArrowDown', 'PageDown', ' '].includes(e.key) ? (e.shiftKey && e.key === ' ' ? -1 : 1)
        : ['ArrowUp', 'PageUp'].includes(e.key) ? -1 : 0;
      if (!dir || atEnd(dir)) return;
      e.preventDefault();
      if (canTake(dir)) step(dir);
    };
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element).closest?.('a[href*="#"]')) L.bypass = performance.now() + BYPASS_MS;
    };

    addEventListener('scroll', fromScroll, { passive: true });
    addEventListener('wheel', onWheel, { passive: false });
    addEventListener('touchstart', onTouchStart, { passive: true });
    addEventListener('touchmove', onTouchMove, { passive: false });
    addEventListener('keydown', onKey);
    document.addEventListener('click', onClick, true);
    const g = geo();
    const start = g ? clamp(Math.round(g.raw), 0, n) : 0;
    L.target = start;
    L.cur = start;
    paint(start);
    return () => {
      removeEventListener('scroll', fromScroll);
      removeEventListener('wheel', onWheel);
      removeEventListener('touchstart', onTouchStart);
      removeEventListener('touchmove', onTouchMove);
      removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick, true);
      cancelAnimationFrame(L.raf);
      cancelAnimationFrame(L.textRaf);
      L.textRaf = 0;
      L.raf = 0;
    };
  }, [n, geo, go, kick, paint]);

  // replay the active plate's motif draw-in each time it opens
  useEffect(() => {
    const el = plates.current[active];
    if (!el) return;
    el.classList.remove('is-drawn');
    void el.offsetWidth; // force reflow so the browser registers the removal
    el.classList.add('is-drawn');
  }, [active]);

  // picking a layer walks the stack there, one plate after another
  const pick = useCallback((i: number) => { go(i); }, [go]);

  return (
    <div className="range-track" ref={track} style={{ height: `calc(100svh + ${n * STEP_SVH}svh)` }}>
      <div className="range-pin">
        {head && <div className="range-head">{head}</div>}
        <div className={`range-stage${settled ? ' is-settled' : ''}`} ref={stage} aria-hidden="true">
          {layers.map(({ ix, art }, i) => (
            <div
              key={ix}
              ref={(el) => { plates.current[i] = el; }}
              className={['iso-plate', assembled && 'is-in', i === active && 'is-active'].filter(Boolean).join(' ')}
              style={{ width: tileW, zIndex: n - i, '--drop-delay': `${(n - 1 - i) * 66}ms` } as CSSProperties}
              onClick={() => pick(i)}
            >
              <IsoLayer variant={art} />
            </div>
          ))}
        </div>

        <ol className="range-list">
          {layers.map(({ ix, title, items }, i) => (
            <li
              className={`range-item${i === active ? ' is-active' : ''}`}
              key={ix}
              ref={(el) => { labels.current[i] = el; }}
            >
              <h3>
                <button type="button" aria-pressed={i === active} onClick={() => pick(i)}>
                  <span className="db-ix">{ix}</span>
                  <span className="db-title">{title}</span>
                </button>
              </h3>
              <div className="range-desc" ref={(el) => { descs.current[i] = el; }}>
                <div>
                  <ul className="db-items">
                    {items.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
