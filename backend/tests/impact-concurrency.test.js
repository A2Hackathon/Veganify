import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

test('concurrent meal handlers persist every increment and survive restart', async t => {
  const root = fs.mkdtempSync(new URL('../meal-fixture-', import.meta.url));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const dir of ['routes', 'utils']) fs.mkdirSync(join(root, dir));
  for (const file of ['routes/impact.js', 'utils/jsonStorage.js']) {
    fs.copyFileSync(new URL('../' + file, import.meta.url), join(root, file));
  }
  const storageUrl = pathToFileURL(join(root, 'utils/jsonStorage.js')).href;
  const { UserStorage, UserImpactStorage } = await import(storageUrl);
  const user = await UserStorage.create({ sproutName: 'Albert' });
  await UserImpactStorage.create({ user_id: user._id, xp: 90, total_meals_logged: 9, coins: 7 });
  const { default: router } = await import(pathToFileURL(join(root, 'routes/impact.js')).href);
  const handler = router.stack.find(layer => layer.route?.path === '/log-meal').route.stack[0].handle;
  const responses = [];
  await Promise.all(Array.from({ length: 20 }, () => handler({ body: { userId: user._id } }, {
    json: body => responses.push(body), status: code => { assert.fail(`Unexpected status ${code}`); }
  })));
  const saved = await UserImpactStorage.findOne({ user_id: user._id });
  assert.equal(saved.xp, 290); assert.equal(saved.total_meals_logged, 29);
  assert.equal(saved.coins, 7); assert.equal(saved.streak_days, 1);
  assert.equal(new Set(responses.map(body => body.xp)).size, 20);
  const script = `const s = await import(${JSON.stringify(storageUrl)}); console.log(JSON.stringify(await s.UserImpactStorage.findOne({user_id:${JSON.stringify(user._id)}})));`;
  const restored = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' }));
  assert.deepEqual(restored, saved);
});
