import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import profile from '../routes/profile.js';
import { UserStorage, UserImpactStorage } from '../utils/jsonStorage.js';

test('profile queries reject structured or oversized IDs before storage', async t => {
  let calls = 0;
  t.mock.method(UserStorage, 'findOne', async () => { calls++; return { _id: 'u', dietLevel: 'vegan' }; });
  t.mock.method(UserImpactStorage, 'findOne', async () => null);
  const app = express(); app.use('/profile', profile);
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  try {
    for (const query of ['', 'userId=', 'userId=%20', 'userId[]=u', 'userId[x]=u', 'userId=a&userId=b', 'userId=' + 'x'.repeat(129)]) {
      const r = await fetch(`http://127.0.0.1:${server.address().port}/profile?${query}`);
      await r.json(); assert.equal(r.status, 400, query); assert.equal(calls, 0);
    }
    const r = await fetch(`http://127.0.0.1:${server.address().port}/profile?userId=${'x'.repeat(128)}`);
    assert.equal(r.status, 200); await r.json(); assert.equal(calls, 1);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

test('restriction parsing validates input and returns only bounded lists', async () => {
  const app = express(); app.use(express.json({ strict: false })); app.use('/profile', profile);
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const post = async body => {
    const r = await fetch(`http://127.0.0.1:${server.address().port}/profile/parse-restrictions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: r.status, body: await r.json() };
  };
  try {
    for (const body of [null, [], {}, { text: {} }, { text: 1 }, { text: '' }, { text: ' ,\n ' },
      { text: 'x'.repeat(8001) }, { text: 'x'.repeat(201) }, { text: Array(101).fill('x').join(',') }]) {
      assert.equal((await post(body)).status, 400);
    }
    assert.deepEqual(await post({ text: ' peanuts,\n milk ,, eggs ' }), { status: 200, body: { restrictions: ['peanuts', 'milk', 'eggs'] } });
    assert.equal((await post({ text: Array(100).fill('x').join(',') })).body.restrictions.length, 100);
    assert.equal((await post({ text: 'x'.repeat(200) })).status, 200);
    assert.equal((await post({ text: 'x' + ' '.repeat(7999) })).status, 200);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
