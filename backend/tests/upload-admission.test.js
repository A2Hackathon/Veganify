import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter, once} from 'node:events';
import http from 'node:http';
import express from 'express';
import {createImageUpload} from '../utils/imageUpload.js';

test('scan admission spans parsing and response lifetime and recovers after failures', {timeout: 10000}, async t => {
  const app = express();
  const events = new EventEmitter();
  const upload = createImageUpload({maxConcurrent: 1});
  let heldResponse;
  let calls = 0;
  app.use((req, res, next) => {
    req.once('close', () => events.emit('request-closed'));
    res.once('close', () => events.emit('response-closed'));
    events.emit('arrived');
    next();
  });
  app.post('/hold', upload, (_req, res) => {
    heldResponse = res;
    events.emit('held');
  });
  app.post('/scan', upload, (req, res) => {
    calls++;
    res.json({bytes: req.file.buffer.length});
  });
  const server = app.listen(0, '127.0.0.1');
  t.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  });
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}`;
  const form = () => {
    const data = new FormData();
    data.append('image', new Blob(['image']), 'image.png');
    return data;
  };
  const send = (path = '/scan', signal = AbortSignal.timeout(3000)) => fetch(url + path, {method: 'POST', body: form(), signal});

  const held = once(events, 'held');
  const first = send('/hold');
  await held;
  const busy = await send();
  assert.equal(busy.status, 503);
  assert.equal(busy.headers.get('retry-after'), '1');
  await busy.json();
  assert.equal(calls, 0, 'another route shares admission and must not process the rejected image');
  heldResponse.json({ok: true});
  assert.equal((await first).status, 200);
  assert.equal((await send()).status, 200, 'finished response releases its slot');

  const malformed = await fetch(url + '/scan', {
    method: 'POST', headers: {'Content-Type': 'multipart/form-data; boundary=broken'}, body: '--broken\r\n',
    signal: AbortSignal.timeout(3000),
  });
  assert.equal(malformed.status, 400);
  await malformed.json();
  assert.equal((await send()).status, 200, 'parse error releases its slot');

  const arrived = once(events, 'arrived');
  const partial = http.request(url + '/scan', {
    method: 'POST', headers: {'Content-Type': 'multipart/form-data; boundary=partial'},
  });
  partial.on('error', () => {});
  partial.write('--partial\r\nContent-Disposition: form-data; name="image"; filename="image.png"\r\nContent-Type: image/png\r\n\r\nunfinished');
  await arrived;
  assert.equal((await send()).status, 503, 'incomplete multipart input already holds admission');
  const closed = once(events, 'request-closed');
  partial.destroy();
  await closed;
  assert.equal((await send()).status, 200, 'aborted multipart input releases its slot after cleanup');

  const controller = new AbortController();
  const processing = once(events, 'held');
  const abandoned = assert.rejects(send('/hold', controller.signal), {name: 'AbortError'});
  await processing;
  const responseClosed = once(events, 'response-closed');
  controller.abort();
  await abandoned;
  await responseClosed;
  assert.equal((await send()).status, 200, 'disconnect during downstream processing releases its slot');
});

test('upload admission rejects invalid configuration', () => {
  for (const maxConcurrent of [0, -1, 1.5, Infinity, '2']) {
    assert.throws(() => createImageUpload({maxConcurrent}), /Invalid upload capacity/);
  }
});
