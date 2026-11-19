import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {EventEmitter} from 'node:events';
import {execFileSync} from 'node:child_process';

test('cooking receipts replay one award across concurrent completion and restart', async t => {
  const root = fs.mkdtempSync(new URL('../cook-retry-fixture-', import.meta.url));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  for (const dir of ['routes', 'utils']) fs.cpSync(new URL('../' + dir, import.meta.url), join(root, dir), {recursive: true});
  fs.writeFileSync(join(root, 'utils/llmClient.js'), `
    export let calls = 0;
    let mode = 'normal';
    export function setMode(value) { mode = value; }
    export async function generateRecipes() {
      calls++;
      if (mode === 'fail') throw new Error('controlled inference failure');
      return [{title: mode === 'large' ? 'x'.repeat(128 * 1024) : 'result-' + calls}];
    }
  `);
  const url = path => pathToFileURL(join(root, path)).href;
  const storage = await import(url('utils/jsonStorage.js'));
  const model = await import(url('utils/llmClient.js'));
  const {default: router} = await import(url('routes/cookWithThis.js'));
  const handle = router.stack.find(layer => layer.route?.path === '/').route.stack[0].handle;
  const user = await storage.UserStorage.create({sproutName: 'Albert'});
  await storage.GroceryItemStorage.create({userId: user._id, name: 'rice'});
  async function request(key, userId = user._id) {
    let status = 200, body;
    await handle(Object.assign(new EventEmitter(), {body: {user_id: userId}, headers: key === undefined ? {} : {'idempotency-key': key}}),
      Object.assign(new EventEmitter(), {status(value) { status = value; return this; }, json(value) { body = value; }}), error => { throw error; });
    return {status, body};
  }
  const results = await Promise.all(Array.from({length: 20}, () => request('cook-1')));
  assert.equal(results[0].status, 200);
  assert.equal(results[0].body.progress.xp, 5);
  for (const result of results) assert.deepEqual(result, results[0]);
  assert.equal((await storage.UserImpactStorage.findOne({user_id: user._id})).xp, 5);
  await request('cook-2');
  const calls = model.calls;
  assert.deepEqual(await request('cook-1'), results[0]);
  assert.equal(model.calls, calls, 'completed receipt bypasses inference');
  assert.equal((await request('cook-1', 'different-user')).status, 409);
  for (const key of ['', 'bad key', 'x'.repeat(129), ['a', 'b']]) assert.equal((await request(key)).status, 400);
  assert.equal(model.calls, calls);

  const script = `import {EventEmitter} from 'node:events';
    const model = await import(${JSON.stringify(url('utils/llmClient.js'))}); model.setMode('fail');
    const {default:r} = await import(${JSON.stringify(url('routes/cookWithThis.js'))});
    const h = r.stack.find(l => l.route?.path === '/').route.stack[0].handle;
    await h(Object.assign(new EventEmitter(), {body:{user_id:${JSON.stringify(user._id)}},headers:{'idempotency-key':'cook-1'}}),
      Object.assign(new EventEmitter(), {status(){throw Error('unexpected status')},json(body){console.log(JSON.stringify(body))}}), error => {throw error});`;
  assert.deepEqual(JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', script], {encoding: 'utf8'})), results[0].body);

  model.setMode('fail');
  await assert.rejects(request('failed'), /controlled inference failure/);
  model.setMode('large');
  assert.equal((await request('large')).status, 502);
  let impact = await storage.UserImpactStorage.findOne({user_id: user._id});
  assert.equal(impact.xp, 10);
  assert.equal(impact.cook_receipts.length, 2, 'failed inference and oversized response do not commit awards or receipts');
  model.setMode('normal');
  await storage.UserImpactStorage.update(user._id, current => {
    const template = current.cook_receipts[0];
    current.cook_receipts = Array.from({length: 100}, (_, i) => ({...template, key: i === 0 ? 'cook-1' : 'capacity-' + i}));
  });
  const beforeCapacity = model.calls;
  assert.equal((await request('overflow')).status, 503);
  assert.equal(model.calls, beforeCapacity, 'full receipt store rejects before inference');
  assert.deepEqual(await request('cook-1'), results[0]);
  await storage.UserImpactStorage.update(user._id, current => { current.cook_receipts[99].created_ms = 0; });
  assert.equal((await request('overflow')).status, 200);
  await request(undefined);
  impact = await storage.UserImpactStorage.findOne({user_id: user._id});
  assert.equal(impact.xp, 20);
  assert.equal(impact.cook_receipts.length, 100);
  assert.equal(impact.total_meals_logged, 0);
});
