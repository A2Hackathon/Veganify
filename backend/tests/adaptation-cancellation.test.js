import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRewriteService } from '../utils/rewriteService.js';

test('disconnected adaptation commit does not persist late rewrite results', async t => {
  const root = fs.mkdtempSync(new URL('../adaptation-cancel-fixture-', import.meta.url));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  for (const dir of ['routes', 'utils', 'config']) fs.cpSync(new URL('../' + dir, import.meta.url), join(root, dir), {recursive: true});
  fs.writeFileSync(join(root, 'utils/llmClient.js'), `
    export let signal;
    export let release;
    let started;
    export const ready = new Promise(resolve => { started = resolve; });
    const gate = new Promise(resolve => { release = resolve; });
    export async function rewriteRecipeSteps(subs, recipe, user, options) {
      signal = options?.signal; started(); await gate;
      return 'Cook rice.';
    }
    export async function extractIngredients() { throw new Error('unused'); }
    export async function isAllowedForUser() { throw new Error('unused'); }
  `);
  const model = await import(pathToFileURL(join(root, 'utils/llmClient.js')).href);
  const storage = await import(pathToFileURL(join(root, 'utils/jsonStorage.js')).href);
  await storage.UserStorage.create({sproutName: 'Albert', dietLevel: 'vegan'});
  const {default: router} = await import(pathToFileURL(join(root, 'routes/veganize.js')).href);
  const handle = router.stack.find(layer => layer.route?.path === '/commit').route.stack[0].handle;
  const req = Object.assign(new EventEmitter(), {body: {recipeText: 'Cook rice.', substitutions: []}});
  const res = Object.assign(new EventEmitter(), {writes: 0, writableFinished: false,
    status() { return this; }, json() { this.writes++; }});
  const pending = handle(req, res);
  await model.ready;
  res.emit('close');
  model.release();
  await pending;
  assert.deepEqual(JSON.parse(fs.readFileSync(join(root, 'data/recipes.json'), 'utf8')), []);
  assert.equal(model.signal?.aborted, true);
  assert.equal(res.writes, 0);
  assert.equal(req.listenerCount('aborted'), 0);
  assert.equal(res.listenerCount('close'), 0);
  const retryReq = Object.assign(new EventEmitter(), {body: req.body});
  const retryRes = Object.assign(new EventEmitter(), {writes: 0, writableFinished: false,
    status() { return this; }, json() { this.writes++; this.writableFinished = true; }});
  await handle(retryReq, retryRes);
  assert.equal(JSON.parse(fs.readFileSync(join(root, 'data/recipes.json'), 'utf8')).length, 1);
  assert.equal(retryRes.writes, 1);
  assert.equal(retryReq.listenerCount('aborted'), 0);
  assert.equal(retryRes.listenerCount('close'), 0);
});

test('rewrite forwards cancellation and preserves abort reasons', async () => {
  const controller = new AbortController();
  const reason = new Error('cancelled rewrite');
  let signal;
  const rewrite = createRewriteService(async (body, options) => {
    signal = options?.signal;
    controller.abort(reason);
    throw reason;
  });
  await assert.rejects(rewrite([], 'Cook rice.', {dietLevel: 'vegan'}, {signal: controller.signal}), error => error === reason);
  assert.equal(signal, controller.signal);
  let calls = 0;
  await assert.rejects(createRewriteService(async () => { calls++; })([], 'Cook rice.', {dietLevel: 'vegan'}, {signal: controller.signal}), error => error === reason);
  assert.equal(calls, 0);
});
