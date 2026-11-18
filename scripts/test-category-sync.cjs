const assert = require('node:assert/strict');
const { runtime } = require('./test-product-persistence.cjs');

async function main() {
  const phone = runtime(true);
  const category = phone.categories.makeCustomCategory('Animais', [], 'paw-print');
  phone.categories.saveCustomCategories([category]);
  await phone.sync.backupAppData([]);
  assert.equal(phone.state.categories[0].id, `tester:${category.id}`);
  assert.equal(phone.state.categories[0].icon, 'paw-print');

  const web = runtime(true);
  web.state.categories = phone.state.categories;
  let notifications = 0;
  web.window.addEventListener('categories-updated', () => notifications++);
  await web.sync.loadCategoriesFromSupabase();
  assert.equal(web.categories.getAllCategories()[category.id].label, 'Animais');
  assert.equal(web.categories.getAllCategories()[category.id].color, category.color);
  assert.equal(web.categories.getAllCategories()[category.id].icon, 'paw-print');
  assert.equal(web.categories.getCustomCategories()[0].id, category.id, 'Remote namespace is removed so item references match');
  assert.equal(notifications, 1, 'Mounted views receive a change notification');
  await web.sync.loadCategoriesFromSupabase();
  assert.equal(notifications, 1, 'Unchanged polling does not rerender category consumers');

  phone.categories.saveCustomCategories([{ ...category, label: 'Pets', color: '#123456', icon: 'heart' }]);
  await phone.sync.backupAppData([]);
  await web.sync.loadCategoriesFromSupabase();
  assert.equal(web.categories.getCustomCategories()[0].label, 'Pets');
  assert.equal(web.categories.getCustomCategories()[0].color, '#123456');
  assert.equal(web.categories.getCustomCategories()[0].icon, 'heart', 'Edited icons sync to other devices');
  assert.equal(web.categories.makeCustomCategory('Legado', []).icon, 'shopping-bag');
  assert.ok(web.categories.getAllCategories().feira, 'Built-in categories remain available');
  assert.equal(web.categories.getDeletedCategoryIds().length, 0, 'Remote replacement never queues local deletions');

  phone.categories.saveCustomCategories([]);
  await phone.sync.backupAppData([]);
  await web.sync.loadCategoriesFromSupabase();
  assert.equal(web.categories.getCustomCategories().length, 0, 'Deleting the last category propagates without resurrection');
  assert.equal(phone.categories.getDeletedCategoryIds().length, 0, 'Successful deletions are acknowledged');
  phone.categories.saveCustomCategories([{ ...category, label: 'Pets', color: '#123456', icon: 'heart' }]);
  await phone.sync.backupAppData([]);
  await web.sync.loadCategoriesFromSupabase();

  web.state.categoryError = { message: 'temporary failure' };
  await assert.rejects(web.sync.loadCategoriesFromSupabase(), /temporary failure/);
  assert.equal(web.categories.getCustomCategories()[0].label, 'Pets', 'Network errors preserve local categories');
  web.state.categoryError = null;
  web.state.beforeCategoryRead = () => {
    web.categories.saveCustomCategories([{ ...category, label: 'Local edit' }]);
    web.sync.scheduleSupabaseBackup([]);
  };
  await web.sync.loadCategoriesFromSupabase();
  assert.equal(web.categories.getCustomCategories()[0].label, 'Local edit', 'A download cannot overwrite an edit made during the request');
  console.log('Passed: phone-to-web categories, matching IDs, label/color updates, view notifications, unchanged polling, errors, and pending edits.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
