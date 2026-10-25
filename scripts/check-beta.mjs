import { spawn } from 'node:child_process';
import { createDropServer } from '../server/app.mjs';
import { mountProductionFiles } from '../server/static.mjs';

// Exercise the actual built assets and pairing service, rather than Vite's dev UI.
// Loopback HTTP is a browser secure context; this does not certify public TLS.
const { app, server } = createDropServer();
mountProductionFiles(app);
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
console.log(`Production-build beta tests: ${origin}`);
try {
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(2)], {
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
