import { fork } from 'node:child_process';

function failure(message, status) { return Object.assign(new Error(message), { status }); }

export function createOCRService({ workerPath = new URL('../workers/ocr.js', import.meta.url), timeoutMs = 60000, maxConcurrent = 2 } = {}) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || !Number.isInteger(maxConcurrent) || maxConcurrent < 1) {
    throw new Error('Invalid OCR service limits');
  }
  let active = 0;
  return async function recognize(image, { signal } = {}) {
    if (signal?.aborted) throw failure('OCR request cancelled', 499);
    if (!Buffer.isBuffer(image) || image.length > 5 * 1024 * 1024) throw failure('Invalid OCR input', 400);
    if (active >= maxConcurrent) throw failure('OCR capacity unavailable; retry later', 503);
    active++;
    try {
      return await new Promise((resolve, reject) => {
        const child = fork(workerPath, [], { stdio: ['ignore', 'ignore', 'ignore', 'ipc'], serialization: 'advanced', execArgv: [] });
        let result;
        let error;
        const stop = reason => {
          if (reason && !error) error = reason;
          child.kill('SIGKILL');
        };
        const abort = () => stop(failure('OCR request cancelled', 499));
        const timer = setTimeout(() => stop(failure('OCR deadline exceeded', 504)), timeoutMs);
        signal?.addEventListener('abort', abort, { once: true });
        child.on('error', () => stop(failure('OCR process failed', 502)));
        child.on('message', message => {
          if (result || error) return;
          if (typeof message?.text !== 'string' || message.text.length > 8000) {
            stop(failure('OCR result unavailable or too large', 502));
          } else {
            result = { data: { text: message.text } };
            stop();
          }
        });
        // Retain capacity until the child has actually exited and IPC is closed.
        child.once('close', () => {
          clearTimeout(timer);
          signal?.removeEventListener('abort', abort);
          if (error) reject(error);
          else if (result) resolve(result);
          else reject(failure('OCR process exited without a result', 502));
        });
        if (signal?.aborted) abort();
        else child.send(image, sendError => { if (sendError) stop(failure('OCR input transfer failed', 502)); });
      });
    } finally { active--; }
  };
}

export function withRequestCancellation(recognize) {
return async function recognizeImage(image, { req, res }) {
  const controller = new AbortController();
  const cancel = () => { if (!res.writableFinished) controller.abort(); };
  req.once('aborted', cancel);
  res.once('close', cancel);
  if (req.aborted || res.destroyed) controller.abort();
  try { return await recognize(image, { signal: controller.signal }); }
  finally { req.removeListener('aborted', cancel); res.removeListener('close', cancel); }
}

}

export const recognizeImage = withRequestCancellation(createOCRService());
