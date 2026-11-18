import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

test('meal retries replay one durable award across concurrent requests and restart', async t => {
  const root = fs.mkdtempSync(new URL('../meal-retry-fixture-', import.meta.url));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  for (const dir of ['routes', 'utils']) fs.cpSync(new URL('../' + dir, import.meta.url), join(root, dir), {recursive: true});
  const storage = await import(pathToFileURL(join(root, 'utils/jsonStorage.js')).href);
  const routeUrl = pathToFileURL(join(root, 'routes/impact.js')).href;
  const {default: router} = await import(routeUrl);
  const handle = router.stack.find(layer => layer.route?.path === '/log-meal').route.stack[0].handle;
  const user = await storage.UserStorage.create({sproutName: 'Albert'});
  async function request(key, userId = user._id) {
    let status = 200, body;
    await handle({body: {userId}, headers: key === undefined ? {} : {'idempotency-key': key}}, {
      status(value) { status = value; return this; }, json(value) { body = value; },
    });
    return {status, body};
  }
  const responses = await Promise.all(Array.from({length: 20}, () => request('meal-1')));
  assert.ok(responses.every(result => result.status === 200));
  for (const result of responses) assert.deepEqual(result.body, responses[0].body);
  assert.equal(responses[0].body.xp, 10);
  assert.equal((await storage.UserImpactStorage.findOne({user_id: user._id})).total_meals_logged, 1);
  await request('meal-2');
  assert.deepEqual(await request('meal-1'), responses[0], 'replay returns the original snapshot');
  const script = `const {default: r} = await import(${JSON.stringify(routeUrl)}); const h = r.stack.find(l => l.route?.path === '/log-meal').route.stack[0].handle; await h({body:{userId:${JSON.stringify(user._id)}},headers:{'idempotency-key':'meal-1'}},{status(){throw Error('unexpected status')},json(body){console.log(JSON.stringify(body))}});`;
  assert.deepEqual(JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', script], {encoding:'utf8'})), responses[0].body);
  assert.equal((await request('meal-1', 'different-user')).status, 409);
  for (const key of ['', 'bad key', 'x'.repeat(129), ['duplicate', 'headers']]) assert.equal((await request(key)).status, 400);
  assert.equal((await storage.UserImpactStorage.findOne({user_id: user._id})).xp, 20);
  await storage.UserImpactStorage.update(user._id, impact => {
    const template = impact.meal_receipts[0];
    impact.meal_receipts = Array.from({length: 1000}, (_, index) => ({...template, key: index === 0 ? 'meal-1' : 'capacity-' + index}));
  });
  assert.deepEqual(await request('meal-1'), responses[0], 'retained receipts replay at capacity');
  assert.equal((await request('overflow')).status, 503);
  assert.equal((await storage.UserImpactStorage.findOne({user_id: user._id})).xp, 20);
  await storage.UserImpactStorage.update(user._id, impact => { impact.meal_receipts[999].created_ms = 0; });
  assert.equal((await request('overflow')).status, 200, 'expired receipts free capacity');
  assert.equal((await storage.UserImpactStorage.findOne({user_id: user._id})).meal_receipts.length, 1000);
  await request(undefined);
  assert.equal((await storage.UserImpactStorage.findOne({user_id: user._id})).xp, 40, 'legacy calls retain existing behavior');
});
