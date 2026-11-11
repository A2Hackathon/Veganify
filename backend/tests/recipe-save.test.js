import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import recipes from '../routes/recipes.js';
import { UserStorage, RecipeStorage } from '../utils/jsonStorage.js';

test('save validates both client shapes before storage and projects supported fields', async t => {
  let lookups = 0;
  const writes = [];
  t.mock.method(UserStorage, 'findOne', async () => { lookups++; return { _id: 'shared' }; });
  t.mock.method(RecipeStorage, 'create', async value => { writes.push(value); return { ...value, _id: 'stored' }; });
  const app = express();
  app.use(express.json({ strict: false }));
  app.use('/recipes', recipes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const post = async body => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/recipes/save`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      signal: AbortSignal.timeout(2000),
    });
    return { status: response.status, body: await response.json() };
  };
  try {
    for (const body of [null, [], 1, {}, { userId: {}, title: 'Rice' },
      { userId: ' ', title: 'Rice' }, { userId: 'x'.repeat(129), title: 'Rice' },
      { userId: 'u', recipe: null }, { userId: 'u', recipe: [] },
      ...[{ title: {} }, { title: ' ' }, { title: 'x'.repeat(201) }, { tags: 'vegan' },
        { ingredients: [{}] }, { ingredients: [{ name: 'Rice', amount: 1 }] },
        { steps: [null] }, { steps: Array(51).fill('Cook') }, { duration: {} },
        { previewImageUrl: [] }, { originalPrompt: {} }, { type: 'unknown' },
        { substitutionMap: { milk: [] } }, { substitutionMap: [] }]
        .flatMap(fields => [{ userId: 'u', title: 'Rice', ...fields },
          { userId: 'u', recipe: { title: 'Rice', ...fields } }]),
    ]) {
      assert.equal((await post(body)).status, 400, JSON.stringify(body));
      assert.equal(lookups, 0);
      assert.equal(writes.length, 0);
    }
    const recipe = { id: 'untrusted', userId: 'other', title: 'Rice', tags: ['vegan'],
      duration: '10 min', ingredients: [{ name: 'Rice', amount: null, unit: null, extra: true }],
      steps: ['Cook'], previewImageUrl: '', originalPrompt: null, type: 'veganized',
      substitutionMap: { milk: 'oat milk' }, extra: true };
    for (const body of [{ ...recipe, userId: 'u' }, { userId: 'u', recipe }]) {
      const result = await post(body);
      assert.equal(result.status, 200);
      assert.equal(result.body.id, 'stored');
      assert.equal(result.body.userId, 'shared');
      assert.deepEqual(result.body.ingredients, [{ name: 'Rice', amount: '', unit: '' }]);
      assert.deepEqual(result.body.substitutionMap, { milk: 'oat milk' });
      assert.equal(writes.at(-1).extra, undefined);
      assert.equal(writes.at(-1).id, undefined);
    }
    assert.equal((await post({ userId: 'u', title: 'Minimal' })).status, 200);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
