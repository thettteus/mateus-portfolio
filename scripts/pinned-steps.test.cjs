const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(
  fs.readFileSync(require.resolve('../components/ui/pinnedSteps.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
).outputText;

function setup(initialY = 0) {
  const listeners = new Map();
  const scrolls = [];
  const rootClasses = new Set();
  const clock = { now: 1000 };
  const timers = new Map();
  let nextTimer = 1;
  const context = {
    exports: {},
    scrollY: initialY,
    innerHeight: 900,
    performance: { now: () => clock.now },
    setTimeout: (fn) => { const id = nextTimer++; timers.set(id, fn); return id; },
    clearTimeout: (id) => { timers.delete(id); },
    requestAnimationFrame: () => 1,
    cancelAnimationFrame: () => {},
    IntersectionObserver: class { observe() {} disconnect() {} },
    addEventListener: (type, callback) => listeners.set(type, callback),
    removeEventListener: (type) => listeners.delete(type),
    document: {
      addEventListener() {},
      removeEventListener() {},
      documentElement: { classList: { add: (c) => rootClasses.add(c), remove: (c) => rootClasses.delete(c) } },
    },
  };
  context.scrollTo = ({ top }) => { scrolls.push(top); context.scrollY = top; };
  vm.runInNewContext(source, context);
  const track = {
    getBoundingClientRect: () => ({ top: 1000 - context.scrollY, height: 1520 }),
    firstElementChild: { getBoundingClientRect: () => ({ height: 800 }) },
  };
  const api = context.exports.bindPinnedSteps({
    track, count: 4, stepMs: 520, onStep() {}, onFrame() {},
  });
  return {
    api, scrolls, clock,
    get locked() { return rootClasses.has('steps-locked'); },
    runTimers() { const due = [...timers.values()]; timers.clear(); due.forEach((fn) => fn()); },
    scroll(y) { context.scrollY = y; listeners.get('scroll')(); },
    resize() { listeners.get('resize')(); },
    wheel(deltaY, cancelable = true) {
      let prevented = false;
      listeners.get('wheel')({ deltaY, cancelable, preventDefault() { prevented = true; } });
      return prevented;
    },
    touchStart(y) { listeners.get('touchstart')({ touches: [{ clientY: y }] }); },
    touchMove(y, cancelable = true) {
      let prevented = false;
      listeners.get('touchmove')({ touches: [{ clientY: y }], cancelable, preventDefault() { prevented = true; } });
      return prevented;
    },
    touchEnd() { listeners.get('touchend')({ touches: [] }); },
  };
}

test('entering from the hero does not rewind native scrolling', () => {
  const page = setup();
  page.scroll(980);
  page.scroll(1040);
  page.scroll(1270);
  assert.deepEqual(page.scrolls, []);
  assert.equal(page.api.target, 1);
});

test('a wheel that carries the page in is held on the step it entered', () => {
  const page = setup(950);
  page.wheel(100, false); // latched before the scene: Chrome won't let it be cancelled
  page.scroll(1100);
  assert.deepEqual(page.scrolls, [1000]);
  assert.equal(page.api.target, 0);
  assert.equal(page.locked, true);
});

test('a wheel that would cross the whole scene in one go is held too', () => {
  const page = setup(950);
  page.wheel(100, false);
  page.scroll(1800);
  assert.deepEqual(page.scrolls, [1000]);
  assert.equal(page.api.target, 0);
});

test('a wheel carried up into the scene is held on the last step', () => {
  const page = setup(1800);
  page.wheel(-100, false);
  page.scroll(1600);
  assert.deepEqual(page.scrolls, [1720]);
  assert.equal(page.api.target, 3);
  assert.equal(page.locked, true);
});

test('while held, the rest of the wheel never skips a step', () => {
  const page = setup(950);
  page.wheel(100, false);
  page.scroll(1100);
  page.scroll(1000); // the hold's own scroll
  // the same spin goes on, uncancelable, for a long while
  for (let t = 1010; t < 1600; t += 10) { page.clock.now = t; page.wheel(100, false); }
  assert.ok(page.api.target <= 1, `moved to step ${page.api.target}`);
});

test('scrolling back into the scene follows the page instead of skipping a step', () => {
  const page = setup(1800);
  page.scroll(1800);
  page.scroll(1700);
  assert.deepEqual(page.scrolls, []);
  assert.equal(page.api.target, 3);
});

test('resizing within the scene does not reposition the page', () => {
  const page = setup(1300);
  page.resize();
  assert.deepEqual(page.scrolls, []);
  assert.equal(page.api.target, 1);
});

test('explicit step selection uses the actual sticky frame height', () => {
  const page = setup(1000);
  page.api.go(1);
  assert.deepEqual(page.scrolls, [1240]);
  page.scroll(1240);
  assert.equal(page.api.target, 1);
  assert.equal(page.scrolls.length, 1);
});

test('a fresh wheel gesture inside the scene still advances one step', () => {
  const page = setup(1000);
  assert.equal(page.wheel(100), true);
  assert.equal(page.api.target, 1);
  assert.deepEqual(page.scrolls, [1240]);
});

// touch: a swipe begun above the scene scrolls the page natively (the browser
// won't let the rest of it be cancelled) and its fling keeps going after the
// finger lifts, with no touch events at all
function swipeIn(page) {
  page.touchStart(600);
  page.touchMove(550); // begun outside the scene: not taken, the page scrolls
  page.scroll(1100);
  page.scroll(1000); // the hold's own scroll
}

test('a swipe that carries the page in is held on the step it entered', () => {
  const page = setup(950);
  page.touchStart(600);
  page.touchMove(550);
  page.scroll(1100);
  assert.deepEqual(page.scrolls, [1000]);
  assert.equal(page.api.target, 0);
  assert.equal(page.locked, true);
});

test('a fling that carries the page in after the finger lifts is held too', () => {
  const page = setup(950);
  page.touchStart(600);
  page.touchMove(400);
  page.touchEnd();
  page.clock.now += 600; // momentum only from here
  page.scroll(1300);
  assert.deepEqual(page.scrolls, [1000]);
  assert.equal(page.api.target, 0);
  assert.equal(page.locked, true);
});

test('a fling up into the scene is held on the last step', () => {
  const page = setup(1800);
  page.touchStart(400);
  page.touchMove(500);
  page.touchEnd();
  page.clock.now += 300;
  page.scroll(1600);
  assert.deepEqual(page.scrolls, [1720]);
  assert.equal(page.api.target, 3);
});

test('the rest of the swipe that carried the page in never steps', () => {
  const page = setup(950);
  swipeIn(page);
  assert.equal(page.touchMove(100), true);
  assert.equal(page.api.target, 0);
});

test('the hold lasts while the finger is down and lifts after it is up', () => {
  const page = setup(950);
  swipeIn(page);
  page.runTimers();
  assert.equal(page.locked, true);
  page.touchEnd();
  page.runTimers();
  assert.equal(page.locked, false);
});

test('after the hold, the next swipe moves exactly one step', () => {
  const page = setup(950);
  swipeIn(page);
  page.touchEnd();
  page.clock.now += 1000;
  page.touchStart(600);
  assert.equal(page.touchMove(500), true);
  assert.equal(page.api.target, 1);
  page.touchMove(100);
  assert.equal(page.api.target, 1);
});

test('swiping out at the last step lets the page go', () => {
  const page = setup(1720);
  page.touchStart(600);
  assert.equal(page.touchMove(500), false);
  assert.equal(page.api.target, 3);
});
