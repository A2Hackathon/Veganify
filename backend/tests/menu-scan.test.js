import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createScanMenuRouter } from '../routes/menuScanRouter.js';

async function withMenu(run) {
  let text = 'rice\nmilk';
  let answer = '[]';
  let calls = 0;
  const app = express();
  app.use(createScanMenuRouter({
    users: { findOne: async () => ({dietLevel: 'vegan'}) },
    recognize: async () => ({data: {text}}),
    analyze: async () => { calls++; return answer; },
  }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  async function post() {
    const form = new FormData();
    form.append('image', new Blob(['controlled OCR fixture']), 'menu.png');
    const response = await fetch(`http://127.0.0.1:${server.address().port}`, {method: 'POST', body: form});
    return {status: response.status, body: await response.json()};
  }
  try { await run({post, setAnswer: value => {answer = value;}, setText: value => {text = value;}, calls: () => calls}); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
const row = (name, status = 'suitable') => ({name, status, modificationSuggestion: ''});

test('invalid or incomplete menu analysis cannot produce dietary advice', () => withMenu(async ({post, setAnswer}) => {
  for (const answer of ['not JSON', '[]', '{}', JSON.stringify([row('rice')]),
    JSON.stringify([row('rice'), row('rice')]), JSON.stringify([row('rice'), row('unknown')]),
    JSON.stringify([row('rice'), row('milk', 'maybe')]), JSON.stringify([row('rice'), {...row('milk'), modificationSuggestion: 7}]),
    JSON.stringify([row('rice'), row('milk', 'modifiable')]), 'x'.repeat(32001)]) {
    setAnswer(answer);
    const result = await post();
    assert.equal(result.status, 502);
    assert.equal(result.body.dishes, undefined);
    assert.equal(result.body.error, 'Menu analysis unavailable; verify dishes independently');
  }
}));

test('valid menu output preserves requested order and supports fenced JSON', () => withMenu(async ({post, setAnswer}) => {
  setAnswer('```json\n' + JSON.stringify([row('milk', 'not_suitable'), row('rice')]) + '\n```');
  const result = await post();
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.dishes, [
    {...row('rice'), modificationSuggestion: null}, {...row('milk', 'not_suitable'), modificationSuggestion: null},
  ]);
}));

test('empty or excessive OCR never invokes menu analysis', () => withMenu(async ({post, setText, calls}) => {
  for (const text of ['', '  \n', 'x'.repeat(201), Array.from({length:101}, (_,i) => `dish${i}`).join('\n')]) {
    setText(text);
    const result = await post();
    assert.equal(result.status, 422);
  }
  assert.equal(calls(), 0);
}));
