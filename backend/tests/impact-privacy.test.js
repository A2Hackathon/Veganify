import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import impact from '../routes/impact.js';
import { UserStorage } from '../utils/jsonStorage.js';

test('meal failures do not expose storage exception data in logs or responses', async t => {
  const marker = 'private-meal-user-and-storage-path';
  const logs = [];
  t.mock.method(console, 'error', (...args) => logs.push(args.map(String).join(' ')));
  t.mock.method(UserStorage, 'findOne', async () => { throw new Error(marker); });
  const app = express(); app.use(express.json()); app.use(impact);
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/log-meal`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: 'fixture' }) });
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: 'Failed to log meal' });
    assert.ok(logs.length > 0);
    assert.ok(!logs.join('\n').includes(marker));
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
