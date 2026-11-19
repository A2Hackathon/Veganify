import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createOCRService} from '../utils/ocrService.js';

// Header-only fixtures exercise admission, not image decoding or recognition.
function png(width, height) {
  const bytes = Buffer.alloc(33);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes);
  bytes.writeUInt32BE(13, 8);
  bytes.write('IHDR', 12);
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes;
}
function jpeg(width, height) {
  const bytes = Buffer.from([255, 216, 255, 224, 0, 2, 255, 192, 0, 17, 8, 0, 0, 0, 0, 3, 1, 17, 0, 2, 17, 0, 3, 17, 0]);
  bytes.writeUInt16BE(height, 11);
  bytes.writeUInt16BE(width, 13);
  return bytes;
}

test('OCR rejects unsupported, malformed and oversized images before launching a child', async t => {
  const root = fs.mkdtempSync(join(tmpdir(), 'ocr-image-bounds-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const marker = join(root, 'started');
  const workerPath = join(root, 'worker.cjs');
  fs.writeFileSync(workerPath, `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'started');
    process.once('message', () => process.send({text: 'test result'}));`);
  const recognize = createOCRService({workerPath, maxConcurrent: 1, timeoutMs: 3000});
  for (const [bytes, status] of [
    [Buffer.from('GIF89a'), 415], [Buffer.from('<svg/>'), 415], [Buffer.alloc(0), 415],
    [png(1, 1).subarray(0, 8), 400], [jpeg(1, 1).subarray(0, 5), 400],
    [png(0, 10), 400], [jpeg(10, 0), 400],
    [png(8193, 1), 413], [jpeg(1, 8193), 413],
    [png(4001, 4000), 413], [jpeg(4000, 4001), 413],
    [Buffer.alloc(5 * 1024 * 1024 + 1), 400],
  ]) {
    await assert.rejects(recognize(bytes), error => error.status === status);
    assert.equal(fs.existsSync(marker), false, 'rejected input must never start the OCR child');
  }
  for (const bytes of [png(4000, 4000), jpeg(4000, 4000), png(8192, 1), jpeg(1, 8192)]) {
    assert.equal((await recognize(bytes)).data.text, 'test result');
    assert.equal(fs.existsSync(marker), true);
    fs.unlinkSync(marker);
  }
});
