const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const ts = require('typescript');

function runtime(shared, state = { local: new Map(), catalog: [], writes: [], uploads: 0 }) {
  const localStorage = {
    getItem: key => state.local.get(key) ?? null,
    setItem: (key, value) => state.local.set(key, value),
    removeItem: key => state.local.delete(key),
  };
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'tester' } }, error: null }) },
    storage: { from: () => ({
      upload: async () => { state.uploads++; return { error: null }; },
      getPublicUrl: object => ({ data: { publicUrl: `https://storage.test/${object}` } }),
    }) },
    from(table) {
      let operation = 'select', payload, single = false;
      const filters = [];
      const builder = {
        select() { return builder; },
        order() { return builder; },
        eq(key, value) { filters.push(row => row[key] === value); return builder; },
        is(key, value) { return builder.eq(key, value); },
        in() { return builder; },
        upsert(value) { operation = 'upsert'; payload = value; return builder; },
        insert(value) { operation = 'insert'; payload = value; return builder; },
        update(value) { operation = 'update'; payload = value; return builder; },
        delete() { operation = 'delete'; return builder; },
        maybeSingle() { single = true; return builder; },
        single() { single = true; return builder; },
        then(resolve, reject) {
          return Promise.resolve().then(() => {
            if (table === 'catalog_items') {
              if (state.failCatalog && operation !== 'select') {
                state.failCatalog = false;
                return { data: null, error: { message: 'simulated failure' } };
              }
              let rows = state.catalog.filter(row => filters.every(filter => filter(row)));
              if (operation === 'upsert') {
                const row = state.catalog.find(row => row.normalized_name === payload.normalized_name && row.user_id === payload.user_id);
                if (row) Object.assign(row, payload);
                else state.catalog.push({ id: `catalog-${state.catalog.length}`, updated_at: new Date().toISOString(), ...payload });
                rows = state.catalog.filter(row => row.normalized_name === payload.normalized_name);
              } else if (operation === 'update') rows.forEach(row => Object.assign(row, payload));
              return { data: single ? rows[0] || null : rows, error: null };
            }
            if (operation !== 'select') state.writes.push({ table, operation, payload });
            return { data: single ? null : [], error: null };
          }).then(resolve, reject);
        },
      };
      return builder;
    },
  };
  const mocks = {
    '@supabase/supabase-js': { createClient: () => client },
    '@/lib/catalog-mode': { SHARED_CATALOG_EDIT: shared },
    '@/lib/categories': { getCustomCategories: () => [] },
    '@/lib/preferences': { getThemePreferences: () => ({ mode: 'light', primaryColor: '#059669' }) },
    '@/lib/templates': { getStoredTemplateOverrides: () => [], getDeletedTemplateIds: () => [] },
  };
  const modules = new Map();
  const context = vm.createContext({
    console, localStorage, window: { dispatchEvent() {} }, navigator: { onLine: true },
    Event, CustomEvent, crypto: webcrypto, TextEncoder, Uint8Array, fetch,
    setTimeout, clearTimeout,
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://db.test', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test' } },
  });
  function load(name) {
    if (mocks[name]) return mocks[name];
    const file = path.resolve(name.replace('@/', '') + '.ts');
    if (modules.has(file)) return modules.get(file).exports;
    const module = { exports: {} }; modules.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    vm.runInContext(`(function(require,module,exports){${code}\n})`, context, { filename: file })(load, module, module.exports);
    return module.exports;
  }
  return { storage: load('@/lib/storage'), sync: load('@/lib/supabase'), state };
}

async function main() {
  const photo = 'data:image/jpeg;base64,aGVsbG8=';
  const config = { name: 'Produto novo', category: 'outros', unit: 'un', imageUrl: photo, updatedAt: 1 };
  const app = runtime(true);
  const { storage, sync, state } = app;
  storage.replaceSharedCatalogItems([]);
  storage.saveItemConfig(config);
  assert.equal(storage.getEditableItemConfigs()[0].imageUrl, photo);
  assert.equal(runtime(true, state).storage.getRegisteredItems([])[0].name, config.name, 'Product survives reload without any list history');
  const pending = storage.getPendingCatalogItems()['produto novo'];
  storage.saveItemConfig({ ...config, notes: 'newer edit' });
  storage.acknowledgeCatalogItem(pending);
  assert.equal(storage.getPendingCatalogItems()['produto novo'].notes, 'newer edit', 'Acknowledging old write preserves newer edit');
  state.failCatalog = true;
  await assert.rejects(sync.backupAppData([]), /simulated failure/);
  assert.ok(storage.getPendingCatalogItems()['produto novo'], 'Failed sync keeps pending product');
  const list = { id: 'test-list', title: 'Test', createdAt: 1, updatedAt: 1, items: [{ ...config, id: 'item', quantity: 1, price: 0, checked: false, createdAt: 1 }] };
  await sync.backupAppData([list]);
  assert.equal(Object.keys(storage.getPendingCatalogItems()).length, 0);
  const catalogPhoto = state.catalog[0].image_url;
  assert.equal(storage.getRegisteredItems([])[0].imageUrl, catalogPhoto, 'Future lists reuse catalog photo after synchronization');
  assert.match(catalogPhoto, /^https:/);
  assert.equal(state.writes.find(write => write.table === 'list_items').payload[0].image_url, catalogPhoto, 'Catalog and list use same uploaded photo');
  assert.equal(state.uploads, 1);
  await runtime(true, state).sync.backupAppData([list]);
  assert.equal(state.uploads, 1, 'Repeated sync after reload reuses photo upload');
  storage.saveItemConfig({ ...config, name: 'Offline rename' });
  await sync.saveSharedCatalogItem('Offline rename', { ...config, name: 'Renamed product' });
  assert.ok(state.catalog.find(row => row.name === 'Renamed product'));
  assert.equal(storage.getPendingCatalogItems()['offline rename'], undefined);
  storage.saveItemConfig({ ...config, name: 'Offline delete' });
  await sync.deleteSharedCatalogItem({ ...config, name: 'Offline delete' });
  await sync.backupAppData([]);
  assert.equal(state.catalog.some(row => row.name === 'Offline delete'), false, 'Deleted pending product is not resurrected');
  const personal = runtime(false);
  personal.storage.saveItemConfig(config);
  await personal.sync.backupAppData([list]);
  assert.match(personal.state.catalog[0].image_url, /^https:/);
  assert.equal(personal.state.uploads, 1, 'Personal catalog also uploads offline photos once');
  console.log('Passed: product persistence, reload, photo reuse, retry, newer edits, pending rename/delete, personal catalog.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
