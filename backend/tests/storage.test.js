import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { syncBuiltinESMExports } from 'node:module';
import { execFileSync } from 'node:child_process';

async function fixture(t) {
  const root = fs.mkdtempSync(join(tmpdir(), 'veganify-storage-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(join(root, 'utils'));
  const modulePath = join(root, 'utils', 'storage.mjs');
  fs.copyFileSync(new URL('../utils/jsonStorage.js', import.meta.url), modulePath);
  const storage = await import(pathToFileURL(modulePath));
  return { storage, root, modulePath, file: join(root, 'data', 'recipes.json') };
}

test('corrupt or non-array storage rejects reads and mutations without replacement', async t => {
  const { storage, file } = await fixture(t);
  for (const content of ['{broken', '{}', 'null', '42']) {
    fs.writeFileSync(file, content);
    await assert.rejects(storage.RecipeStorage.find({}));
    await assert.rejects(storage.RecipeStorage.create({ title: 'must not replace' }));
    assert.equal(fs.readFileSync(file, 'utf8'), content);
  }
});

test('a partial write failure rejects the operation and preserves the old file', async t => {
  const { storage, root, file } = await fixture(t);
  await storage.RecipeStorage.create({ title: 'original' });
  const before = fs.readFileSync(file, 'utf8');
  const write = fs.writeFileSync;
  const stub = t.mock.method(fs, 'writeFileSync', (target, ...args) => {
    write(target, '[partial', ...args.slice(1));
    throw new Error('injected disk failure');
  });
  syncBuiltinESMExports();
  try {
    await assert.rejects(storage.RecipeStorage.create({ title: 'lost' }), /injected disk failure/);
  } finally {
    stub.mock.restore();
    syncBuiltinESMExports();
  }
  assert.equal(fs.readFileSync(file, 'utf8'), before);
  assert.deepEqual(fs.readdirSync(join(root, 'data')).sort(),
    ['groceryItems.json', 'recipes.json', 'userImpact.json', 'users.json']);
});

test('failed replacement rejects and removes its temporary file', async t => {
  const { storage, root, file } = await fixture(t);
  await storage.RecipeStorage.create({ title: 'original' });
  const before = fs.readFileSync(file, 'utf8');
  const stub = t.mock.method(fs, 'renameSync', () => { throw new Error('injected rename failure'); });
  syncBuiltinESMExports();
  try {
    await assert.rejects(storage.RecipeStorage.create({ title: 'lost' }), /injected rename failure/);
  } finally {
    stub.mock.restore();
    syncBuiltinESMExports();
  }
  assert.equal(fs.readFileSync(file, 'utf8'), before);
  assert.equal(fs.readdirSync(join(root, 'data')).length, 4);
});

test('successful storage operations persist across a fresh process', async t => {
  const { storage, modulePath } = await fixture(t);
  const user = await storage.UserStorage.create({ name: 'Demo' });
  await storage.UserStorage.findByIdAndUpdate(user._id, { name: 'Updated' });
  const recipe = await storage.RecipeStorage.create({ userId: user._id, title: 'Beans' });
  const grocery = await storage.GroceryItemStorage.create({ userId: user._id, name: 'Beans' });
  await storage.GroceryItemStorage.findByIdAndUpdate(grocery._id, { isChecked: true });
  assert.equal((await storage.GroceryItemStorage.find({}))[0].isChecked, true);
  await storage.GroceryItemStorage.findByIdAndDelete(grocery._id);
  const impact = await storage.UserImpactStorage.create({ user_id: user._id, xp: 1 });
  await storage.UserImpactStorage.save({ ...impact, xp: 2 });
  const script = `const s = await import(${JSON.stringify(pathToFileURL(modulePath).href)});
    console.log(JSON.stringify({users:await s.UserStorage.countDocuments(),
      recipe:await s.RecipeStorage.findById(${JSON.stringify(recipe._id)}),
      groceries:await s.GroceryItemStorage.find({}),
      impact:await s.UserImpactStorage.findOne({user_id:${JSON.stringify(user._id)}})}));`;
  const result = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' }));
  assert.equal(result.users, 1);
  assert.equal(result.recipe.title, 'Beans');
  assert.deepEqual(result.groceries, []);
  assert.equal(result.impact.xp, 2);
});
