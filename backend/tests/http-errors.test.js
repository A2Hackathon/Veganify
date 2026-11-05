import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { httpErrors } from '../utils/httpErrors.js';

test('parser errors retain client status and internal exceptions disclose no details', async () => {
  const app = express();
  app.use(express.json({limit:32}));
  app.post('/', (req,res) => res.json({ok:true}));
  app.get('/failure', () => { throw new Error('sensitive storage path and token'); });
  app.use(httpErrors);
  const server = app.listen(0,'127.0.0.1');
  await new Promise(resolve => server.once('listening',resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const [body, headers, status, message] of [
      ['{"secret": broken}', {}, 400, 'Invalid JSON body'],
      [JSON.stringify({value:'x'.repeat(40)}), {}, 413, 'Request body too large'],
      ['{}', {'Content-Encoding':'unknown'}, 415, 'Unsupported request encoding'],
    ]) {
      const response = await fetch(base,{method:'POST',headers:{'Content-Type':'application/json',...headers},body});
      assert.equal(response.status,status);
      assert.deepEqual(await response.json(),{error:message});
    }
    const response = await fetch(base+'/failure');
    assert.equal(response.status,500);
    assert.deepEqual(await response.json(),{error:'Internal Server Error'});
    const healthy = await fetch(base,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
    assert.equal(healthy.status,200);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
