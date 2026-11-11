import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { format } from 'node:util';
import recipes from '../routes/recipes.js';
import veganize from '../routes/veganize.js';
import { UserStorage } from '../utils/jsonStorage.js';

test('recipe storage failures expose no private exception details', async t => {
  const marker = 'private-recipe-storage-marker';
  const logs = [];
  t.mock.method(console, 'error', (...args) => logs.push(format(...args)));
  t.mock.method(UserStorage, 'findOne', async () => { throw new Error(marker); });
  const app = express();
  app.use(express.json());
  app.use('/recipes', recipes);
  app.use('/veganize', veganize);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const requests = [
      ['/recipes/generate', { userId: 'fixture', ingredients: ['rice'] }],
      ['/recipes/save', { userId: 'fixture', title: marker }],
      ['/recipes/veganize', { userId: 'fixture', inputText: marker }],
      ['/recipes/saved?userId=fixture', null],
      ['/veganize/analyze', { userId: 'fixture', recipeText: marker }],
      ['/veganize/commit', { userId: 'ALBERT_SHARED_USER', recipeText: marker, substitutions: [] }],
    ];
    for (const [path, body] of requests) {
      const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
        method: body ? 'POST' : 'GET', signal: AbortSignal.timeout(2000),
        headers: { 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      assert.equal(response.status, 500);
      assert.ok(!JSON.stringify(await response.json()).includes(marker));
    }
    assert.equal(logs.length, requests.length);
    assert.ok(!logs.join('\n').includes(marker), 'private error reached diagnostics');
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
