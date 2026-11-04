import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, symlink, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

test('clean application starts without credentials or network address discovery', async () => {
  const source = fileURLToPath(new URL('..', import.meta.url));
  const root = await mkdtemp(join(tmpdir(), 'veganify-startup-'));
  let child;
  try {
    for (const name of ['routes','utils','workers','config','server.js','package.json']) {
      await cp(join(source,name), join(root,name), {recursive:true});
    }
    await symlink(join(source,'node_modules'), join(root,'node_modules'), 'dir');
    await writeFile(join(root,'no-network.mjs'), `import os from 'node:os'; os.networkInterfaces = () => { throw new Error('controlled discovery failure'); };`);
    const reservation = createServer();
    await new Promise(resolve => reservation.listen(0,'127.0.0.1',resolve));
    const port = reservation.address().port;
    await new Promise(resolve => reservation.close(resolve));
    let output = '';
    child = spawn(process.execPath, ['--import','./no-network.mjs','server.js'], {
      cwd:root, env:{PATH:process.env.PATH, PORT:String(port)}, stdio:['ignore','pipe','pipe'],
    });
    child.stdout.on('data', bytes => { output += bytes; });
    child.stderr.on('data', bytes => { output += bytes; });
    let ready = false;
    for (let attempt=0; attempt<100; attempt++) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/`, {signal:AbortSignal.timeout(100)});
        assert.equal(response.status,200);
        assert.equal((await response.json()).ok,true);
        ready=true; break;
      } catch { if (child.exitCode !== null) break; await new Promise(resolve => setTimeout(resolve,30)); }
    }
    assert.ok(ready,output);
    assert.match(output,/Network address discovery unavailable/);
    assert.doesNotMatch(output,/Uncaught Exception|Unhandled Rejection/);
  } finally {
    if (child && child.exitCode === null) {
      await new Promise(resolve => { child.once('exit',resolve); child.kill('SIGKILL'); });
    }
    await rm(root,{recursive:true,force:true});
  }
});
