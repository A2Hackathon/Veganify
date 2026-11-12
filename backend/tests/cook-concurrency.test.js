import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

test('concurrent cooking and meal awards preserve progress across restart', async t => {
  const root = fs.mkdtempSync(new URL('../cook-fixture-', import.meta.url));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  for (const dir of ['routes', 'utils']) fs.mkdirSync(join(root, dir));
  for (const file of ['routes/cookWithThis.js', 'routes/impact.js', 'utils/jsonStorage.js']) {
    fs.copyFileSync(new URL('../' + file, import.meta.url), join(root, file));
  }
  fs.writeFileSync(join(root, 'utils/llmClient.js'), `
    let fail = false;
    export function failGeneration() { fail = true; }
    export async function generateRecipes() {
      if (fail) throw new Error('controlled model failure');
      return [{title: 'fixture'}];
    }
  `);
  const storageUrl = pathToFileURL(join(root, 'utils/jsonStorage.js')).href;
  const {UserStorage, UserImpactStorage} = await import(storageUrl);
  const user = await UserStorage.create({sproutName: 'Albert'});
  await UserImpactStorage.create({user_id: user._id, xp: 90, total_meals_logged: 9, coins: 7});
  async function handler(file, path) {
    const {default: router} = await import(pathToFileURL(join(root, 'routes', file)).href);
    return router.stack.find(layer => layer.route?.path === path).route.stack[0].handle;
  }
  const cook = await handler('cookWithThis.js', '/');
  const meal = await handler('impact.js', '/log-meal');
  const responses = [];
  const res = {json: body => responses.push(body), status: code => assert.fail(`Unexpected status ${code}`)};
  const next = error => { throw error; };
  await Promise.all(Array.from({length: 20}, () => [
    cook({body: {user_id: user._id}}, res, next),
    meal({body: {userId: user._id}}, res, next),
  ]).flat());
  const saved = await UserImpactStorage.findOne({user_id: user._id});
  assert.equal(saved.xp, 390);
  assert.equal(saved.total_meals_logged, 29);
  assert.equal(saved.coins, 7);
  assert.equal(saved.streak_days, 1);
  assert.equal(saved.forest_stage, 'SAPLING');
  assert.equal(responses.filter(body => body.recipes).length, 20);
  const script = `const s = await import(${JSON.stringify(storageUrl)}); console.log(JSON.stringify(await s.UserImpactStorage.findOne({user_id:${JSON.stringify(user._id)}})));`;
  const restored = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', script], {encoding: 'utf8'}));
  assert.deepEqual(restored, saved);
  const {failGeneration} = await import(pathToFileURL(join(root, 'utils/llmClient.js')).href);
  failGeneration();
  await assert.rejects(cook({body: {user_id: user._id}}, res, next), /controlled model failure/);
  assert.deepEqual(await UserImpactStorage.findOne({user_id: user._id}), saved);
});
