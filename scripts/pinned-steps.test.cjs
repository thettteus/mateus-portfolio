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
  const context = {
    exports: {},
    scrollY: initialY,
    innerHeight: 900,
    performance: { now: () => clock.now },
    setTimeout: () => 1,
    clearTimeout: () => {},
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
    scroll(y) { context.scrollY = y; listeners.get('scroll')(); },
    resize() { listeners.get('resize')(); },
    wheel(deltaY, cancelable = true) {
      let prevented = false;
      listeners.get('wheel')({ deltaY, cancelable, preventDefault() { prevented = true; } });
      return prevented;
    },
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
