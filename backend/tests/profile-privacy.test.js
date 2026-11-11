import test from 'node:test';
import assert from 'node:assert/strict';
import { inspect } from 'node:util';
import express from 'express';
import profile from '../routes/profile.js';
import onboarding from '../routes/onboarding.js';
import { UserStorage, UserImpactStorage } from '../utils/jsonStorage.js';

test('profile diagnostics and errors exclude personal data and storage exceptions', async t => {
  const marker = 'private-profile-marker';
  const logs = [];
  for (const method of ['log', 'warn', 'error']) t.mock.method(console, method, (...args) => logs.push(inspect(args)));
  let fail = false;
  const user = { _id: marker, name: marker, sproutName: marker, dietLevel: 'vegan', extraForbiddenTags: [marker], preferredCuisines: [marker], cookingStylePreferences: [marker] };
  t.mock.method(UserStorage, 'findOne', async () => { if (fail) throw new Error(marker); return user; });
  t.mock.method(UserStorage, 'findByIdAndUpdate', async () => user);
  t.mock.method(UserImpactStorage, 'findOne', async () => null);
  t.mock.method(UserImpactStorage, 'create', async () => { throw new Error(marker); });
  const app = express(); app.use(express.json()); app.use('/profile', profile); app.use('/onboarding', onboarding);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    for (const failure of [false, true]) {
      fail = failure;
      for (const [path, method] of [['/profile?userId=ALBERT_SHARED_USER', 'GET'], ['/profile', 'PATCH'], ['/onboarding/profile', 'POST']]) {
        const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method,
          headers: { 'Content-Type': 'application/json' },
          ...(method === 'GET' ? {} : { body: JSON.stringify({ id: marker, eatingStyle: 'Vegan', sproutName: marker }) }) });
        assert.equal(response.status, failure ? 500 : 200);
        const body = await response.text();
        if (failure) assert.ok(!body.includes(marker));
        assert.ok(!logs.join('\n').includes(marker), 'private profile or exception leaked into diagnostics');
      }
    }
    assert.ok(logs.some(line => line.includes('Failed to create UserImpact')));
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
