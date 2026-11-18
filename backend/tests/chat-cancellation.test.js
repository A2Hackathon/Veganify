import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import http from 'node:http';
import express from 'express';
import { createAskRouter } from '../routes/askRouter.js';
import { createAnswerService } from '../utils/answerService.js';

function request() {
  const req = Object.assign(new EventEmitter(), {body: {question: 'Hello'}});
  const res = Object.assign(new EventEmitter(), {writes: 0, writableFinished: false,
    json() { this.writes++; this.writableFinished = true; }, status() { return this; }});
  return {req, res};
}
function handler(dependencies) {
  return createAskRouter(dependencies).stack.find(layer => layer.route?.path === '/ask').route.stack[0].handle;
}

test('closing a real HTTP connection cancels pending chat inference', {timeout: 3000}, async () => {
  let started;
  let cancelled;
  const ready = new Promise(resolve => { started = resolve; });
  const aborted = new Promise(resolve => { cancelled = resolve; });
  const app = express();
  app.use(express.json());
  app.use(createAskRouter({getContext: async () => ({}), answer: createAnswerService(async (body, {signal}) => {
    started();
    return new Promise((resolve, reject) => signal.addEventListener('abort', () => {
      cancelled();
      reject(signal.reason);
    }, {once: true}));
  })}));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  let client;
  try {
    client = http.request({hostname: '127.0.0.1', port: server.address().port, path: '/ask', method: 'POST', headers: {'Content-Type': 'application/json'}});
    client.on('error', () => {});
    client.end(JSON.stringify({question: 'Hello'}));
    await ready;
    client.destroy();
    await aborted;
  } finally {
    client?.destroy();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test('chat disconnect during context lookup prevents inference and removes listeners', async () => {
  let release;
  let calls = 0;
  const context = new Promise(resolve => { release = resolve; });
  const run = handler({getContext: () => context, answer: async () => { calls++; return 'answer'; }});
  const {req, res} = request();
  const pending = run(req, res);
  res.emit('close');
  release({});
  await pending;
  assert.equal(calls, 0);
  assert.equal(res.writes, 0);
  assert.equal(req.listenerCount('aborted'), 0);
  assert.equal(res.listenerCount('close'), 0);
});

test('chat disconnect aborts the provider request without a fallback response', async () => {
  let options;
  let started;
  const ready = new Promise(resolve => { started = resolve; });
  const answer = createAnswerService(async (body, value) => {
    options = value;
    started();
    await new Promise((resolve, reject) => {
      if (!value?.signal) return resolve();
      value.signal.addEventListener('abort', () => reject(value.signal.reason), {once: true});
    });
    return {choices: [{message: {content: 'late answer'}}]};
  });
  const {req, res} = request();
  const pending = handler({getContext: async () => ({}), answer})(req, res);
  await ready;
  req.emit('aborted');
  await pending;
  assert.equal(options?.signal?.aborted, true);
  assert.equal(res.writes, 0);
  assert.equal(req.listenerCount('aborted'), 0);
  assert.equal(res.listenerCount('close'), 0);
});

test('completed chat cleans listeners without cancelling a successful provider request', async () => {
  let signal;
  const {req, res} = request();
  await handler({getContext: async () => ({}), answer: async (context, question, options) => {
    signal = options.signal;
    return 'answer';
  }})(req, res);
  res.emit('close');
  assert.equal(res.writes, 1);
  assert.equal(signal.aborted, false);
  assert.equal(req.listenerCount('aborted'), 0);
  assert.equal(res.listenerCount('close'), 0);
});
