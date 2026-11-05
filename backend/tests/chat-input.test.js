import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createAskRouter } from '../routes/askRouter.js';

test('chat rejects invalid input before context or inference and accepts the exact text boundary', async () => {
  let contexts = 0;
  const questions = [];
  const app = express();
  app.use(express.json({strict:false}));
  app.use(createAskRouter({
    getContext: async () => { contexts++; return {}; },
    answer: async (context,question) => { questions.push(question); return 'controlled answer'; },
  }));
  const server = app.listen(0,'127.0.0.1');
  await new Promise(resolve => server.once('listening',resolve));
  const post = body => fetch(`http://127.0.0.1:${server.address().port}/ask`, {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body), signal:AbortSignal.timeout(2000),
  });
  try {
    for (const body of [{question:42}, {question:{}}, {question:[]}, {question:'   '}, {question:'x'.repeat(4001)}, {}, null, [], 'text']) {
      const response = await post(body);
      assert.equal(response.status,400);
      assert.deepEqual(await response.json(), {error:'question must contain 1 to 4000 characters'});
    }
    assert.equal(contexts,0);
    assert.deepEqual(questions,[]);
    assert.equal((await post({question:'x'.repeat(4000)})).status,200);
    assert.equal((await post({question:'  rice  '})).status,200);
    assert.deepEqual(questions,['x'.repeat(4000),'rice']);
    assert.equal(contexts,2);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
