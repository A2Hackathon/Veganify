import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import { createOCRService, withRequestCancellation } from '../utils/ocrService.js';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'veganify-ocr-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const workerPath = join(root, 'worker.cjs');
  await writeFile(workerPath, `const fs = require('node:fs');
    process.once('message', bytes => {
      const input = JSON.parse(bytes.toString());
      fs.writeFileSync(input.pidFile, String(process.pid));
      if (input.mode === 'success') process.send({text:'rice'});
      if (input.mode === 'invalid') process.send({text:42});
      if (input.mode === 'exit') process.exit(1);
      setInterval(() => {}, 1000);
    });`);
  const input = mode => Buffer.from(JSON.stringify({ mode, pidFile: join(root, 'pid') }));
  const pid = async () => Number(await readFile(join(root, 'pid'), 'utf8'));
  return { root, workerPath, input, pid };
}
function gone(pid) { assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' }); }

for (const mode of ['success', 'invalid', 'exit']) {
  test(`child process is reaped after ${mode}`, async t => {
    const f = await fixture(t);
    const recognize = createOCRService({workerPath:f.workerPath, timeoutMs:5000});
    if (mode === 'success') assert.deepEqual(await recognize(f.input(mode)), {data:{text:'rice'}});
    else await assert.rejects(recognize(f.input(mode)), error => error.status === 502);
    gone(await f.pid());
  });
}

test('deadline kills a process blocked before accepting input', async t => {
  const f = await fixture(t);
  await writeFile(f.workerPath, `require('node:fs').writeFileSync(${JSON.stringify(join(f.root,'pid'))}, String(process.pid)); while(true) {}`);
  const recognize = createOCRService({workerPath:f.workerPath, timeoutMs:1000, maxConcurrent:1});
  await assert.rejects(recognize(f.input('hang')), error => error.status === 504);
  gone(await f.pid());
});

test('abort terminates active work, frees capacity, and pre-abort never starts work', async t => {
  const f = await fixture(t);
  const recognize = createOCRService({workerPath:f.workerPath, timeoutMs:5000, maxConcurrent:1});
  const controller = new AbortController();
  const first = recognize(f.input('hang'), {signal:controller.signal});
  const rejected = assert.rejects(first, error => error.status === 499);
  await assert.rejects(recognize(f.input('success')), error => error.status === 503);
  let pid;
  for (let attempt=0; attempt<100; attempt++) {
    try { pid = await f.pid(); break; } catch { await new Promise(resolve => setTimeout(resolve, 10)); }
  }
  assert.ok(pid, 'child did not start');
  controller.abort();
  await rejected;
  gone(pid);
  await assert.rejects(recognize(f.input('success'), {signal:controller.signal}), error => error.status === 499);
  assert.equal((await recognize(f.input('success'))).data.text, 'rice');
  gone(await f.pid());
});

test('invalid service limits and inputs are rejected', async () => {
  assert.throws(() => createOCRService({maxConcurrent:0}));
  assert.throws(() => createOCRService({timeoutMs:NaN}));
  await assert.rejects(createOCRService()('not a Buffer'), error => error.status === 400);
});

test('HTTP disconnect cancels OCR and reaps the child', async t => {
  const f = await fixture(t);
  const recognize = withRequestCancellation(createOCRService({workerPath:f.workerPath, timeoutMs:5000}));
  const app = express();
  let ended;
  const cancelled = new Promise(resolve => { ended = resolve; });
  app.get('/', async (req,res) => {
    try { await recognize(f.input('hang'), {req,res}); ended('unexpected success'); }
    catch (error) { ended(error.status); }
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const controller = new AbortController();
  const request = fetch(`http://127.0.0.1:${server.address().port}/`, {signal:controller.signal}).catch(() => {});
  try {
    let pid;
    for (let attempt=0; attempt<100; attempt++) {
      try { pid = await f.pid(); break; } catch { await new Promise(resolve => setTimeout(resolve,10)); }
    }
    assert.ok(pid);
    controller.abort();
    await request;
    assert.equal(await cancelled, 499);
    gone(pid);
  } finally { controller.abort(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
