import test from 'node:test';
import assert from 'node:assert/strict';
import { getUserContext } from '../utils/userContext.js';
import { UserStorage, UserImpactStorage, RecipeStorage } from '../utils/jsonStorage.js';

test('chat context rejects unknown stored diets instead of weakening restrictions', async t => {
  let dietLevel;
  t.mock.method(UserStorage, 'findOne', async () => ({ _id: 'u', dietLevel, extraForbiddenTags: ['peanuts'] }));
  t.mock.method(UserImpactStorage, 'findOne', async () => null);
  t.mock.method(RecipeStorage, 'find', async () => []);
  for (const invalid of [undefined, null, '', 'unknown', {}, 1]) {
    dietLevel = invalid; await assert.rejects(getUserContext('u'));
  }
  for (const valid of ['vegan', 'ovo', 'lacto', 'lacto_ovo', 'vegetarian', 'pescatarian', 'flexitarian']) {
    dietLevel = valid.toUpperCase();
    const context = await getUserContext('u');
    assert.equal(context.user.dietLevel, valid);
    assert.deepEqual(context.user.extraForbiddenTags, ['peanuts']);
  }
});
