import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import profile from '../routes/profile.js';
import onboarding from '../routes/onboarding.js';
import { UserStorage, UserImpactStorage } from '../utils/jsonStorage.js';

test('profile and onboarding use exact diet mappings without silently weakening unknown diets', async t => {
  let calls = 0;
  let user = { _id: 'shared', name: 'User', sproutName: 'Albert', dietLevel: 'vegan', extraForbiddenTags: [], preferredCuisines: [], cookingStylePreferences: [] };
  t.mock.method(console, 'log', () => {});
  t.mock.method(UserStorage, 'findOne', async () => { calls++; return user; });
  t.mock.method(UserStorage, 'findByIdAndUpdate', async (id, update) => { user = { ...user, ...update }; return user; });
  t.mock.method(UserImpactStorage, 'findOne', async () => null);
  t.mock.method(UserImpactStorage, 'create', async () => ({}));
  const app = express(); app.use(express.json()); app.use('/profile', profile); app.use('/onboarding', onboarding);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    for (const [path, method] of [['/profile', 'PATCH'], ['/onboarding/profile', 'POST']]) {
      const send = async eatingStyle => {
        const r = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method,
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'shared', eatingStyle }) });
        return { status: r.status, body: await r.json() };
      };
      for (const invalid of ['unknown', 'not vegan', '', ' ', null, {}, 42]) {
        const before = calls;
        assert.equal((await send(invalid)).status, 400);
        assert.equal(calls, before);
      }
      for (const [label, stored] of [['Vegan', 'vegan'], ['Ovo-vegetarian', 'ovo'], ['Lacto-vegetarian', 'lacto'],
        ['Lacto-ovo vegetarian', 'lacto_ovo'], ['Lacto-ovo-vegetarian', 'lacto_ovo'], ['Vegetarian', 'vegetarian'],
        ['Pescatarian', 'pescatarian'], ['Flexitarian', 'flexitarian'], ['  VEGAN  ', 'vegan']]) {
        assert.equal((await send(label)).status, 200);
        assert.equal(user.dietLevel, stored);
      }
    }
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
