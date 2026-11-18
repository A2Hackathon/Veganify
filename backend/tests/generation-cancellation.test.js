import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createGenerationService } from '../utils/generationService.js';

test('disconnected recipe generation does not persist late model results', async t => {
  const root = fs.mkdtempSync(new URL('../generation-fixture-', import.meta.url));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  for (const dir of ['routes', 'utils', 'config']) fs.cpSync(new URL('../' + dir, import.meta.url), join(root, dir), {recursive: true});
  fs.writeFileSync(join(root, 'utils/llmClient.js'), `
    export let signal;
    export let release;
    let started;
    export const ready = new Promise(resolve => { started = resolve; });
    const gate = new Promise(resolve => { release = resolve; });
    export async function generateRecipes(ingredients, count, user, options) {
      signal = options?.signal; started(); await gate;
      return [{title: 'Rice', ingredients: [], steps: ['Cook rice.']}];
    }
    export async function extractIngredients() { throw new Error('unused'); }
    export async function rewriteRecipeSteps() { throw new Error('unused'); }
  `);
  const model = await import(pathToFileURL(join(root, 'utils/llmClient.js')).href);
  const {default: router} = await import(pathToFileURL(join(root, 'routes/recipes.js')).href);
  const handle = router.stack.find(layer => layer.route?.path === '/generate').route.stack[0].handle;
  const req = Object.assign(new EventEmitter(), {body: {userId: 'demo', ingredients: ['rice']}});
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

test('generation forwards cancellation to completion and preserves its reason', async () => {
  const controller = new AbortController();
  const reason = new Error('cancelled fixture');
  let signal;
  const generate = createGenerationService(async (body, options) => {
    signal = options?.signal;
    controller.abort(reason);
    throw reason;
  });
  await assert.rejects(generate(['rice'], 1, {dietLevel: 'vegan'}, {signal: controller.signal}), error => error === reason);
  assert.equal(signal, controller.signal);
  let calls = 0;
  await assert.rejects(createGenerationService(async () => { calls++; })(['rice'], 1, {}, {signal: controller.signal}), error => error === reason);
  assert.equal(calls, 0);
});
