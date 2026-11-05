import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createAnswerService } from '../utils/answerService.js';
import { createAskRouter } from '../routes/askRouter.js';

test('AI diagnostics exclude provider exception fields, prompts, profiles and answers', async t => {
  const logs = [];
  t.mock.method(console,'log',(...args) => logs.push(args));
  t.mock.method(console,'error',(...args) => logs.push(args));
  const marker = 'controlled-private-value';
  const error = Object.assign(new Error(marker), {response:{data:marker}, error:{token:marker}});
  const answer = createAnswerService(async () => { throw error; });
  const result = await answer({user:{extraForbiddenTags:[marker]}},marker);
  assert.match(result,/trouble connecting/);
  assert.ok(!JSON.stringify(logs).includes(marker));
  assert.deepEqual(logs,[['AI answer unavailable']]);

  const success = createAnswerService(async () => ({choices:[{message:{content:marker}}]}));
  assert.equal(await success({},marker),marker);
  assert.ok(!JSON.stringify(logs).includes(marker));
});

test('context failures do not expose exception details in HTTP responses or diagnostics', async t => {
  const logs = [];
  t.mock.method(console,'error',(...args) => logs.push(args));
  const app = express();
  app.use(express.json());
  app.use(createAskRouter({getContext:async () => {throw new Error('private-storage-path');}, answer:async () => 'unused'}));
  const server = app.listen(0,'127.0.0.1');
  await new Promise(resolve => server.once('listening',resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/ask`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({question:'private-question'}),
    });
    assert.equal(response.status,500);
    assert.deepEqual(await response.json(),{error:'Failed to get AI answer'});
    assert.deepEqual(logs,[['AI request failed']]);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
