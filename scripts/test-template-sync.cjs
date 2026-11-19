const assert = require('node:assert/strict');
const { runtime } = require('./test-product-persistence.cjs');

async function main() {
  const state = { local: new Map(), catalog: [], writes: [], uploads: 0, templates: [{
    id: 'custom-test', name: 'Modelo com 14 itens', description: '', emoji: '',
    items: Array.from({ length: 14 }, (_, index) => ({ name: index ? `Item ${index}` : 'Abacate', category: 'feira', unit: 'un', quantity: 1, price: 0 })),
  }] };
  const app = runtime(true, state);
  await app.sync.backupAppData([]);
  const originalIds = state.templateItems.map(item => item.id);
  const secondState = { local: new Map(), catalog: [], writes: [], uploads: 0, templates: structuredClone(state.templates) };
  await runtime(true, secondState).sync.backupAppData([]);
  assert.deepEqual(secondState.templateItems.map(item => item.id), originalIds, 'Independent devices assign the same new-item IDs');
  for (let index = 0; index < 5; index++) await app.sync.backupAppData([]);
  assert.equal(state.templateItems.length, 14, 'Repeated synchronization must keep exactly 14 items');
  assert.deepEqual(state.templateItems.map(item => item.id), originalIds, 'IDs survive repeated backups');
  assert.equal((state.templateDeletes || []).length, 0, 'Unchanged templates generate no DELETEs or false trash entries');
  state.templates[0].items = state.templates[0].items.filter(item => item.name !== 'Abacate');
  await app.sync.backupAppData([]);
  assert.equal(state.templateItems.length, 13);
  assert.equal(state.templateDeletes.length, 1, 'Removing Abacate deletes only one row');
  assert.equal(state.templateDeletes[0].name, 'Abacate');
  await app.sync.backupAppData([]);
  assert.equal(state.templateDeletes.length, 1, 'Later backups must not delete Abacate again');
  // Force multiple read pages without increasing the desired template size.
  state.templateItems.push(...Array.from({ length: 1001 }, (_, index) => ({ id: `stale-${index}`, name: `Stale ${index}`, template_id: 'tester:custom-test', user_id: 'tester' })));
  await app.sync.backupAppData([]);
  assert.equal(state.templateItems.length, 13, 'Existing items beyond the first server page are reconciled correctly');
  console.log('Passed: stable IDs, 14 items across repeated sync, one Abacate deletion, no repeated deletes, and multi-page reconciliation.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
