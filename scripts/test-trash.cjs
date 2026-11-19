const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');

function runtime() {
  const state = { online: true, signedIn: true, calls: [], rows: [], filters: [] };
  const window = new EventTarget();
  window.addEventListener('trash-restored', () => state.calls.push('restored-event'));
  const query = {
    select(value) { state.selection = value; return query; },
    is(key, value) { state.filters.push([key, value]); return query; },
    in() { return query; }, order() { return query; },
    range(first, last) { state.range = [first, last]; return Promise.resolve({ data: state.rows, error: state.readError }); },
  };
  const sync = {
    getSupabaseClient: () => ({
      from(table) { state.table = table; return query; },
      rpc(name, params) { state.calls.push('rpc'); state.rpc = [name, params]; return Promise.resolve({ data: state.rpcData, error: state.rpcError }); },
    }),
    getCurrentSession: async () => state.signedIn ? { user: { id: 'test-user' } } : null,
    flushPendingSupabaseBackup: async () => { state.calls.push('flush'); if (state.pendingError) throw new Error('Pending sync failed'); },
    loadCategoriesFromSupabase: async () => { state.calls.push('categories'); if (state.refreshError) throw new Error('Refresh failed'); },
    loadItemConfigsFromSupabase: async () => { state.calls.push('catalog'); },
    loadTemplatesFromSupabase: async () => { state.calls.push('templates'); },
  };
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync('lib/trash.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, require: () => sync, window, Event, Error,
    navigator: { get onLine() { return state.online; } } });
  return { state, trash: module.exports };
}

async function main() {
  const { state, trash } = runtime();
  state.rows = [{ id: 'deleted-1', source_table: 'shopping_lists', row_data: { title: 'Compras' } }];
  assert.equal((await trash.loadTrashRecords(50))[0].id, 'deleted-1');
  assert.equal(state.table, 'trash_bin');
  assert.deepEqual(state.range, [50, 99]);
  assert.deepEqual(state.filters, [['restored_at', null], ['purged_at', null], ['parent_trash_id', null], ['superseded_at', null]]);
  assert.ok(!state.selection.includes('related_data'), 'List does not download entire parent contents');
  assert.equal(trash.trashRecordName(state.rows[0]), 'Compras');
  assert.ok(state.selection.includes('origin_list_name'));
  assert.equal(trash.trashRecordListType({ source_table: 'list_items', row_data: {}, origin_list_type: 'travel' }), 'travel');
  state.calls = [];
  await trash.restoreTrashRecord('deleted-1');
  assert.deepEqual(state.calls, ['flush', 'rpc', 'restored-event', 'categories', 'catalog', 'templates']);
  assert.equal(state.rpc[0], 'restore_trash_item');
  assert.equal(state.rpc[1].target_trash_id, 'deleted-1');
  state.rpcError = { code: '23505', message: 'duplicate key' };
  await assert.rejects(trash.restoreTrashRecord('deleted-1'), /Nada foi sobrescrito/);
  state.rpcError = { code: '42501', message: 'Sem permissão' };
  await assert.rejects(trash.restoreTrashRecord('deleted-1'), /Sem permissão/);
  state.rpcError = undefined; state.calls = []; state.pendingError = true;
  await assert.rejects(trash.restoreTrashRecord('deleted-1'), /Pending sync failed/);
  assert.ok(!state.calls.includes('rpc'), 'A queued deletion must finish before restoration');
  state.pendingError = false; state.refreshError = true;
  assert.match((await trash.restoreTrashRecord('deleted-1')).refreshWarning, /foi restaurado/);
  state.refreshError = false; state.readError = { code: 'PGRST205' };
  await assert.rejects(trash.loadTrashRecords(), /ainda não foi ativada/);
  state.rpcData = { count: 75, cutoff: '2026-11-19T00:00:00Z' };
  state.calls = [];
  const preview = await trash.previewEmptyTrash();
  assert.equal(preview.count, 75, 'Preview is not limited to the loaded page');
  assert.deepEqual(state.calls, ['flush', 'rpc']);
  assert.equal(state.rpc[0], 'preview_empty_trash');
  state.rpcData = { count: 75 }; state.calls = [];
  assert.equal(await trash.emptyTrash(preview.cutoff), 75);
  assert.deepEqual(state.calls, ['rpc'], 'Do not flush new deletions after the preview cutoff');
  assert.equal(state.rpc[1].before_timestamp, preview.cutoff);
  state.rpcError = { code: '42501', message: 'Sem permissão para esvaziar' };
  await assert.rejects(trash.emptyTrash(preview.cutoff), /Sem permissão/);
  state.rpcError = undefined; state.rpcData = {};
  await assert.rejects(trash.previewEmptyTrash(), /conferir a lixeira/);
  state.online = false; state.calls = [];
  await assert.rejects(trash.restoreTrashRecord('deleted-1'), /Conecte-se/);
  await assert.rejects(trash.emptyTrash(preview.cutoff), /Conecte-se/);
  assert.equal(state.calls.length, 0);
  state.online = true; state.signedIn = false;
  await assert.rejects(trash.loadTrashRecords(), /Entre na sua conta/);
  console.log('Passed: trash paging, restored/purged filters, restore, empty preview/cutoff, permissions, refresh recovery, offline and authentication.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
