import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import profile from '../routes/profile.js';
import onboarding from '../routes/onboarding.js';
import { UserStorage } from '../utils/jsonStorage.js';

test('malformed profile fields are rejected before storage', async t => {
  let calls = 0;
  t.mock.method(UserStorage, 'findOne', async () => { calls++; throw new Error('unexpected storage'); });
  const app = express(); app.use(express.json({ strict: false })); app.use('/profile', profile); app.use('/onboarding', onboarding);
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  try {
    for (const [path, method] of [['/profile', 'PATCH'], ['/onboarding/profile', 'POST']]) {
      const bad = [null, [], 42];
      for (const field of ['dietaryRestrictions', 'cuisinePreferences', 'cookingStylePreferences']) {
        for (const value of ['rice', {}, [null], [' '], ['x'.repeat(201)], Array(101).fill('x'), Array(41).fill('x'.repeat(200))]) {
          bad.push({ id: 'u', eatingStyle: 'Vegan', [field]: value });
        }
      }
      for (const field of ['userName', 'sproutName']) {
        for (const value of [{}, 2, ' ', 'x'.repeat(201)]) bad.push({ id: 'u', eatingStyle: 'Vegan', [field]: value });
      }
      if (method === 'PATCH') for (const id of [null, {}, 2, ' ', 'x'.repeat(129)]) bad.push({ id });
      for (const body of bad) {
        const r = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method,
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        await r.json(); assert.equal(r.status, 400); assert.equal(calls, 0);
      }
    }
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

test('profile validation accepts boundaries, optional fields and explicit clearing', async () => {
  const { validateProfileInput: validate } = await import('../utils/profileInput.js');
  const body = { id: 'u'.repeat(128), userName: 'n'.repeat(200), sproutName: 's'.repeat(200),
    dietaryRestrictions: Array(40).fill('x'.repeat(200)), cuisinePreferences: Array(100).fill('x'), cookingStylePreferences: [] };
  assert.equal(validate(body), undefined);
  assert.equal(validate({ ...body, eatingStyle: 'Vegan' }, { onboarding: true }), 'vegan');
  assert.equal(validate({ id: 'u', dietaryRestrictions: null, cuisinePreferences: [], userName: null }), undefined);
  assert.equal(validate({ eatingStyle: 'Vegan' }, { onboarding: true }), 'vegan');
});
