import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({mode, command}) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const backend = env.VITE_SIGNAL_ORIGIN || '';
  if (backend) {
    const url = new URL(backend);
    if (url.protocol !== 'https:' || url.origin !== backend) throw new Error('VITE_SIGNAL_ORIGIN must be an exact HTTPS origin, with no path or trailing slash.');
  }
  if (process.env.VERCEL && !backend) throw new Error('Set VITE_SIGNAL_ORIGIN to the pairing server HTTPS origin before deploying to Vercel.');
  const connect = backend ? ` ${backend} ${backend.replace('https:', 'wss:')}` : '';
  return {plugins:[react(), ...(command === 'build' ? [{name:'drop-static-csp',transformIndexHtml(){return [{tag:'meta',attrs:{'http-equiv':'Content-Security-Policy',content:`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'${connect}; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'`},injectTo:'head-prepend' as const}];}}] : [])],build:{sourcemap:false},server:{hmr:false}};
});
