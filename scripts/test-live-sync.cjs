const assert = require('node:assert/strict');
const { runtime } = require('./test-product-persistence.cjs');

async function main() {
  const app = runtime(true);
  let refreshes = 0;
  const stop = app.sync.subscribeToListChanges(() => refreshes++);
  const tick = () => {
    const callbacks = [...app.timeouts.values()];
    app.timeouts.clear();
    callbacks.forEach(({ fn }) => fn());
  };
  app.state.channelStatus('SUBSCRIBED');
  tick();
  assert.equal(refreshes, 1, 'Subscribe/reconnect reconciles missed changes');
  for (let i = 0; i < 50; i++) app.state.listeners.get('list_items')();
  assert.equal(app.timeouts.size, 1, 'Bulk events coalesce without postponing refresh');
  tick();
  assert.equal(refreshes, 2);
  app.document.visibilityState = 'hidden';
  app.intervals.values().next().value.fn();
  assert.equal(app.timeouts.size, 0, 'Background tabs do not poll');
  app.document.visibilityState = 'visible';
  app.document.dispatchEvent(new Event('visibilitychange'));
  tick();
  assert.equal(refreshes, 3, 'Returning to the app reconciles immediately');
  assert.equal(app.intervals.values().next().value.delay, 1500);
  app.intervals.values().next().value.fn();
  tick();
  assert.equal(refreshes, 4, 'Fallback works without socket events');
  app.window.dispatchEvent(new Event('supabase-sync-success'));
  tick();
  assert.equal(refreshes, 5, 'Local save completion retries skipped remote updates');
  app.window.dispatchEvent(new Event('focus'));
  stop();
  assert.equal(app.timeouts.size, 0);
  assert.equal(app.intervals.size, 0);
  app.window.dispatchEvent(new Event('focus'));
  assert.equal(app.timeouts.size, 0, 'Cleanup removes timers and listeners');
  assert.ok(app.state.removed);

  const queue = runtime(true);
  const list = { id: 'list', title: 'first', createdAt: 1, updatedAt: 1, items: [] };
  let successes = 0;
  queue.window.addEventListener('supabase-sync-success', () => successes++);
  queue.sync.scheduleSupabaseBackup([list]);
  let injected = false;
  queue.state.onWrite = ({ table }) => {
    if (table === 'shopping_lists' && !injected) {
      injected = true;
      queue.sync.scheduleSupabaseBackup([{ ...list, title: 'latest', updatedAt: 2 }]);
    }
  };
  const first = queue.sync.flushPendingSupabaseBackup();
  const concurrent = queue.sync.flushPendingSupabaseBackup();
  assert.equal(first, concurrent, 'Concurrent saves share one writer');
  await first;
  assert.deepEqual(queue.state.writes.filter(w => w.table === 'shopping_lists').map(w => w.payload.title), ['first', 'latest']);
  assert.equal(queue.sync.isOfflineSyncPending(), false, 'Edits during a save are drained');
  assert.equal(successes, 1, 'Notify only after the latest revision is saved');
  queue.storage.saveItemConfig({ name: 'pending', category: 'outros', unit: 'un' });
  queue.sync.scheduleSupabaseBackup([list]);
  queue.state.failCatalog = true;
  await assert.rejects(queue.sync.flushPendingSupabaseBackup(), /simulated failure/);
  assert.equal(queue.sync.isOfflineSyncPending(), true);
  await queue.sync.flushPendingSupabaseBackup();
  assert.equal(queue.sync.isOfflineSyncPending(), false, 'A failed writer can retry');
  console.log('Passed: reconnect, resume, fallback, event bursts, cleanup, concurrent saves, edits during save, and retry.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
