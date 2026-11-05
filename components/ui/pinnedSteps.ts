// One step per scroll gesture through a pinned track. Shared by the pinned
// scenes (Leverage, Depth): while the track's sticky screen is pinned, each
// gesture (wheel, swipe or key) moves exactly one step, and the page scroll
// follows along underneath, so leaving at either end is natural. The scene
// travels on its own clock (`cur` walks toward `target`); the scene reads
// both on every frame and draws itself.

const GESTURE_GAP_MS = 180; // a pause this long between wheel events starts a new gesture
const SUSTAIN_MS = 300; // a wheel still spinning this long after a landing moves on again
const SWIPE_PX = 40; // touch travel that counts as a swipe
const BYPASS_MS = 2000; // in-page link scrolls pass straight through for this long

export type PinnedStepsOptions = {
  /** the tall element whose sticky child is the pinned screen */
  track: HTMLElement;
  /** number of steps */
  count: number;
  /** how long the scene takes to travel to the next step */
  stepMs: number;
  /** the target step changed; `animate` is false for jumps and the first paint */
  onStep: (step: number, animate: boolean) => void;
  /** every frame while the track is in view, after `cur` has moved */
  onFrame: (now: number, steps: PinnedSteps) => void;
};

export type PinnedSteps = {
  /** the step the scene is heading for */
  readonly target: number;
  /** where the scene is, 0 … count-1, fractional while travelling */
  readonly cur: number;
  /** which way the scene last moved: 1 forward, -1 back */
  readonly travel: number;
  /** walk the scene to a step (a picked step, a resize) */
  go: (to: number) => void;
  destroy: () => void;
};

export function bindPinnedSteps({ track, count: N, stepMs, onStep, onFrame }: PinnedStepsOptions): PinnedSteps {
  let cur = 0, target = 0, last = 0, raf = 0, inView = false;
  let readyAt = 0, bypass = 0, programmatic = false;
  let lastRaw = -1, swipedAt = 0; // where the last scroll left the page; when a wheel/swipe last moved
  let travel = 1; // which way the scene is moving

  // walk the scene toward the target at one step per stepMs
  const frame = (now: number) => {
    const dt = last ? Math.min(64, now - last) : 16;
    last = now;
    const d = target - cur, by = dt / stepMs;
    if (d) travel = Math.sign(d);
    if (d) {
      cur = Math.abs(d) <= by ? target : cur + Math.sign(d) * by;
      if (cur === target) readyAt = now;
    }
    onFrame(now, api);
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
    onStep(to, true);
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
  const atEnd = (dir: number) => (target <= 0 && dir < 0) || (target >= N - 1 && dir > 0);
  // only a new gesture, begun once the end step has landed, lets the page go;
  // the gesture that got there (and its momentum) never does
  let letGo = false;
  const leaving = (dir: number) => atEnd(dir) && letGo;
  // a new gesture is taken mid-step too, once the step is half played
  const canTake = (dir: number) => Math.abs(target + dir - cur) <= 1.5;

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
    // coming back up into the scene (a swipe can't be stopped before it
    // crosses in): take that as a step back, in the direction of travel,
    // rather than pulling the page down against it
    if (prev > N - 1 && g.raw < N - 1 && target >= N - 1 && now >= bypass) { go(N - 2); return; }
    // outside the track the scene rests at its nearest end: jump, no travel
    if (g.raw < 0 || g.raw > N - 1) {
      const end = g.raw < 0 ? 0 : N - 1;
      if (target !== end || cur !== end) { target = cur = end; onStep(end, false); onFrame(now, api); }
      return;
    }
    // in-page links scroll straight through; the scene just follows
    if (performance.now() < bypass) {
      const to = Math.max(0, Math.min(N - 1, Math.round(g.raw)));
      if (to !== target) { target = to; onStep(to, true); wake(); }
      return;
    }
    // momentum, scrollbar or keys landing mid-track: hold the page where
    // the scene is — only gestures move it on
    go(target);
  };

  let lastWheel = 0;
  let lastDelta = 0;
  let peak = 0; // strongest wheel event of the current gesture
  let outside = true;
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
    if (outside) { outside = false; readyAt = now; }
    // momentum that can no longer be cancelled is still the scroll that
    // carried the page in: the hold in fromScroll keeps the page, it never steps
    if (!e.cancelable) { lastWheel = now; lastDelta = mag; return; }
    const dir = Math.sign(e.deltaY);
    if (!dir) return;
    // a new gesture: a pause after the last one, or a fresh flick rising out
    // of a decaying inertia tail
    const fresh = now - lastWheel > GESTURE_GAP_MS || (mag > 20 && mag > lastDelta * 1.6);
    if (fresh) letGo = atEnd(dir) && ready();
    if (leaving(dir)) { lastWheel = now; lastDelta = mag; return; }
    e.preventDefault();
    peak = fresh ? mag : Math.max(peak, mag);
    // a wheel kept spinning at strength moves on, one landing at a time;
    // a trackpad's fading inertia tail never counts
    const sustained = now - readyAt > SUSTAIN_MS && mag >= peak * 0.6 && mag >= lastDelta;
    lastWheel = now;
    lastDelta = mag;
    if (fresh ? canTake(dir) : sustained && ready()) step(dir);
  };
  let touchY = 0;
  let touchDir = 0;
  const onTouchStart = (e: TouchEvent) => { touchY = e.touches[0].clientY; touchDir = 0; letGo = false; };
  const onTouchMove = (e: TouchEvent) => {
    swipedAt = performance.now();
    // a swipe that carried the page in only lands; the next one moves on
    if (!inside(geo().raw) || performance.now() < bypass) { touchDir = 1; return; }
    const dy = touchY - e.touches[0].clientY;
    const dir = Math.sign(dy);
    if (!dir) return;
    if (!touchDir) letGo = atEnd(dir) && ready();
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
    if (!dir || (atEnd(dir) && ready())) return;
    e.preventDefault();
    if (canTake(dir)) step(dir);
  };
  const onClick = (e: MouseEvent) => {
    if ((e.target as Element).closest?.('a[href*="#"]')) bypass = performance.now() + BYPASS_MS;
  };

  const io = new IntersectionObserver((entries) => {
    inView = entries.some((e) => e.isIntersecting);
    if (inView) wake();
  });
  io.observe(track);
  const onResize = () => { if (inside(geo().raw)) go(target); };
  addEventListener('scroll', fromScroll, { passive: true });
  addEventListener('wheel', onWheel, { passive: false });
  addEventListener('touchstart', onTouchStart, { passive: true });
  addEventListener('touchmove', onTouchMove, { passive: false });
  addEventListener('keydown', onKey);
  document.addEventListener('click', onClick, true);
  addEventListener('resize', onResize);

  const api: PinnedSteps = {
    get target() { return target; },
    get cur() { return cur; },
    get travel() { return travel; },
    go,
    destroy: () => {
      io.disconnect();
      removeEventListener('scroll', fromScroll);
      removeEventListener('wheel', onWheel);
      removeEventListener('touchstart', onTouchStart);
      removeEventListener('touchmove', onTouchMove);
      removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick, true);
      removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
    },
  };

  const start = Math.max(0, Math.min(N - 1, Math.round(geo().raw)));
  target = cur = start;
  onStep(start, false);
  onFrame(performance.now(), api);
  return api;
}
