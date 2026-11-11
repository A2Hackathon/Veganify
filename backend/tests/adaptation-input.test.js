import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import recipes from '../routes/recipes.js';
import { UserStorage } from '../utils/jsonStorage.js';

test('single-step adaptation rejects malformed input before storage or inference', async t => {
  let lookups = 0;
  t.mock.method(UserStorage, 'findOne', async () => { lookups++; throw new Error('unexpected lookup'); });
  const app = express();
  app.use(express.json({ strict: false }));
  app.use('/recipes', recipes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    for (const body of [null, [], 1, {},
      ...[null, {}, 1, '', ' ', 'x'.repeat(129)].map(userId => ({ userId, inputText: 'Cook rice' })),
      ...[null, {}, 1, [], '', ' ', 'x'.repeat(8001)].map(inputText => ({ userId: 'u', inputText })),
    ]) {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/recipes/veganize`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        signal: AbortSignal.timeout(2000),
      });
      await response.json();
      assert.equal(response.status, 400, JSON.stringify(body));
      assert.equal(lookups, 0);
    }
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test('adaptation accepts exact text limits without changing recipe content', async () => {
  const { parseAdaptationRequest } = await import('../utils/recipeInput.js');
  const body = { userId: 'u'.repeat(128), inputText: 'x'.repeat(8000) };
  assert.deepEqual(parseAdaptationRequest(body), body);
  assert.deepEqual(parseAdaptationRequest({ userId: 'u', inputText: '  Rice\nCook gently.  ' }),
    { userId: 'u', inputText: '  Rice\nCook gently.  ' });
});
