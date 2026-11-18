import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createScanIngredientsRouter } from '../routes/ingredientScanRouter.js';

test('ingredient scan disconnect prevents work and fallback responses', async () => {
  for (const path of ['/', '/text']) for (const phase of ['profile', ...(path === '/' ? ['ocr'] : []), 'analysis', 'analysis-error']) {
    let release, started, signal;
    const gate = new Promise(resolve => { release = resolve; });
    const ready = new Promise(resolve => { started = resolve; });
    let ocrCalls = 0, analysisCalls = 0;
    const router = createScanIngredientsRouter({
      users: {findOne: async () => {
        if (phase === 'profile') { started(); await gate; }
        return {dietLevel: 'vegan'};
      }},
      recognize: async () => {
        ocrCalls++;
        if (phase === 'ocr') { started(); await gate; }
        return {data: {text: 'rice'}};
      },
      analyze: async (ctx, prompt, options) => {
        analysisCalls++;
        signal = options?.signal;
        started(); await gate;
        if (phase === 'analysis-error') throw new Error('controlled canceled provider');
        return [{ingredient: 'rice', allowed: 'Allowed', reason: 'fixture', suggestions: []}];
      },
    });
    const handle = router.stack.find(layer => layer.route?.path === path).route.stack.at(-1).handle;
    const req = Object.assign(new EventEmitter(), {body: {ingredients: ['rice']}, file: {buffer: Buffer.from('fixture')}});
    const res = Object.assign(new EventEmitter(), {writes: 0, writableFinished: false,
      status() { return this; }, json() { this.writes++; }});
    const pending = handle(req, res);
    await ready;
    res.emit('close');
    release();
    await pending;
    assert.equal(res.writes, 0, phase);
    assert.equal(ocrCalls, phase === 'profile' || path === '/text' ? 0 : 1);
    assert.equal(analysisCalls, phase.startsWith('analysis') ? 1 : 0);
    if (phase.startsWith('analysis')) assert.equal(signal?.aborted, true);
    assert.equal(req.listenerCount('aborted'), 0);
    assert.equal(res.listenerCount('close'), 0);
  }
});

import { createDietaryService } from '../utils/dietaryService.js';
test('dietary cancellation propagates while provider failure remains uncertain', async () => {
  const controller = new AbortController();
  const reason = new Error('canceled dietary request');
  let signal;
  const analyze = createDietaryService(async (body, options) => {
    signal = options?.signal;
    controller.abort(reason);
    throw reason;
  });
  await assert.rejects(analyze({dietLevel: 'vegan'}, ['rice'], {signal: controller.signal}), error => error === reason);
  assert.equal(signal, controller.signal);
  let calls = 0;
  await assert.rejects(createDietaryService(async () => { calls++; })({dietLevel: 'vegan'}, ['rice'], {signal: controller.signal}), error => error === reason);
  assert.equal(calls, 0);
  const fallback = await createDietaryService(async () => { throw new Error('provider failure'); })({dietLevel: 'vegan'}, ['rice']);
  assert.equal(fallback[0].allowed, 'Ambiguous');
});
