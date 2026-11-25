import assert from 'node:assert/strict';
import {copyFileSync, mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createOCRService} from '../utils/ocrService.js';

if (process.argv.includes('--worker')) {
  const image = readFileSync(new URL('../tests/fixtures/ocr-text.png', import.meta.url));
  const recognize = createOCRService({maxConcurrent: 1, timeoutMs: 15000});
  const checkText = async () => {
    const result = await recognize(image);
    assert.equal(result.data.text.trim(), 'RICE AND BEANS');
  };
  await checkText();
  // A valid dimension header with no pixel data reaches the actual decoder.
  await assert.rejects(recognize(image.subarray(0, 33)), {status: 502});
  await checkText();
  const controller = new AbortController();
  const pending = recognize(image, {signal: controller.signal});
  controller.abort();
  await assert.rejects(pending, {status: 499});
  await checkText();
  await assert.rejects(createOCRService({timeoutMs: 1})(image), {status: 504});
  console.log('Real OCR text, decoder failure recovery, cancellation recovery and deadline checks passed');
} else {
  assert.ok(process.env.OCR_ENGLISH_DATA, 'Set OCR_ENGLISH_DATA to a local uncompressed eng.traineddata file');
  const directory = mkdtempSync(join(tmpdir(), 'veganify-ocr-'));
  try {
    copyFileSync(process.env.OCR_ENGLISH_DATA, join(directory, 'eng.traineddata'));
    const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--worker'], {
      cwd: directory, stdio: 'inherit', timeout: 90000,
    });
    if (result.error) throw result.error;
    assert.equal(result.status, 0, `OCR smoke process failed (${result.signal ?? result.status})`);
  } finally {
    rmSync(directory, {recursive: true, force: true});
  }
}
