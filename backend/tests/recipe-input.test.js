import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import recipes from '../routes/recipes.js';
import { UserStorage, GroceryItemStorage } from '../utils/jsonStorage.js';
import { parseGenerationRequest } from '../utils/recipeInput.js';

test('invalid generation inputs are rejected before storage or inference', async t => {
  let lookups = 0;
  let groceries = [];
  t.mock.method(UserStorage, 'findOne', async () => { lookups++; return { _id: 'fixture' }; });
  t.mock.method(GroceryItemStorage, 'find', async () => groceries);
  const app = express();
  app.use(express.json({ strict: false }));
  app.use('/recipes', recipes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const post = async body => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/recipes/generate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(2000),
    });
    return { status: response.status, body: await response.json() };
  };
  try {
    for (const body of [
      { userId: 'fixture', ingredients: 'rice' },
      null, [], 1, {}, { userId: 1 }, { userId: ' ' }, { userId: 'x'.repeat(129) },
      ...[null, {}, [null], [' '], ['x'.repeat(201)], Array(101).fill('rice'), Array(41).fill('x'.repeat(200))]
        .map(ingredients => ({ userId: 'fixture', ingredients })),
      ...[null, {}, 42, 'x'.repeat(4001)].map(prompt => ({ userId: 'fixture', prompt })),
    ]) {
      const result = await post(body);
      assert.equal(result.status, 400);
      assert.equal(lookups, 0, 'invalid request accessed storage');
    }
    // These existing client shapes still select grocery fallback.
    for (const body of [{ userId: 'fixture' }, { userId: 'fixture', ingredients: [], prompt: '' }]) {
      const result = await post(body);
      assert.equal(result.status, 400); // The controlled grocery list is empty.
      assert.match(result.body.error, /No ingredients available/);
    }
    assert.equal(lookups, 2);
    for (const names of [[null], [' '], Array(101).fill('rice'), ['x'.repeat(201)]]) {
      groceries = names.map(name => ({ name }));
      const result = await post({ userId: 'fixture' });
      assert.equal(result.status, 400);
      assert.match(result.body.error, /Grocery ingredients/);
    }
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test('generation accepts exact limits and normalizes ingredient names', () => {
  const result = parseGenerationRequest({ userId: 'x'.repeat(128), prompt: 'p'.repeat(4000),
    ingredients: Array.from({ length: 40 }, (_, i) => String(i).padEnd(200, 'x')) });
  assert.equal(result.ingredients.length, 40);
  assert.equal(result.ingredients.join('').length, 8000);
  assert.equal(result.prompt.length, 4000);
  assert.equal(parseGenerationRequest({ userId: 'u', ingredients: Array.from({ length: 100 }, (_, i) => String(i)) }).ingredients.length, 100);
  assert.deepEqual(parseGenerationRequest({ userId: ' u ', ingredients: [' rice ', 'rice', 'beans'] }),
    { userId: 'u', ingredients: ['rice', 'beans'], prompt: '' });
});
