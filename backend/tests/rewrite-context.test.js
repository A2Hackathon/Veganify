import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

test('both rewrite routes pass saved restrictions and commit requires an existing profile', async t => {
  const root = fs.mkdtempSync(new URL('../rewrite-fixture-', import.meta.url));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  for (const dir of ['routes', 'utils', 'config']) fs.cpSync(new URL('../' + dir, import.meta.url), join(root, dir), {recursive: true});
  fs.writeFileSync(join(root, 'utils/llmClient.js'), `
    export const contexts = [];
    export async function extractIngredients() { return ['rice']; }
    export async function rewriteRecipeSteps(subs, text, user) { contexts.push(user); return 'Cook rice.'; }
    export async function generateRecipes() { throw new Error('unused'); }
    export async function isAllowedForUser() { throw new Error('unused'); }
  `);
  const storage = await import(pathToFileURL(join(root, 'utils/jsonStorage.js')).href);
  const model = await import(pathToFileURL(join(root, 'utils/llmClient.js')).href);
  async function handler(file, path) {
    const {default: router} = await import(pathToFileURL(join(root, 'routes', file)).href);
    return router.stack.find(layer => layer.route?.path === path).route.stack[0].handle;
  }
  const single = await handler('recipes.js', '/veganize');
  const commit = await handler('veganize.js', '/commit');
  async function request(handle, body) {
    let status = 200;
    await handle({body}, {status(code) { status = code; return this; }, json() {}});
    return status;
  }
  const body = {recipeText: 'Cook rice.', substitutions: []};
  assert.equal(await request(commit, body), 404);
  assert.equal(model.contexts.length, 0);
  const user = await storage.UserStorage.create({sproutName: 'Albert', dietLevel: 'pescatarian', extraForbiddenTags: ['soy']});
  assert.equal(await request(single, {userId: user._id, inputText: 'Cook rice.'}), 200);
  assert.equal(await request(commit, body), 200);
  assert.equal(await request(commit, {...body, userId: user._id}), 200);
  assert.equal(model.contexts.length, 3);
  for (const context of model.contexts) {
    assert.equal(context.dietLevel, 'pescatarian');
    assert.deepEqual(context.extraForbiddenTags, ['soy']);
  }
});
