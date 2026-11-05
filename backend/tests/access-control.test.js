import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { sharedDemoAccess } from '../utils/accessControl.js';

const token = 'test-only-token-0123456789abcdef0123456789';
test('unconfigured access fails closed; only the exact bearer token reaches handlers', async () => {
  for (const configured of [undefined, '', 'short', token]) {
    let calls = 0;
    const app = express();
    app.use(sharedDemoAccess(configured));
    app.use((req,res) => { calls++; res.json({ok:true}); });
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening',resolve));
    try {
      for (const authorization of ['', 'Basic '+token, 'Bearer wrong', 'Bearer '+token+'x', 'Bearer '+token]) {
        const response = await fetch(`http://127.0.0.1:${server.address().port}/`, {headers: {Authorization:authorization}});
        assert.equal(response.status, configured !== token ? 503 : authorization === 'Bearer '+token ? 200 : 401);
        assert.equal(response.headers.get('cache-control'),'no-store');
        assert.ok(!(await response.text()).includes(token));
      }
      assert.equal(calls, configured === token ? 1 : 0);
    } finally { await new Promise(resolve => server.close(resolve)); }
  }
});
