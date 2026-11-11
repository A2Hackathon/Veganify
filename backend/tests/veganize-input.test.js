import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import veganize from '../routes/veganize.js';
import { UserStorage, RecipeStorage } from '../utils/jsonStorage.js';

test('two-step adaptation rejects malformed requests before accessing storage', async t => {
  let calls = 0;
  for (const [storage, method] of [[UserStorage, 'findOne'], [UserStorage, 'findById'], [RecipeStorage, 'create']]) {
    t.mock.method(storage, method, async () => { calls++; throw new Error('unexpected storage'); });
  }
  const app = express();
  app.use(express.json({ strict: false }));
  app.use('/veganize', veganize);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    for (const route of ['analyze', 'commit']) {
      const valid = { userId: 'u', recipeText: 'Cook rice', substitutions: [] };
      const invalid = [null, [], 1, {},
        ...[null, {}, 1, '', ' ', 'x'.repeat(129)].map(userId => ({ ...valid, userId })),
        ...[null, {}, 1, '', ' ', 'x'.repeat(8001)].map(recipeText => ({ ...valid, recipeText })),
      ];
      if (route === 'commit') invalid.push(
        ...[null, {}, [null], [{}], [{ original: 'milk', substitute: 1 }],
          [{ original: ' ', substitute: 'oat milk' }], Array(101).fill({ original: 'milk', substitute: 'oat milk' })]
          .map(substitutions => ({ ...valid, substitutions })),
        { ...valid, originalPrompt: {} },
      );
      for (const body of invalid) {
        const response = await fetch(`http://127.0.0.1:${server.address().port}/veganize/${route}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
          signal: AbortSignal.timeout(2000),
        });
        await response.json();
        assert.equal(response.status, 400, `${route}: ${JSON.stringify(body)}`);
        assert.equal(calls, 0);
      }
    }
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test('two-step parser preserves iOS and legacy aliases with bounded projected substitutions', async () => {
  const { parseVeganizeRequest: parse } = await import('../utils/recipeInput.js');
  assert.deepEqual(parse({ userID: 'u', recipe: 'Milk' }), { userId: 'u', recipeContent: 'Milk' });
  const subs = [{ original: 'milk', substitute: 'oat milk', extra: true }];
  const expected = { userId: undefined, recipeContent: 'Cook milk',
    subs: [{ original: 'milk', substitute: 'oat milk' }], originalPrompt: '' };
  assert.deepEqual(parse({ recipe: { text: 'Cook milk' }, chosenSubs: subs }, { commit: true }), expected);
  assert.deepEqual(parse({ recipeText: 'Cook milk', substitutions: subs }, { commit: true }), expected);
  assert.equal(parse({ userId: 'u'.repeat(128), recipeText: 'x'.repeat(8000) }).recipeContent.length, 8000);
  assert.equal(parse({ recipe: 'x', chosenSubs: Array(100).fill({ original: 'a'.repeat(200), substitute: 'b'.repeat(200) }) }, { commit: true }).subs.length, 100);
  assert.throws(() => parse({ userId: {}, userID: 'u', recipe: 'x' }));
  assert.throws(() => parse({ recipeText: null, recipe: 'x', substitutions: [], chosenSubs: [] }, { commit: true }));
  assert.throws(() => parse({ recipe: 'x', substitutions: null, chosenSubs: [] }, { commit: true }));
});
