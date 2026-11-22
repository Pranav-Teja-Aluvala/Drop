import express from 'express';
import { createServer } from 'node:http';
import proxyaddr from 'proxy-addr';
import { isIP } from 'node:net';
import {mountV2} from './v2.mjs';

import { mountLegacy } from './legacy.mjs';

export function createDropServer({ origin, roomTTL = 2 * 60 * 60_000, inviteTTL = 10 * 60_000, backgroundTTL = 5 * 60_000, v2ResumeTTL = 600000, maxRooms = 1000, trustedProxyCIDRs = [], legacyV1 = false } = {}) {
  const app = express();
  const server = createServer(app);
  const quotas = new Map();
  for (const entry of trustedProxyCIDRs) {
    if (!isIP(entry.split('/')[0]) || /\/0$/.test(entry)) throw new Error('Specify exact trusted proxy IPs/CIDRs, never all networks.');
  }
  const trustProxy = proxyaddr.compile(trustedProxyCIDRs);
  const clientIP = req => { try { const address = proxyaddr(req, trustProxy); return isIP(address) ? address : null; } catch { return null; } };
  const allowed = req => req.headers.origin === (origin || `http://${req.headers.host}`);
  app.disable('x-powered-by');
  server.headersTimeout = 10_000;
  server.requestTimeout = 15_000;
  server.maxHeadersCount = 50;
  app.use((req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' ws: wss:; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'" });
    if (origin?.startsWith('https:')) res.set('Strict-Transport-Security', 'max-age=31536000');
    if (origin?.startsWith('https:')) res.set('Content-Security-Policy', `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' ${origin.replace('https:', 'wss:')}; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`);
    next();
  });
  function quota(ip) {
    if (!ip) return false;
    const now = Date.now();
    let entry = quotas.get(ip);
    if (!entry || entry.until < now) { if (!entry && quotas.size >= 10_000) return false; entry = { until: now + 60_000, count: 0 }; quotas.set(ip, entry); }
    return ++entry.count <= 30;
  }
  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  const upgrades = new Map();
  const registerUpgrade = (path, handle) => upgrades.set(path, handle);
  server.on('upgrade', (req, socket, head) => {
    const handle = upgrades.get(req.url);
    if (!handle) return socket.destroy();
    const destroy = () => socket.destroy();
    socket.on('error', destroy);
    handle(req, socket, head);
    socket.removeListener('error', destroy);
  });
  const settings = { registerUpgrade, allowed, quota, clientIP, maxRooms, roomTTL, inviteTTL };
  const v2 = mountV2(app, { ...settings, resumeTTL: v2ResumeTTL });
  const legacy = legacyV1 ? mountLegacy(app, { ...settings, backgroundTTL }) : null;
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint not found.' }));

  const sweep = setInterval(() => {
    for (const [ip, entry] of quotas) if (entry.until <= Date.now()) quotas.delete(ip);
  }, 15_000);
  sweep.unref();
  return {
    app, server, v2, rooms: legacy?.rooms,
    async close() {
      clearInterval(sweep);
      v2.close();
      legacy?.close();
      await new Promise(resolve => server.close(resolve));
    },
  };
}
