import { spawn } from 'node:child_process';
import { createDropServer } from '../server/app.mjs';
import { mountProductionFiles } from '../server/static.mjs';
import {readdirSync} from 'node:fs';

// Exercise the actual built assets and pairing service, rather than Vite's dev UI.
// Loopback HTTP is a browser secure context; this does not certify public TLS.
// Each spec gets a fresh server so a growing suite cannot exhaust the real
// per-IP abuse quota simply by sharing one loopback address. Do not relax it.
const requested = process.argv.slice(2);
const groups = requested.length ? [requested] : readdirSync(new URL('../tests/browser/',import.meta.url)).filter(file=>file.endsWith('.spec.ts')).sort().map(file=>[file]);
for(const args of groups){
  const { app, server } = createDropServer();
  mountProductionFiles(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  console.log(`Production-build beta tests (${args.join(' ')}): ${origin}`);
  try {
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', ...args], {
      env: { ...process.env, TEST_BASE_URL: origin }, stdio: 'inherit'
    });
    child.once('error', reject);
    child.once('exit', resolve);
  });
  if (code !== 0) process.exitCode = 1;
  } finally {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  }
}
