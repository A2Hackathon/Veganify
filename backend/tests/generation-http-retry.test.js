import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { join } from 'node:path';
import { fork } from 'node:child_process';
import { once } from 'node:events';

test('lost HTTP recipe-generation response replays after a server process restart', {timeout: 15000}, async t => {
  const root = fs.mkdtempSync(new URL('../generation-http-fixture-', import.meta.url));
  const children = new Set();
  t.after(async () => {
    for (const child of children) {
      if (child.exitCode === null && child.signalCode === null) {
        const exited = once(child, 'exit');
        child.kill('SIGKILL');
        await exited;
      }
    }
    fs.rmSync(root, {recursive: true, force: true});
  });
  for (const dir of ['routes', 'utils']) {
    fs.cpSync(new URL('../' + dir, import.meta.url), join(root, dir), {recursive: true});
  }
  fs.writeFileSync(join(root, 'utils/llmClient.js'), `export async function generateRecipes() { return [{title: 'fixture recipe'}]; } export async function extractIngredients() {} export async function rewriteRecipeSteps() {}`);
  const script = join(root, 'server.mjs');
  fs.writeFileSync(script, `
    import express from 'express';
    import router from './routes/recipes.js';
    import {UserStorage, RecipeStorage, GroceryItemStorage} from './utils/jsonStorage.js';
    const user = await UserStorage.create({sproutName: 'Albert'});
    if (!(await GroceryItemStorage.find({userId: user._id})).length) {
      await GroceryItemStorage.create({userId: user._id, name: 'rice'});
    }
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      if (process.env.DROP_GENERATION_RESPONSE === '1') {
        // Drop the connection at the response boundary, after the real route commits.
        res.json = body => {
          process.send({committed: body});
          res.destroy();
          return res;
        };
      }
      next();
    });
    app.use('/recipes', router);
    app.get('/stored-recipes', async (_req, res) => {
      const user = await UserStorage.findOne({sproutName: 'Albert'});
      res.json(await RecipeStorage.find({userId: user._id}));
    });
    const server = app.listen(0, '127.0.0.1', () => process.send({port: server.address().port}));
  `);
  async function start(drop) {
    const child = fork(script, [], {
      env: {...process.env, DROP_GENERATION_RESPONSE: drop ? '1' : '0'},
      stdio: ['ignore', 'ignore', 'inherit', 'ipc'],
    });
    children.add(child);
    const [ready] = await once(child, 'message');
    assert.ok(Number.isInteger(ready.port));
    return {child, url: `http://127.0.0.1:${ready.port}`};
  }
  function submit(url, key, userId = 'http-user') {
    return fetch(url + '/recipes/generate', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'Idempotency-Key': key},
      body: JSON.stringify({userId, ingredients: ['rice']}),
      signal: AbortSignal.timeout(3000),
    });
  }
  const first = await start(true);
  const committed = once(first.child, 'message');
  await assert.rejects(submit(first.url, 'lost-response'), /fetch failed/);
  const [message] = await committed;
  assert.equal(message.committed.length, 1);
  assert.ok(message.committed[0].id);
  const exited = once(first.child, 'exit');
  first.child.kill('SIGKILL');
  await exited;

  const restarted = await start(false);
  const replay = await submit(restarted.url, 'lost-response');
  assert.equal(replay.status, 200);
  assert.deepEqual(await replay.json(), message.committed);
  const conflict = await submit(restarted.url, 'lost-response', 'other-user');
  assert.equal(conflict.status, 409);
  await conflict.json();
  const responses = await Promise.all(Array.from({length: 20}, () => submit(restarted.url, 'next-generation')));
  const batches = await Promise.all(responses.map(async response => {
    assert.equal(response.status, 200); return response.json();
  }));
  for (const batch of batches) assert.deepEqual(batch, batches[0]);
  assert.notEqual(batches[0][0].id, message.committed[0].id);
  const original = await submit(restarted.url, 'lost-response');
  assert.deepEqual(await original.json(), message.committed);
  const stored = await fetch(restarted.url + '/stored-recipes', {signal: AbortSignal.timeout(3000)});
  const recipes = await stored.json();
  assert.equal(recipes.length, 2);
  assert.equal(new Set(recipes.map(r => r._id)).size, 2);
});
