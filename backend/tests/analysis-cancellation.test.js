import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

test('adaptation analysis stops after cancellation at either inference stage', async t => {
  const root = fs.mkdtempSync(new URL('../analysis-cancel-fixture-', import.meta.url));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  for (const dir of ['routes', 'utils', 'config']) fs.cpSync(new URL('../' + dir, import.meta.url), join(root, dir), {recursive: true});
  fs.writeFileSync(join(root, 'utils/llmClient.js'), `
    export let signals = [];
    export let analyses = 0;
    let callback = () => {};
    export function configure(fn) { callback = fn; signals = []; analyses = 0; }
    export async function extractIngredients(text, options) {
      signals.push(options?.signal); await callback('extract'); return ['rice'];
    }
    export async function isAllowedForUser(prefs, ingredients, options) {
      analyses++; signals.push(options?.signal); await callback('analysis'); return [{ingredient: 'rice', allowed: 'Allowed', reason: 'fixture', suggestions: []}];
    }
    export async function rewriteRecipeSteps() { throw new Error('unused'); }
  `);
  const model = await import(pathToFileURL(join(root, 'utils/llmClient.js')).href);
  const {default: router} = await import(pathToFileURL(join(root, 'routes/veganize.js')).href);
  const handle = router.stack.find(layer => layer.route?.path === '/analyze').route.stack[0].handle;
  for (const phase of ['extract', 'analysis', 'connected']) {
    const req = Object.assign(new EventEmitter(), {body: {userId: 'demo', recipeText: 'Cook rice.'}});
    const res = Object.assign(new EventEmitter(), {writes: 0, writableFinished: false,
      status() { return this; }, json() { this.writes++; this.writableFinished = true; }});
    model.configure(async stage => { if (stage === phase) res.emit('close'); });
    await handle(req, res);
    assert.equal(JSON.parse(fs.readFileSync(join(root, 'data/recipes.json'), 'utf8')).length, 0);
    assert.equal(res.writes, phase === 'connected' ? 1 : 0);
    assert.equal(model.analyses, phase === 'extract' ? 0 : 1);
    for (const signal of model.signals) assert.equal(signal?.aborted, phase !== 'connected');
    assert.equal(req.listenerCount('aborted'), 0);
    assert.equal(res.listenerCount('close'), 0);
  }
});
