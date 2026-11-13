import test from 'node:test';
import assert from 'node:assert/strict';
import { createRewriteService } from '../utils/rewriteService.js';
import { dietaryPolicyFor } from '../utils/dietaryService.js';

test('rewriting receives each diet and restrictions override substitution suggestions', async () => {
  let request;
  const rewrite = createRewriteService(async value => {
    request = value;
    return {choices: [{message: {content: 'Cook rice.'}}]};
  });
  for (const dietLevel of ['vegan', 'ovo', 'lacto', 'lacto_ovo', 'vegetarian', 'pescatarian', 'flexitarian']) {
    assert.equal(await rewrite([{original: 'milk', substitute: 'soy milk'}], 'Cook milk.', {dietLevel, extraForbiddenTags: ['soy']}), 'Cook rice.');
    assert.ok(request.messages[0].content.includes(dietaryPolicyFor(dietLevel)), dietLevel);
    assert.match(request.messages[0].content, /Additional restrictions override/);
    assert.match(request.messages[1].content, /soy/);
    assert.doesNotMatch(request.messages[1].content, /apply all/);
  }
});

test('rewriting rejects missing or malformed preferences without inference', async () => {
  let calls = 0;
  const rewrite = createRewriteService(async () => { calls++; return {}; });
  for (const user of [undefined, null, {}, {dietLevel: 'unknown'}, {dietLevel: {}}, {dietLevel: 'vegan', extraForbiddenTags: 'soy'}, {dietLevel: 'vegan', extraForbiddenTags: [null]}]) {
    await assert.rejects(rewrite([], 'Cook rice.', user), /Unsupported dietary preference/);
  }
  assert.equal(calls, 0);
});

test('rewrite failures never return the original as an adaptation', async () => {
  for (const complete of [async () => { throw new Error('provider failure'); }, async () => ({choices: [{message: {content: ''}}]})]) {
    await assert.rejects(createRewriteService(complete)([], 'Original rice.', {dietLevel: 'vegan'}), /Recipe rewrite unavailable/);
  }
});
