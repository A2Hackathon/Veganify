import test from 'node:test';
import assert from 'node:assert/strict';
import { createDietaryService } from '../utils/dietaryService.js';

test('each stored diet selects its own exclusions and allowances', async () => {
  const cases = [
    ['vegan', 'Exclude all animal products', ''],
    ['ovo', 'Exclude meat, seafood and dairy', 'Eggs are permitted'],
    ['lacto', 'Exclude meat, seafood and eggs', 'Dairy is permitted'],
    ['lacto_ovo', 'Exclude meat and seafood', 'Eggs and dairy are permitted'],
    ['vegetarian', 'Exclude meat and seafood', 'Eggs and dairy are permitted'],
    ['pescatarian', 'Exclude meat from land animals', 'Fish, seafood, eggs and dairy are permitted'],
    ['flexitarian', 'No categorical animal-product exclusion', 'Prefer plant-based options'],
  ];
  for (const [dietLevel, exclusion, allowance] of cases) {
    let request;
    const analyze = createDietaryService(async value => {
      request = value;
      return { choices: [{ message: { content: JSON.stringify([{ ingredient: 'rice', allowed: 'Allowed', reason: 'fixture', suggestions: [] }]) } }] };
    });
    const result = await analyze({ dietLevel, extraForbiddenTags: ['soy'] }, ['rice']);
    assert.ok(request.messages[0].content.includes(exclusion), dietLevel);
    assert.ok(request.messages[0].content.includes(allowance), dietLevel);
    assert.match(request.messages[0].content, /Additional restrictions override/);
    assert.deepEqual(JSON.parse(request.messages[1].content), { ingredients: ['rice'], additionalRestrictions: ['soy'] });
    assert.equal(result[0].allowed, 'Allowed');
  }
});

test('unknown or malformed preferences never invoke inference or approve ingredients', async () => {
  let calls = 0;
  const analyze = createDietaryService(async () => { calls++; throw new Error('unused'); });
  for (const prefs of [null, { dietLevel: 'unknown' }, { dietLevel: {} },
    { dietLevel: 'vegan', extraForbiddenTags: 'soy' }, { dietLevel: 'vegan', extraForbiddenTags: [null] }]) {
    assert.equal((await analyze(prefs, ['rice']))[0].allowed, 'Ambiguous');
  }
  assert.equal(calls, 0);
});

test('provider failures and incomplete output preserve uncertainty', async () => {
  for (const complete of [async () => { throw new Error('provider unavailable'); },
    async () => ({ choices: [{ message: { content: '[]' } }] })]) {
    const rows = await createDietaryService(complete)({ dietLevel: 'lacto' }, ['rice', 'milk']);
    assert.equal(rows.length, 2);
    assert.ok(rows.every(row => row.allowed === 'Ambiguous'));
  }
});
