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
const CARRY_MS = 150; // a scroll this soon after a wheel event is that wheel's doing
const UNLOCK_MS = 700; // longer than Chrome keeps a wheel sequence latched (~500ms)

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
  let travel = 1; // which way the scene is moving
  let lastRaw = -1; // where the last scroll left the page, in steps
  let lastY = 0; // and in pixels

  // Chrome lets only the first wheel event of a sequence be cancelled: a spin
  // or a flick that began before the scene keeps scrolling the page natively
  // and would carry it straight through. When one carries the page in, the
  // page is locked (no user scrolling, see html.steps-locked) on the step it
  // came in on, and the rest of that wheel is read as gestures like any other.
  // Pinned, the frame looks the same anywhere in the track, so taking back the
  // overshoot never shows. The lock lifts once the wheel has been still.
  const root = document.documentElement;
  let locked = false, unlockTimer = 0;
  const unlock = () => {
    clearTimeout(unlockTimer);
    if (locked) { locked = false; root.classList.remove('steps-locked'); }
  };
  const holdLock = () => { clearTimeout(unlockTimer); unlockTimer = setTimeout(unlock, UNLOCK_MS) as unknown as number; };
  const lock = () => {
    if (!locked) { locked = true; root.classList.add('steps-locked'); }
    holdLock();
  };

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
    // The sticky frame uses svh; innerHeight changes when mobile browser
    // chrome expands/collapses and need not match the frame's actual height.
    const pinHeight = track.firstElementChild?.getBoundingClientRect().height ?? innerHeight;
    const span = r.height - pinHeight;
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
    const prev = lastRaw;
    const moved = Math.abs(scrollY - lastY);
    lastRaw = g.raw;
    lastY = scrollY;
    if (programmatic) { programmatic = false; return; }
    const now = performance.now();
    // a wheel begun outside carried the page in (or clean across): hold it on
    // the step it entered by. A jump of more than a screen in one scroll is
    // not a wheel's doing (an anchor, a restored position, another scene).
    const carriedIn = now - lastWheel < CARRY_MS && now >= bypass && moved < innerHeight && !inside(prev) &&
      (inside(g.raw) || (prev < 0 && g.raw > N - 1) || (prev > N - 1 && g.raw < 0));
    if (carriedIn) {
      lock();
      outside = false;
      readyAt = now;
      go(prev < 0 ? 0 : N - 1);
      return;
    }
    // outside the track the scene rests at its nearest end: jump, no travel
    if (g.raw < 0 || g.raw > N - 1) {
      const end = g.raw < 0 ? 0 : N - 1;
      if (target !== end || cur !== end) { target = cur = end; onStep(end, false); onFrame(now, api); }
      return;
    }
    // Native scrolling (including an entering flick, its momentum, anchor
    // navigation and the scrollbar) owns the page position. Follow it without
    // calling go(): scrolling back to a step here fights the browser's scroll
    // and produces a visible snap at the boundary of the previous section.
    const to = Math.max(0, Math.min(N - 1, Math.round(g.raw)));
    if (to !== target) { target = to; onStep(to, true); wake(); }
  };

  let lastWheel = 0;
  let lastDelta = 0;
  let peak = 0; // strongest wheel event of the current gesture
  let outside = true;
  const onWheel = (e: WheelEvent) => {
    const now = performance.now();
    const mag = Math.abs(e.deltaY);
    // the scroll that carried the page in is not a gesture of its own:
    // keep timing it outside, and count arriving as a landing
    if (!inside(geo().raw) || now < bypass) {
      outside = true;
      lastWheel = now;
      lastDelta = mag;
      return;
    }
    if (outside) { outside = false; readyAt = now; }
    if (locked) holdLock();
    // An uncancelable event scrolls the page natively and fromScroll catches
    // it coming in; while the page is locked it can't scroll, so it is read
    // as part of a gesture like any other.
    if (!e.cancelable && !locked) { lastWheel = now; lastDelta = mag; return; }
    const dir = Math.sign(e.deltaY);
    if (!dir) return;
    // a new gesture: a pause after the last one, or a fresh flick rising out
    // of a decaying inertia tail
    const fresh = now - lastWheel > GESTURE_GAP_MS || (mag > 20 && mag > lastDelta * 1.6);
    if (fresh) letGo = atEnd(dir) && ready();
    if (leaving(dir)) { unlock(); lastWheel = now; lastDelta = mag; return; }
    if (e.cancelable) e.preventDefault();
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
  const onResize = () => { fromScroll(); };
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
      unlock();
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

  lastRaw = geo().raw;
  lastY = scrollY;
  const start = Math.max(0, Math.min(N - 1, Math.round(lastRaw)));
  target = cur = start;
  onStep(start, false);
  onFrame(performance.now(), api);
  return api;
}
