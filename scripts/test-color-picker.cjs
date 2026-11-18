const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const local = new Map(), styles = new Map();
const window = new EventTarget();
window.matchMedia = () => ({ matches: false });
const document = {
  documentElement: { dataset: {}, style: { setProperty: (k, v) => styles.set(k, v) } },
  body: {}, activeElement: { focus() {} },
  querySelector: () => null, getElementById: () => ({ focus() {} }),
};
const localStorage = { getItem: k => local.get(k) ?? null, setItem: (k, v) => local.set(k, v) };
const cache = new Map();
let hooks;
const React = {
  createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.flat(Infinity) } }),
  useState: initial => hooks.state(initial), useRef: initial => hooks.ref(initial),
  useId: () => hooks.id(), useEffect: effect => hooks.effect(effect),
};
let lockCount = 0;
const mocks = {
  react: React, 'react-dom': { createPortal: element => element },
  'lucide-react': { Check: 'check', X: 'close-icon' },
  '@/hooks/use-page-scroll-lock': { lockPageScroll: () => { lockCount++; return () => lockCount--; } },
};
function load(name) {
  if (mocks[name]) return mocks[name];
  if (cache.has(name)) return cache.get(name);
  const relative = name.replace('@/', '');
  const file = path.resolve(`${relative}${relative.includes('ColorPicker') ? '.tsx' : '.ts'}`);
  let source = fs.readFileSync(file, 'utf8');
  if (name.includes('ColorPicker')) source += '\nexport const TestDialog = ColorDialog;';
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: load, window, document, localStorage, Event, console }, { filename: file });
  cache.set(name, module.exports);
  return module.exports;
}

function mount(component, props) {
  const slots = [], effects = [], cleanups = [];
  let cursor, tree, mounted = false, dirty;
  const modal = { showModal() {}, close() {}, getBoundingClientRect: () => ({ left: 20, top: 20, right: 450, bottom: 600 }) };
  const context = {
    state(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; dirty = true; }];
    },
    ref(initial) { const i = cursor++; return slots[i] ||= { current: initial }; },
    id() { return `test-${cursor++}`; },
    effect(fn) { cursor++; if (!mounted) effects.push(fn); },
  };
  const render = () => {
    do { dirty = false; cursor = 0; hooks = context; tree = component(props); } while (dirty);
    for (const node of all(tree)) {
      if (node.type === 'dialog' && node.props.ref) node.props.ref.current = modal;
      if (node.type === 'button' && node.props.ref) node.props.ref.current = { focus() {} };
    }
    if (!mounted) { effects.forEach(fn => cleanups.push(fn())); mounted = true; }
    return tree;
  };
  render();
  return { render, find: predicate => all(tree).find(predicate), unmount: () => cleanups.forEach(fn => fn?.()), modal };
}
function all(node) {
  if (!node || typeof node !== 'object') return [];
  return [node, ...(node.props?.children || []).flatMap(all)];
}
const colors = load('@/lib/colors');
for (const color of ['#059669', '#0284C7', '#7C3AED', '#111111']) {
  assert.equal(colors.accentForeground(color), '#FFFFFF', `White labels and icons on ${color}`);
}
for (const color of ['#FFFFFF', '#FEF9C3', '#E2E8F0']) {
  assert.equal(colors.accentForeground(color), '#111111', `Dark labels on light accent ${color}`);
}
for (const dark of ['#000000', '#1E293B', '#707070', '#7C3AED', '#1E40AF']) {
  assert.equal(colors.colorForeground(dark), '#FFFFFF', `White text on dark selection ${dark}`);
}
for (const light of ['#FFFFFF', '#FEF9C3', '#E2E8F0']) {
  assert.equal(colors.colorForeground(light), '#111111', `Dark text on light selection ${light}`);
}
for (const [input, expected] of [['abc', '#AABBCC'], ['#1aF', '#11AAFF'], [' #12abEF ', '#12ABEF']]) assert.equal(colors.normalizeHex(input), expected);
for (const invalid of ['', '#', '#12', '#1234', '#1234567', 'red', '#gggggg']) assert.equal(colors.normalizeHex(invalid), null);
for (const hex of ['#FFFFFF', '#000000', '#059669', '#FF0000', '#FFEE99', '#123456']) {
  assert.equal(colors.hsvToHex(colors.rgbToHsv(colors.hexToRgb(hex))), hex);
  assert.ok(colors.contrastRatio(hex, colors.colorForeground(hex)) >= 4.5, `Readable foreground for ${hex}`);
  for (const background of ['#FFFFFF', '#1E293B', '#090909']) assert.ok(colors.contrastRatio(colors.accessibleAccent(hex, background), background) >= 4.5);
}
const prefs = load('@/lib/preferences');
prefs.saveThemePreferences({ ...prefs.DEFAULT_THEME, primaryColor: '#abc' });
prefs.setThemeUser('alice');
assert.equal(prefs.getThemePreferences().primaryColor, '#AABBCC', 'Legacy color migrated');
prefs.setThemeUser('bob');
assert.equal(prefs.getThemePreferences().primaryColor, '#059669', 'Accounts isolated');
assert.equal(styles.get('--market-foreground'), '#FFFFFF', 'Default green button labels and cart icon are white');
assert.equal(styles.get('--travel-foreground'), '#FFFFFF', 'Default blue button labels and icons are white');
const restore = prefs.themeRestoreGuard();
prefs.saveThemePreferences({ ...prefs.DEFAULT_THEME, primaryColor: '#fff', mode: 'dark' });
assert.equal(restore(), false, 'Late profile load cannot overwrite an edit');
assert.equal(styles.get('--market-foreground'), '#111111');
assert.equal(document.documentElement.dataset.theme, 'dark');
assert.ok(colors.contrastRatio(styles.get('--market-text'), '#1E293B') >= 4.5);
prefs.setThemeUser('alice');
assert.equal(prefs.getThemePreferences().primaryColor, '#AABBCC', 'Account preference restored');
prefs.setThemeUser('bob');
assert.equal(prefs.getThemePreferences().primaryColor, '#FFFFFF');
localStorage.setItem('fresh_market_theme_v1:bob', JSON.stringify({ primaryColor: 'bad-value', mode: 'oops' }));
assert.equal(prefs.getThemePreferences().primaryColor, '#059669', 'Invalid saved data sanitized');

const { TestDialog, ColorPicker } = load('@/components/ColorPicker');
const button = (ui, label) => ui.find(n => n.type === 'button' && n.props.children.includes(label));
const input = (ui, label) => ui.find(n => n.type === 'input' && n.props['aria-label'] === label);
let changed = [], cancelled = 0;
const props = { value: '#059669', title: 'Selecionar cor primária', onConfirm: color => changed.push(color), onCancel: () => cancelled++ };
let ui = mount(TestDialog, props);
const choose = color => { ui.find(n => n.props?.['aria-label'] === `Cor ${color}`).props.onClick(); ui.render(); };
choose('#FFFFFF');
assert.equal(changed.length, 0, 'Palette changes remain drafts');
button(ui, 'Cancelar').props.onClick();
assert.equal(cancelled, 1);
assert.equal(changed.length, 0);
ui.unmount();
ui = mount(TestDialog, props);
assert.equal(ui.find(n => n.props?.['aria-label'] === 'Cor #059669').props['aria-pressed'], true, 'Reopen uses applied value');
button(ui, 'Personalizar').props.onClick(); ui.render();
input(ui, 'HEX da nova cor').props.onChange({ target: { value: '#f' } }); ui.render();
assert.equal(button(ui, 'OK').props.disabled, true, 'Partial HEX is retained and cannot confirm');
assert.equal(input(ui, 'HEX da nova cor').props.value, '#f');
input(ui, 'HEX da nova cor').props.onChange({ target: { value: '#abc' } }); ui.render();
assert.equal(input(ui, 'R').props.value, '170');
assert.equal(input(ui, 'G').props.value, '187');
assert.equal(input(ui, 'B').props.value, '204');
input(ui, 'R').props.onChange({ target: { value: '999' } }); ui.render();
assert.equal(button(ui, 'OK').props.disabled, true, 'Out of range RGB cannot confirm');
input(ui, 'R').props.onChange({ target: { value: '255' } }); ui.render();
assert.equal(input(ui, 'HEX da nova cor').props.value, '#FFBBCC');
assert.equal(changed.length, 0, 'Fields do not apply before OK');
button(ui, 'OK').props.onClick();
assert.equal(changed.pop(), '#FFBBCC', 'OK applies normalized draft');
ui.unmount();
for (const dismiss of ['escape', 'close', 'outside']) {
  ui = mount(TestDialog, props); choose('#FFFFFF');
  if (dismiss === 'escape') ui.find(n => n.type === 'dialog').props.onCancel({ preventDefault() {} });
  if (dismiss === 'close') ui.find(n => n.props?.['aria-label'] === 'Fechar seletor de cor').props.onClick();
  if (dismiss === 'outside') ui.find(n => n.type === 'dialog').props.onClick({ target: ui.modal, currentTarget: ui.modal, clientX: 0, clientY: 0 });
  ui.unmount();
}
assert.equal(cancelled, 4, 'All four dismissal paths cancel');
assert.equal(changed.length, 0, 'Dismissal never applies');
ui = mount(TestDialog, props);
const plane = () => ui.find(n => n.props?.className === 'color-dialog__saturation');
const surface = { focus() {}, setPointerCapture() {}, hasPointerCapture: () => true, getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 100 }) };
plane().props.onPointerDown({ preventDefault() {}, currentTarget: surface, pointerId: 1, pointerType: 'touch', clientX: 0, clientY: 0 }); ui.render();
assert.equal(input(ui, 'HEX da nova cor').props.value, '#FFFFFF', 'Touch updates saturation and brightness');
plane().props.onPointerMove({ currentTarget: surface, pointerId: 1, pointerType: 'mouse', clientX: 200, clientY: 100 }); ui.render();
assert.equal(input(ui, 'HEX da nova cor').props.value, '#000000', 'Mouse drag updates draft');
plane().props.onKeyDown({ key: 'ArrowUp', preventDefault() {} }); ui.render();
assert.notEqual(input(ui, 'HEX da nova cor').props.value, '#000000', 'Keyboard adjusts visual selector');
ui.unmount();
assert.equal(lockCount, 0, 'Every modal restores page scrolling');

ui = mount(ColorPicker, { value: '#059669', onChange: color => changed.push(color) });
input(ui, 'Cor Primária de Destaque HEX').props.onChange({ target: { value: '#1' } }); ui.render();
input(ui, 'Cor Primária de Destaque HEX').props.onBlur();
assert.equal(changed.length, 0, 'Partial external HEX is never applied');
input(ui, 'Cor Primária de Destaque HEX').props.onChange({ target: { value: '#abc' } }); ui.render();
input(ui, 'Cor Primária de Destaque HEX').props.onBlur();
assert.equal(changed.pop(), '#AABBCC', 'External HEX commits valid normalized color');
console.log('Passed: HEX/RGB/HSV, contrast, per-user persistence, safe restoration, confirmation, all cancellations, partial input, palette, touch/mouse, keyboard, and scroll cleanup.');
