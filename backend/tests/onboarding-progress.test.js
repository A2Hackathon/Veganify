import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import onboarding from '../routes/onboarding.js';
import { UserStorage, UserImpactStorage } from '../utils/jsonStorage.js';

test('repeat onboarding preserves progress and does not create duplicate impact records', async t => {
  const user = { _id: 'u', name: 'User', sproutName: 'Albert' };
  let impact = { user_id: 'u', xp: 250, coins: 17, streak_days: 4 };
  let creates = 0;
  t.mock.method(UserStorage, 'findOne', async () => user);
  t.mock.method(UserStorage, 'findByIdAndUpdate', async (_, update) => ({ ...user, ...update }));
  t.mock.method(UserImpactStorage, 'findOne', async () => impact);
  t.mock.method(UserImpactStorage, 'create', async value => { creates++; impact = value; return value; });
  const app = express(); app.use(express.json()); app.use(onboarding);
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const post = async () => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/profile`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eatingStyle: 'Vegan' }) });
    assert.equal(response.status, 200); return response.json();
  };
  try {
    for (let i = 0; i < 2; i++) {
      const profile = await post();
      assert.equal(profile.xp, 250); assert.equal(profile.coins, 17); assert.equal(profile.streakDays, 4);
      assert.ok(profile.level > 1); assert.equal(creates, 0);
    }
    impact = null;
    const first = await post();
    assert.equal(first.xp, 0); assert.equal(first.level, 1); assert.equal(first.xpToNextLevel, 100);
    await post(); assert.equal(creates, 1);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
