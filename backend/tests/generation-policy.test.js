import test from 'node:test';
import assert from 'node:assert/strict';
import { createGenerationService } from '../utils/generationService.js';
import { dietaryPolicyFor } from '../utils/dietaryService.js';

const recipe = {title: 'Rice', duration: '20 minutes', tags: [], ingredients: [{name: 'rice', amount: '1', unit: 'cup'}], steps: ['Cook rice.']};
const response = {choices: [{message: {content: JSON.stringify([recipe])}}]};

test('generation uses each saved diet and gives additional restrictions precedence', async () => {
  let request;
  const generate = createGenerationService(async value => { request = value; return response; });
  for (const dietLevel of ['vegan', 'ovo', 'lacto', 'lacto_ovo', 'vegetarian', 'pescatarian', 'flexitarian']) {
    assert.deepEqual(await generate(['rice'], 1, {dietLevel, extraForbiddenTags: ['peanuts']}), [recipe]);
    assert.ok(request.messages[0].content.includes(dietaryPolicyFor(dietLevel)), dietLevel);
    assert.match(request.messages[0].content, /Additional restrictions override/);
    assert.match(request.messages[1].content, /peanuts/);
  }
});

test('generation rejects malformed preferences before inference', async () => {
  let calls = 0;
  const generate = createGenerationService(async () => { calls++; return response; });
  for (const user of [null, {dietLevel: 'unknown'}, {dietLevel: {}}, {extraForbiddenTags: 'soy'}, {extraForbiddenTags: [null]}]) {
    await assert.rejects(generate(['rice'], 1, user));
  }
  assert.equal(calls, 0);
});

test('generation preserves model output validation and provider failure behavior', async () => {
  for (const complete of [async () => { throw new Error('provider failure'); }, async () => ({choices: [{message: {content: '[]'}}]})]) {
    await assert.rejects(createGenerationService(complete)(['rice'], 1), /Recipe generation unavailable/);
  }
});
