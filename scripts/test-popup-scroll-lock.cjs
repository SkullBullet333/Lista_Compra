const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');

class InlineStyle {
  values = new Map();
  getPropertyValue(name) { return this.values.get(name)?.value || ''; }
  getPropertyPriority(name) { return this.values.get(name)?.priority || ''; }
  setProperty(name, value, priority = '') { this.values.set(name, { value, priority }); }
  removeProperty(name) { const value = this.getPropertyValue(name); this.values.delete(name); return value; }
}
const root = { style: new InlineStyle(), clientWidth: 1263 };
const body = { style: new InlineStyle() };
root.style.setProperty('overflow', 'auto', 'important');
root.style.setProperty('overscroll-behavior', 'contain');
body.style.setProperty('overflow', 'scroll');
const listeners = new Set();
const media = {
  matches: true,
  addEventListener(event, listener) { assert.equal(event, 'change'); listeners.add(listener); },
  removeEventListener(event, listener) { assert.equal(event, 'change'); listeners.delete(listener); },
};
const effects = [];
const keyListeners = new Set();
let nativeDialog = false;
const moduleUnderTest = { exports: {} };
const context = vm.createContext({
  document: {
    documentElement: root, body,
    querySelector: () => nativeDialog ? {} : null,
    addEventListener: (_, listener) => keyListeners.add(listener),
    removeEventListener: (_, listener) => keyListeners.delete(listener),
  },
  window: { innerWidth: 1280, matchMedia: () => media },
});
const compiled = ts.transpileModule(fs.readFileSync('hooks/use-page-scroll-lock.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
vm.runInContext(`(function(require,module,exports){${compiled}\n})`, context)(
  name => { assert.equal(name, 'react'); return { useEffect: effect => effects.push(effect), useRef: current => ({ current }) }; },
  moduleUnderTest, moduleUnderTest.exports,
);
const { lockPageScroll, usePageScrollLock } = moduleUnderTest.exports;
function mount(open, close) {
  usePageScrollLock(open, close);
  const cleanups = effects.splice(0).map(effect => effect()).filter(Boolean);
  return cleanups.length ? () => cleanups.forEach(cleanup => cleanup()) : undefined;
}
function assertRestored() {
  assert.equal(root.style.getPropertyValue('overflow'), 'auto');
  assert.equal(root.style.getPropertyPriority('overflow'), 'important');
  assert.equal(root.style.getPropertyValue('overscroll-behavior'), 'contain');
  assert.equal(root.style.getPropertyValue('scrollbar-gutter'), '');
  assert.equal(body.style.getPropertyValue('overflow'), 'scroll');
}

assert.equal(mount(false), undefined);
assert.equal(listeners.size, 0);
assertRestored();
const closeParent = mount(true);
assert.equal(root.style.getPropertyValue('overflow'), 'hidden');
assert.equal(root.style.getPropertyValue('overflow'), body.style.getPropertyValue('overflow'));
assert.equal(root.style.getPropertyValue('scrollbar-gutter'), 'stable');
const closeNested = mount(true);
closeParent();
assert.equal(root.style.getPropertyValue('overflow'), 'hidden', 'Closing one popup keeps another popup locked');
closeNested();
assertRestored();
assert.equal(listeners.size, 0, 'Unmount removes viewport listeners');

const releaseFirst = lockPageScroll();
const releaseSecond = lockPageScroll();
releaseFirst();
releaseFirst();
assert.equal(body.style.getPropertyValue('overflow'), 'hidden', 'Duplicate cleanup must not release another popup');
releaseSecond();
assertRestored();

media.matches = false;
const closeResponsive = mount(true);
assertRestored();
media.matches = true;
for (const listener of listeners) listener();
assert.equal(root.style.getPropertyValue('overflow'), 'hidden', 'An open popup locks when resized to desktop');
media.matches = false;
for (const listener of listeners) listener();
assertRestored();
closeResponsive();
assert.equal(listeners.size, 0);
console.log('Passed: popup scroll locking, nested popups, cleanup, original styles, scrollbar spacing, and desktop/mobile resizing.');

media.matches = true;
let parentClosed = 0;
let childClosed = 0;
const removeParent = mount(true, () => parentClosed++);
const removeChild = mount(true, () => childClosed++);
function pressEscape(options = {}) {
  const event = { key: 'Escape', defaultPrevented: false, repeat: false,
    preventDefault() { this.defaultPrevented = true; },
    stopImmediatePropagation() { this.stopped = true; }, ...options };
  for (const listener of keyListeners) listener(event);
  return event;
}
assert.equal(pressEscape().stopped, true, 'Popup consumes Escape before page navigation');
assert.equal(childClosed, 1, 'Only the top popup closes');
assert.equal(parentClosed, 0);
assert.equal(pressEscape({ repeat: true }).stopped, true);
assert.equal(childClosed, 1, 'Holding Escape must not dismiss more popups');
nativeDialog = true;
assert.equal(pressEscape().defaultPrevented, false, 'Native dialog retains its cancel event');
assert.equal(childClosed, 1);
nativeDialog = false;
assert.equal(pressEscape({ defaultPrevented: true }).stopped, undefined);
removeChild();
pressEscape();
assert.equal(parentClosed, 1);
media.matches = false;
pressEscape();
assert.equal(parentClosed, 1, 'Mobile behavior is unchanged');
removeParent();
assert.equal(keyListeners.size, 0, 'Popup keyboard listener is removed on cleanup');
console.log('Passed: Escape dismissal, nested popups, native dialogs, key repeat, mobile behavior, and listener cleanup.');
