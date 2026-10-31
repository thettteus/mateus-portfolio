'use client';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
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

const STEP_SVH = 60; // scroll length per layer
const HOLD = 0.35; // share of each step a layer rests fully open before moving on
const FOLLOW = 0.12; // how quickly the stack catches up with the scroll (0–1 per frame)
const MAX_SPEED = 1.1; // steps per second — a fast scroll can't rush the plates past this
const LEAD = 0.5; // how many steps the scroll may run ahead of the plates before it's held
const BYPASS_MS = 2000; // programmatic scrolls (anchor links, picks) aren't held for this long

const TEXT_MS = 600; // how long a label takes to hand over once its plate lands

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
 * RangeStack — the range layers as a pinned isometric stack. The scroll drives
 * the stack, capped to its own pace: each layer rests open for a beat, then the
 * plates glide to open the next one, however fast the page is scrolled. The label stays expanded while the plates travel and
 * hands over to the next layer once its plate has landed.
 */
export default function RangeStack({ layers }: { layers: RangeLayer[] }) {
  const track = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const plates = useRef<(HTMLDivElement | null)[]>([]);
  const labels = useRef<(HTMLLIElement | null)[]>([]);
  const descs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(-1);
  const [assembled, setAssembled] = useState(false);
  const [settled, setSettled] = useState(false);
  const [tileW, setTileW] = useState(0);
  const n = layers.length;
  const steps = n + 2; // closed, one step per layer, then closed again

  // live values the frame loop reads without re-rendering
  const live = useRef({ w: 0, h: 0, target: -1, cur: -1, assembled: false, raf: 0, last: 0, bypass: 0, descH: [] as number[],
    // label handover: `open` per label, tweened from `from` toward `label`
    label: -1, open: [] as number[], from: [] as number[], textStart: 0, textRaf: 0 });

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
    const raw = clamp((pos - lo - HOLD) / (1 - HOLD), 0, 1);
    const t = ease(raw);
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
    const landed = raw >= 0.999 ? lo + 1 : lo;
    const next = landed >= n ? -1 : clamp(landed, -1, n - 1);
    setActive(next);
    handOver(next);
  }, [n, ys, handOver]);

  // ease the drawn position toward the scroll position, one frame at a time,
  // never faster than MAX_SPEED so every glide and rest keeps its timing
  const tick = useCallback((now: number) => {
    const L = live.current;
    const dt = L.last ? Math.min(0.05, (now - L.last) / 1000) : 1 / 60;
    L.last = now;
    const d = L.target - L.cur;
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cap = MAX_SPEED * dt;
    L.cur = calm || Math.abs(d) < 0.001 ? L.target : L.cur + clamp(d * FOLLOW, -cap, cap);
    paint(L.cur);
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

  // drop the plates in, foundation first, once the stage is in view
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        requestAnimationFrame(() => requestAnimationFrame(() => {
          live.current.assembled = true;
          live.current.cur = live.current.target;
          setAssembled(true);
          paint(live.current.cur);
        }));
      }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [paint]);

  // the staggered drop (a CSS transition) only applies to the first assemble;
  // after that the frame loop moves the plates
  useEffect(() => {
    if (!assembled) return;
    const t = setTimeout(() => setSettled(true), (n - 1) * 110 + 950);
    return () => clearTimeout(t);
  }, [assembled, n]);

  // scroll progress through the track sets where the stack should be
  useEffect(() => {
    const L = live.current;
    const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
    // unclamped stack position for the current scroll (< -1 before, > n after)
    const rawPos = () => {
      const el = track.current;
      if (!el) return -2;
      const r = el.getBoundingClientRect();
      const span = r.height - innerHeight;
      return span > 0 ? (-r.top / span) * steps - 1 : -2;
    };
    const scrollFor = (pos: number) => {
      const el = track.current!;
      const span = el.offsetHeight - innerHeight;
      return scrollY + el.getBoundingClientRect().top + span * ((pos + 1) / steps);
    };
    // a hard scroll can't outrun the plates: while the section is pinned and
    // the plates are LEAD behind, further scrolling that way is held
    const held = (dir: number) => {
      if (calm() || performance.now() < L.bypass) return false;
      const raw = rawPos();
      if (raw < -1 || raw > n + 1) return false;
      const lead = L.target - L.cur;
      return dir > 0 ? L.cur < n && lead > LEAD : dir < 0 ? L.cur > -1 && lead < -LEAD : false;
    };

    const fromScroll = () => {
      const raw = rawPos();
      // safety net for momentum/touch/keys that slipped past the input guards
      if (!calm() && performance.now() >= L.bypass && raw >= -1 && raw <= n + 1) {
        const lim = LEAD + 0.25;
        if (raw > L.cur + lim && L.cur < n) {
          scrollTo({ top: scrollFor(L.cur + lim), behavior: 'instant' });
          L.target = L.cur + lim;
          kick();
          return;
        }
        if (raw < L.cur - lim && L.cur > -1) {
          scrollTo({ top: scrollFor(L.cur - lim), behavior: 'instant' });
          L.target = L.cur - lim;
          kick();
          return;
        }
      }
      L.target = clamp(raw, -1, n);
      kick();
    };
    const onWheel = (e: WheelEvent) => {
      if (held(Math.sign(e.deltaY))) e.preventDefault();
    };
    let touchY = 0;
    const onTouchStart = (e: TouchEvent) => { touchY = e.touches[0].clientY; };
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0].clientY;
      if (held(Math.sign(touchY - y))) e.preventDefault();
      touchY = y;
    };
    // in-page links jump straight through
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element).closest?.('a[href*="#"]')) L.bypass = performance.now() + BYPASS_MS;
    };

    addEventListener('scroll', fromScroll, { passive: true });
    addEventListener('resize', fromScroll);
    addEventListener('wheel', onWheel, { passive: false });
    addEventListener('touchstart', onTouchStart, { passive: true });
    addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('click', onClick, true);
    L.target = clamp(rawPos(), -1, n);
    L.cur = L.target;
    paint(L.cur);
    return () => {
      removeEventListener('scroll', fromScroll);
      removeEventListener('resize', fromScroll);
      removeEventListener('wheel', onWheel);
      removeEventListener('touchstart', onTouchStart);
      removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('click', onClick, true);
      cancelAnimationFrame(L.raf);
      cancelAnimationFrame(L.textRaf);
      L.textRaf = 0;
      L.raf = 0;
    };
  }, [n, steps, kick, paint]);

  // replay the active plate's motif draw-in each time it opens
  useEffect(() => {
    const el = plates.current[active];
    if (!el) return;
    el.classList.remove('is-drawn');
    void el.offsetWidth; // force reflow so the browser registers the removal
    el.classList.add('is-drawn');
  }, [active]);

  // picking a layer scrolls to the middle of its resting beat
  const pick = useCallback((i: number) => {
    const el = track.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const span = r.height - innerHeight;
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    live.current.bypass = performance.now() + BYPASS_MS;
    scrollTo({ top: scrollY + r.top + span * ((i + 1 + HOLD / 2) / steps), behavior: calm ? 'auto' : 'smooth' });
  }, [steps]);

  return (
    <div className="range-track" ref={track} style={{ height: `calc(100svh + ${steps * STEP_SVH}svh)` }}>
      <div className="range-pin">
        <div className={`range-stage${settled ? ' is-settled' : ''}`} ref={stage} aria-hidden="true">
          {layers.map(({ ix, art }, i) => (
            <div
              key={ix}
              ref={(el) => { plates.current[i] = el; }}
              className={['iso-plate', assembled && 'is-in', i === active && 'is-active'].filter(Boolean).join(' ')}
              style={{ width: tileW, zIndex: n - i, '--drop-delay': `${(n - 1 - i) * 110}ms` } as CSSProperties}
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
