import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

test('cooking rejects invalid grocery lists before inference or progress writes', async t => {
  const root = fs.mkdtempSync(new URL('../cook-input-fixture-', import.meta.url));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  for (const dir of ['routes', 'utils']) fs.mkdirSync(join(root, dir));
  for (const file of ['routes/cookWithThis.js', 'utils/jsonStorage.js', 'utils/scanResults.js']) {
    fs.copyFileSync(new URL('../' + file, import.meta.url), join(root, file));
  }
  fs.writeFileSync(join(root, 'utils/llmClient.js'), `
    export let calls = 0;
    export let received;
    export async function generateRecipes(ingredients) { calls++; received = ingredients; return []; }
  `);
  const storage = await import(pathToFileURL(join(root, 'utils/jsonStorage.js')).href);
  const model = await import(pathToFileURL(join(root, 'utils/llmClient.js')).href);
  const user = await storage.UserStorage.create({sproutName: 'Albert'});
  const {default: router} = await import(pathToFileURL(join(root, 'routes/cookWithThis.js')).href);
  const cook = router.stack.find(layer => layer.route?.path === '/').route.stack[0].handle;
  let items = [];
  t.mock.method(storage.GroceryItemStorage, 'find', async () => items.map(name => ({name})));
  async function request() {
    let status = 200;
    await cook({body: {user_id: user._id}}, {
      status(code) { status = code; return this; }, json() {},
    }, error => { throw error; });
    return status;
  }
  for (const names of [[], [null], [' '], ['x'.repeat(201)], Array(101).fill('rice'), Array(41).fill('x'.repeat(200))]) {
    items = names;
    assert.equal(await request(), 400);
    assert.equal(model.calls, 0);
    assert.equal(await storage.UserImpactStorage.findOne({user_id: user._id}), null);
  }
  items = [' rice ', 'rice'];
  assert.equal(await request(), 200);
  assert.deepEqual(model.received, ['rice']);
  assert.equal(model.calls, 1);
  assert.equal((await storage.UserImpactStorage.findOne({user_id: user._id})).xp, 5);
});
