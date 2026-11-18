import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

test('single-step adaptation stops after cancellation at either inference stage', async t => {
  const root = fs.mkdtempSync(new URL('../single-adapt-fixture-', import.meta.url));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  for (const dir of ['routes', 'utils', 'config']) fs.cpSync(new URL('../' + dir, import.meta.url), join(root, dir), {recursive: true});
  fs.writeFileSync(join(root, 'utils/llmClient.js'), `
    export let signals = [];
    export let rewrites = 0;
    let callback = () => {};
    export function configure(fn) { callback = fn; signals = []; rewrites = 0; }
    export async function extractIngredients(text, options) {
      signals.push(options?.signal); await callback('extract'); return ['rice'];
    }
    export async function rewriteRecipeSteps(subs, text, user, options) {
      rewrites++; signals.push(options?.signal); await callback('rewrite'); return 'Cook rice.';
    }
    export async function generateRecipes() { throw new Error('unused'); }
  `);
  const model = await import(pathToFileURL(join(root, 'utils/llmClient.js')).href);
  const {default: router} = await import(pathToFileURL(join(root, 'routes/recipes.js')).href);
  const handle = router.stack.find(layer => layer.route?.path === '/veganize').route.stack[0].handle;
  for (const phase of ['extract', 'rewrite', 'connected']) {
    const req = Object.assign(new EventEmitter(), {body: {userId: 'demo', inputText: 'Cook rice.'}});
    const res = Object.assign(new EventEmitter(), {writes: 0, writableFinished: false,
      status() { return this; }, json() { this.writes++; this.writableFinished = true; }});
    model.configure(async stage => { if (stage === phase) res.emit('close'); });
    await handle(req, res);
    assert.equal(JSON.parse(fs.readFileSync(join(root, 'data/recipes.json'), 'utf8')).length, phase === 'connected' ? 1 : 0);
    assert.equal(res.writes, phase === 'connected' ? 1 : 0);
    assert.equal(model.rewrites, phase === 'extract' ? 0 : 1);
    for (const signal of model.signals) assert.equal(signal?.aborted, phase !== 'connected');
    assert.equal(req.listenerCount('aborted'), 0);
    assert.equal(res.listenerCount('close'), 0);
  }
});
