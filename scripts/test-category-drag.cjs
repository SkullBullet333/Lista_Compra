const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise pointer sessions and persistence outcomes without a browser or real user data.
let current;
let dragContext = null;
let timerId = 0;
let lastTimerDelay;
const timers = new Map();
const react = {
  createContext: () => ({ Provider: 'provider' }),
  createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.flat(Infinity) } }),
  useState: initial => current.state(initial),
  useRef: initial => current.ref(initial),
  useEffect: (fn, deps) => current.effect(fn, deps),
  useId: () => 'test-scope',
  useContext: () => dragContext,
};
const window = new EventTarget();
window.scrollBy = () => {};
window.innerHeight = 800;
let hitCategory = null;
const style = { userSelect: '', setProperty(key, value) { this.userSelect = value; } };
const document = {
  body: { style },
  elementFromPoint: () => hitCategory && ({ closest: () => ({ dataset: { categoryDrop: hitCategory, categoryScope: 'test-scope' } }) }),
};
const moduleUnderTest = { exports: {} };
const source = ts.transpileModule(fs.readFileSync('components/CategoryDrag.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText;
vm.runInNewContext(source, {
  module: moduleUnderTest, exports: moduleUnderTest.exports,
  require: name => name === 'react' ? react : name === 'react-dom' ? { createPortal: node => node } : {},
  window, document, Error, requestAnimationFrame: () => 1, cancelAnimationFrame() {}, console,
  setTimeout: (fn, delay) => { lastTimerDelay = delay; timers.set(++timerId, fn); return timerId; },
  clearTimeout: id => timers.delete(id),
});
const categories = { feira: { id: 'feira', label: 'Feira' }, outros: { id: 'outros', label: 'Outros' } };
const item = { id: 'apple', name: 'Maçã', category: 'feira' };
function mount(onMove, disabled = false, component = moduleUnderTest.exports.CategoryDragProvider) {
  const slots = [], pending = [], cleanups = [];
  let cursor, tree;
  const hooks = {
    state(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
    },
    ref(initial) { const index = cursor++; return slots[index] ||= { current: initial }; },
    effect(fn, deps) {
      const index = cursor++;
      if (!deps || !slots[index] || deps.some((value, i) => value !== slots[index][i])) {
        slots[index] = deps;
        pending.push(() => { cleanups[index]?.(); cleanups[index] = fn(); });
      }
    },
  };
  const props = { categories, onMove, disabled, children: null, item };
  const render = () => {
    cursor = 0; current = hooks;
    tree = component(props);
    while (pending.length) pending.shift()();
    return tree;
  };
  render();
  return { render, context: () => tree.props.value, props,
    unmount: () => cleanups.forEach(fn => fn?.()),
    text: () => JSON.stringify(tree),
  };
}
function pointer(type, x, y, pointerId = 1) {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, { clientX: x, clientY: y, pointerId });
  window.dispatchEvent(event);
}
function start(mounted, pointerType = 'mouse') {
  mounted.context().start(item, { isPrimary: true, button: 0, pointerId: 1, pointerType,
    clientX: 10, clientY: 100, preventDefault() {}, stopPropagation() {}, currentTarget: { setPointerCapture() {} } });
  mounted.render();
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
async function main() {
  const starts = [];
  dragContext = { disabled: false, start: (...args) => starts.push(args), choose() {} };
  const row = mount(() => {}, false, moduleUnderTest.exports.CategoryDragItem);
  const down = (target = { closest: () => null }) => row.render().props.onPointerDownCapture({
    isPrimary: true, button: 0, pointerId: 1, clientX: 10, clientY: 100, target,
    currentTarget: { setPointerCapture() {} },
  });
  const hold = () => { for (const fn of [...timers.values()]) fn(); };
  down(); pointer('pointerup', 10, 100); hold();
  assert.equal(starts.length, 0, 'Quick click keeps normal item actions');
  down(); pointer('pointermove', 10, 120); hold();
  assert.equal(starts.length, 0, 'Scrolling or swiping before the hold cancels dragging');
  down({ closest: () => ({ tagName: 'INPUT' }) }); hold();
  assert.equal(starts.length, 0, 'Editing inputs never starts dragging');
  down(); hold();
  assert.equal(starts.length, 1, 'Holding anywhere on the row starts dragging');
  let suppressed = 0;
  row.render().props.onClickCapture({ preventDefault() { suppressed++; }, stopPropagation() { suppressed++; } });
  assert.equal(suppressed, 2, 'Release after holding cannot edit, check or delete the item');
  down(); row.unmount(); hold();
  assert.equal(starts.length, 1, 'Unmount cancels a pending hold');
  dragContext = null;
  for (const pointerType of ['mouse', 'touch', 'pen']) {
    const writes = [];
    const mounted = mount((...args) => writes.push(args));
    start(mounted, pointerType);
    hitCategory = 'outros';
    pointer('pointermove', 100, 300);
    pointer('pointerup', 100, 300);
    await flush(); mounted.render();
    assert.deepEqual(writes, [['apple', 'outros']], `${pointerType}: drop changes category once`);
    assert.ok(mounted.text().includes('Maçã movido para Outros.'));
    assert.equal(style.userSelect, '', 'Selection restored after drag');
    assert.equal(lastTimerDelay, 3000, 'Move notification lasts three seconds');
    for (const fn of [...timers.values()]) fn();
    mounted.render();
    assert.ok(!mounted.text().includes('movido para Outros.'), 'Move notification dismisses automatically');
    mounted.unmount();
  }
  for (const destination of [null, 'feira', 'deleted-category']) {
    let writes = 0;
    const mounted = mount(() => writes++);
    start(mounted); hitCategory = destination;
    pointer('pointermove', 100, 300); pointer('pointerup', 100, 300);
    await flush(); mounted.render();
    assert.equal(writes, 0, 'Outside, current and removed categories do not write');
    mounted.unmount();
  }
  for (const cancel of ['pointercancel', 'blur', 'Escape']) {
    let writes = 0;
    const mounted = mount(() => writes++);
    start(mounted); hitCategory = 'outros'; pointer('pointermove', 100, 300);
    if (cancel === 'Escape') {
      const event = new Event('keydown'); Object.assign(event, { key: 'Escape' }); window.dispatchEvent(event);
    } else if (cancel === 'blur') window.dispatchEvent(new Event('blur'));
    else pointer('pointercancel', 100, 300);
    mounted.render(); pointer('pointerup', 100, 300);
    assert.equal(mounted.context().activeId, undefined);
    assert.equal(writes, 0, 'Cancellation never persists'); mounted.unmount();
  }
  const readonly = mount(() => assert.fail('Read-only write'), true);
  start(readonly); assert.equal(readonly.context().activeId, undefined); readonly.unmount();
  const failed = mount(async () => { throw new Error('Sem conexão'); });
  start(failed); hitCategory = 'outros'; pointer('pointermove', 100, 300); pointer('pointerup', 100, 300);
  await flush(); failed.render();
  assert.ok(failed.text().includes('Sem conexão'), 'Persistence error is shown');
  assert.equal(failed.context().disabled, false, 'Retry enabled after failure'); failed.unmount();
  const keyboard = mount(() => {}); keyboard.context().choose(item); keyboard.render();
  assert.equal(keyboard.context().activeId, item.id, 'Keyboard opens category destinations'); keyboard.unmount();
  console.log('Passed: mouse/touch/pen drops, invalid destinations, cancellation, read-only access, save failures and keyboard selection.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
