import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { unlink } from 'node:fs/promises';
import { scanResult } from '../utils/scanResults.js';
import { createScanIngredientsRouter } from '../routes/ingredientScanRouter.js';

async function withServer(run) {
  let checks = [];
  let calls = 0;
  const uploads = [];
  const app = express();
  app.use(express.json());
  app.use('/scan/ingredients', createScanIngredientsRouter({
    recognize: async path => { uploads.push(path); return {data:{text:''}}; },
    users: { findOne: async () => ({ dietLevel: 'vegan' }) },
    analyze: async () => { calls++; return checks; },
  }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const post = async body => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/scan/ingredients/text`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  };
  const scanEmptyImage = async () => {
    const form = new FormData(); form.append('image', new Blob(['controlled OCR fixture']), 'fixture.png');
    const response = await fetch(`http://127.0.0.1:${server.address().port}/scan/ingredients`, {method:'POST', body:form});
    return {status:response.status, body:await response.json()};
  };
  try { await run({ scanEmptyImage, post, set: value => { checks = value; }, calls: () => calls }); }
  finally { await new Promise(resolve => server.close(resolve)); await Promise.all(uploads.map(path => unlink(path))); }
}

const allowed = ingredient => ({ ingredient, allowed: 'Allowed', reason: 'controlled fixture', suggestions: [] });

test('incomplete, duplicate or malformed analysis cannot approve a scan', async () => withServer(async ({post, set}) => {
  for (const checks of [[allowed('rice')], [allowed('rice'), allowed('unrequested')], [allowed('rice'), allowed('rice')], [null], {},
    [allowed('rice'), {...allowed('milk'), allowed: 'allowed'}], [allowed('rice'), {...allowed('milk'), reason: 7}],
    [allowed('rice'), {...allowed('milk'), suggestions: [null]}]]) {
    set(checks);
    const result = await post({ ingredients: ['rice', 'milk'] });
    assert.equal(result.status, 200);
    assert.equal(result.body.isConsumable, false);
    assert.equal(result.body.ingredients.length, 2);
    assert.ok(result.body.ingredients.some(item => item.allowed === 'Ambiguous'));
  }
}));

test('valid results preserve input order and explicit non-allowed status', async () => withServer(async ({post, set}) => {
  set([allowed('beans'), allowed('rice')]);
  let result = await post({ingredients: ['rice', 'beans']});
  assert.equal(result.body.isConsumable, true);
  assert.deepEqual(result.body.ingredients.map(item => item.name), ['rice', 'beans']);
  set([allowed('rice'), {...allowed('beans'), allowed: 'NotAllowed'}]);
  result = await post({ingredients: ['rice', 'beans']});
  assert.equal(result.body.isConsumable, false);
  assert.equal(result.body.ingredients[1].allowed, 'NotAllowed');
}));

test('empty and invalid inputs never invoke analysis', async () => withServer(async ({post, calls}) => {
  for (const body of [{text:'  ,\n '}, {text:42}, {ingredients:[null]}, {ingredients:['']},
    {ingredients:Array(101).fill('rice')}, {text:'x'.repeat(8001)}]) {
    const result = await post(body);
    assert.equal(result.status, 400);
    assert.notEqual(result.body.isConsumable, true);
  }
  assert.equal(calls(), 0);
}));

test('empty OCR is an explicit failure and never invokes analysis', async () => withServer(async ({scanEmptyImage, calls}) => {
  const result = await scanEmptyImage();
  assert.equal(result.status, 422);
  assert.equal(result.body.success, false);
  assert.equal(result.body.isConsumable, false);
  assert.deepEqual(result.body.ingredients, []);
  assert.equal(calls(), 0);
}));

test('empty analysis input cannot pass vacuous all-allowed check', () => {
  assert.equal(scanResult([], []).isConsumable, false);
});
