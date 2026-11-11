import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import profile from '../routes/profile.js';
import { UserStorage, UserImpactStorage } from '../utils/jsonStorage.js';

test('partial profile updates preserve preferences and shared record identity', async t => {
  let user = { _id: 'shared', name: 'Before', dietLevel: 'vegan', sproutName: 'Albert',
    extraForbiddenTags: ['peanuts'], preferredCuisines: ['Indian'], cookingStylePreferences: ['Mild'] };
  t.mock.method(UserStorage, 'findOne', async query => user.sproutName === query.sproutName ? user : null);
  t.mock.method(UserStorage, 'findByIdAndUpdate', async (id, update) => { assert.equal(id, 'shared'); user = { ...user, ...update }; return user; });
  t.mock.method(UserStorage, 'create', async () => { assert.fail('must not recreate shared user'); });
  t.mock.method(UserImpactStorage, 'findOne', async () => null);
  t.mock.method(console, 'log', () => {});
  const app = express(); app.use(express.json()); app.use('/profile', profile);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/profile`;
  const patch = async body => {
    const r = await fetch(base, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal(r.status, 200); return r.json();
  };
  try {
    const changed = await patch({ id: 'shared', userName: 'After', sproutName: 'Fern' });
    assert.deepEqual(changed.dietaryRestrictions, ['peanuts']);
    assert.deepEqual(changed.cuisinePreferences, ['Indian']);
    assert.deepEqual(changed.cookingStylePreferences, ['Mild']);
    assert.equal(changed.sproutName, 'Albert');
    const r = await fetch(base + '?userId=ALBERT_SHARED_USER');
    assert.equal(r.status, 200);
    assert.equal((await r.json()).userName, 'After');
    const cleared = await patch({ id: 'shared', dietaryRestrictions: [], cuisinePreferences: [], cookingStylePreferences: [] });
    assert.deepEqual(cleared.dietaryRestrictions, []);
    assert.deepEqual(cleared.cuisinePreferences, []);
    assert.deepEqual(cleared.cookingStylePreferences, []);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
