import test from 'node:test';
import assert from 'node:assert/strict';
import { createModelClient } from '../utils/modelClient.js';

test('missing configuration fails before creating a client', () => {
  let constructed = 0;
  class Client { constructor() { constructed++; } }
  for (const environment of [{}, { OPENROUTER_API_KEY: '' }, { OPENROUTER_API_KEY: '  ' }, { OPENAI_API_KEY: 'unrelated-example' }]) {
    assert.throws(() => createModelClient(Client, environment), /OPENROUTER_API_KEY is required/);
  }
  assert.equal(constructed, 0);
});

test('explicit configuration reaches only the fixed provider endpoint', () => {
  class Client { constructor(options) { this.options = options; } }
  const client = createModelClient(Client, { OPENROUTER_API_KEY: ' example-test-value ', OPENAI_BASE_URL: 'https://invalid.example' });
  assert.deepEqual(client.options, {
    apiKey: 'example-test-value', baseURL: 'https://openrouter.ai/api/v1', timeout: 60000, maxRetries: 2,
  });
});
