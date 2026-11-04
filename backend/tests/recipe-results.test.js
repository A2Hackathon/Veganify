import test from 'node:test';
import assert from 'node:assert/strict';
import { extractedIngredients, rewrittenRecipe } from '../utils/recipeResults.js';

test('extraction requires a bounded nonempty ingredient list', () => {
  for (const value of [undefined, null, {}, 42, '', ' \n ', 'x'.repeat(201),
    Array(101).fill('rice').join('\n'), 'x'.repeat(8001)]) {
    assert.throws(() => extractedIngredients(value));
  }
  assert.deepEqual(extractedIngredients('- milk\n2. rice\n• milk'), ['milk', 'rice']);
});

test('rewriting requires bounded nonempty model text without an original-recipe fallback', () => {
  for (const value of [undefined, null, {}, 42, '', ' \n ', 'x'.repeat(16001)]) {
    assert.throws(() => rewrittenRecipe(value));
  }
  assert.equal(rewrittenRecipe('  Cook tofu.\nServe.  '), 'Cook tofu.\nServe.');
});
