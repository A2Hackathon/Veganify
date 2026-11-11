import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import impact from '../routes/impact.js';
import { UserStorage } from '../utils/jsonStorage.js';

test('invalid meal requests never access or mutate storage', async t => {
  let calls = 0;
  t.mock.method(UserStorage, 'findOne', async () => { calls++; throw new Error('unexpected lookup'); });
  t.mock.method(console, 'error', () => {});
  const app = express();
  app.use(express.json({ strict: false }));
  app.use(impact);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    for (const body of [null, 7, [], {}, { userId: null }, { userId: true }, { userId: {} },
      { userId: [] }, { userId: 7 }, { userId: ' ' }, { userId: 'x'.repeat(129) }]) {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/log-meal`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body), signal: AbortSignal.timeout(2000),
      });
      assert.equal(response.status, 400);
      assert.equal(calls, 0);
    }
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
