import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createScanMenuRouter } from '../routes/menuScanRouter.js';

test('menu disconnect prevents subsequent work at each async boundary', async () => {
  for (const phase of ['profile', 'ocr', 'analysis']) {
    let release, started, signal;
    const gate = new Promise(resolve => { release = resolve; });
    const ready = new Promise(resolve => { started = resolve; });
    let ocrCalls = 0, analysisCalls = 0;
    const router = createScanMenuRouter({
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
        return JSON.stringify([{name: 'rice', status: 'suitable', modificationSuggestion: ''}]);
      },
    });
    const handle = router.stack.find(layer => layer.route?.path === '/').route.stack.at(-1).handle;
    const req = Object.assign(new EventEmitter(), {file: {buffer: Buffer.from('fixture')}});
    const res = Object.assign(new EventEmitter(), {writes: 0, writableFinished: false,
      status() { return this; }, json() { this.writes++; }});
    const pending = handle(req, res);
    await ready;
    res.emit('close');
    release();
    await pending;
    assert.equal(res.writes, 0, phase);
    assert.equal(ocrCalls, phase === 'profile' ? 0 : 1);
    assert.equal(analysisCalls, phase === 'analysis' ? 1 : 0);
    if (phase === 'analysis') assert.equal(signal?.aborted, true);
    assert.equal(req.listenerCount('aborted'), 0);
    assert.equal(res.listenerCount('close'), 0);
  }
});
