import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

test('canceled cooking neither initializes nor awards progress after delayed work', async t => {
  const root = fs.mkdtempSync(new URL('../cook-cancel-fixture-', import.meta.url));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  for (const dir of ['routes', 'utils']) fs.cpSync(new URL('../' + dir, import.meta.url), join(root, dir), {recursive: true});
  fs.writeFileSync(join(root, 'utils/llmClient.js'), `
    export let signal;
    export let onGenerate = () => {};
    export function setGenerate(fn) { onGenerate = fn; }
    export async function generateRecipes(ingredients, count, user, options) {
      signal = options?.signal; await onGenerate(); return [{title: 'Rice'}];
    }
  `);
  const model = await import(pathToFileURL(join(root, 'utils/llmClient.js')).href);
  const storage = await import(pathToFileURL(join(root, 'utils/jsonStorage.js')).href);
  const user = await storage.UserStorage.create({sproutName: 'Albert'});
  await storage.GroceryItemStorage.create({userId: user._id, name: 'rice'});
  const {default: router} = await import(pathToFileURL(join(root, 'routes/cookWithThis.js')).href);
  const cook = router.stack.find(layer => layer.route?.path === '/').route.stack[0].handle;
  const lookup = storage.UserImpactStorage.findOne;
  function request() {
    const req = Object.assign(new EventEmitter(), {body: {user_id: user._id}});
    const res = Object.assign(new EventEmitter(), {writes: 0, writableFinished: false,
      status() { return this; }, json() { this.writes++; this.writableFinished = true; }});
    return {req, res};
  }
  for (const phase of ['generation', 'impact']) {
    const {req, res} = request();
    model.setGenerate(async () => { if (phase === 'generation') res.emit('close'); });
    const mock = t.mock.method(storage.UserImpactStorage, 'findOne', async (...args) => {
      const value = await lookup(...args);
      if (phase === 'impact') req.emit('aborted');
      return value;
    });
    await cook(req, res, error => { throw error; });
    mock.mock.restore();
    assert.equal(await lookup({user_id: user._id}), null, phase + ': no progress write');
    assert.equal(model.signal?.aborted, true);
    assert.equal(res.writes, 0);
    assert.equal(req.listenerCount('aborted'), 0);
    assert.equal(res.listenerCount('close'), 0);
  }
  model.setGenerate(async () => {});
  const {req, res} = request();
  await cook(req, res, error => { throw error; });
  assert.equal((await lookup({user_id: user._id})).xp, 5);
  assert.equal(res.writes, 1);
  assert.equal(req.listenerCount('aborted'), 0);
  assert.equal(res.listenerCount('close'), 0);
});
