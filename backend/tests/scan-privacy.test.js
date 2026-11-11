import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { format } from 'node:util';
import { createScanIngredientsRouter } from '../routes/ingredientScanRouter.js';

test('scan diagnostics exclude OCR, preferences and dependency errors', async () => {
  const marker = 'private-scan-marker';
  let failure = null;
  let analysisFailure = false;
  const messages = [];
  const originals = Object.fromEntries(['log', 'warn', 'error'].map(key => [key, console[key]]));
  for (const key of Object.keys(originals)) console[key] = (...args) => messages.push(format(...args));
  const app = express();
  app.use(express.json());
  app.use(createScanIngredientsRouter({
    users: { findOne: async () => {
      if (failure) throw failure;
      return { dietLevel: marker, extraForbiddenTags: [marker] };
    } },
    recognize: async () => ({ data: { text: marker } }),
    analyze: async () => {
      if (analysisFailure) throw new Error(marker);
      return [{ ingredient: marker, allowed: 'Allowed', reason: 'fixture', suggestions: [] }];
    },
  }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  async function request(image) {
    const form = new FormData();
    form.append('image', new Blob(['fixture']), 'fixture.png');
    const response = await fetch(`http://127.0.0.1:${server.address().port}/${image ? '' : 'text'}`, {
      method: 'POST', signal: AbortSignal.timeout(2000),
      headers: image ? {} : { 'Content-Type': 'application/json' },
      body: image ? form : JSON.stringify({ ingredients: [marker] }),
    });
    return { status: response.status, body: await response.json() };
  }
  try {
    for (const image of [true, false]) {
      assert.equal((await request(image)).body.isConsumable, true);
      analysisFailure = true;
      assert.equal((await request(image)).body.isConsumable, false);
      analysisFailure = false;
    }
    assert.ok(!messages.join('\n').includes(marker), 'private data reached diagnostics');
    for (const status of [undefined, 200, 999, 503, 504]) {
      failure = Object.assign(new Error(marker), { status });
      for (const image of [true, false]) {
        const result = await request(image);
        assert.equal(result.status, status === 503 || status === 504 ? status : 500);
        assert.equal(result.body.success, false);
        assert.equal(result.body.isConsumable, false);
        assert.ok(!JSON.stringify(result.body).includes(marker));
      }
    }
    assert.ok(!messages.join('\n').includes(marker));
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    Object.assign(console, originals);
  }
});
