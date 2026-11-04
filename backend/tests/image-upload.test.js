import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { imageUpload, MAX_IMAGE_BYTES } from '../utils/imageUpload.js';

test('multipart limits and memory-backed image contract', async () => {
  const app = express();
  let calls = 0;
  app.post('/', imageUpload, (req, res) => {
    calls++;
    assert.ok(Buffer.isBuffer(req.file.buffer));
    assert.equal(req.file.path, undefined);
    res.json({ bytes: req.file.buffer.length });
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const send = body => fetch(`http://127.0.0.1:${server.address().port}/`, {method:'POST', body});
  const form = (bytes = 'image') => {
    const data = new FormData(); data.append('image', new Blob([bytes]), 'image.png'); return data;
  };
  try {
    const valid = await send(form(Buffer.alloc(MAX_IMAGE_BYTES)));
    assert.equal(valid.status, 200);
    assert.equal((await valid.json()).bytes, MAX_IMAGE_BYTES);
    const cases = [form(), form(), form(), form()];
    cases[0].append('image', new Blob(['second']), 'other.png');
    cases[1].append('note', 'x'.repeat(8193));
    for (let i = 0; i < 11; i++) cases[2].append('field' + i, 'value');
    cases[3].append('unexpected', new Blob(['file']), 'other.png');
    for (const [index, data] of cases.entries()) {
      assert.equal((await send(data)).status, index === 1 ? 413 : 400);
    }
    assert.equal(calls, 1, 'rejected multipart bodies must not reach the handler');
    assert.equal((await send(form())).status, 200, 'a rejected upload must not prevent later requests');
  } finally { await new Promise(resolve => server.close(resolve)); }
});
