import { mountProductionFiles } from './static.mjs';
import { createDropServer } from './app.mjs';
import { validateProductionOrigin } from './config.mjs';
const production = process.argv.includes('--production');
if (production) validateProductionOrigin(process.env.PUBLIC_ORIGIN);
const { app, server } = createDropServer({ origin: process.env.PUBLIC_ORIGIN, trustedProxyCIDRs: (process.env.TRUSTED_PROXY_CIDRS || '').split(',').map(value => value.trim()).filter(Boolean) });
if (production) {
  mountProductionFiles(app);
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'spa' });
  app.use(vite.middlewares);
}
server.listen(Number(process.env.PORT) || 5173, '0.0.0.0', () => console.log(`DROP listening on port ${Number(process.env.PORT) || 5173}`));
