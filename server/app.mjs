import express from 'express';
import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { createIceServers, relayConfiguration, cloudflareConfiguration, createCloudflareIceServers } from './ice.mjs';
import { WebSocketServer, WebSocket } from 'ws';
import proxyaddr from 'proxy-addr';
import { isIP } from 'node:net';
import { allocateIdentity, allocateNickname, randomToken as token } from './identity.mjs';

const equal = (a, b) => typeof a === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const send = (ws, data) => { if (ws?.readyState === WebSocket.OPEN) { if (ws.bufferedAmount > 256 * 1024) { ws.terminate(); return; } ws.send(JSON.stringify(data)); } };

export function createDropServer({ origin, roomTTL = 2 * 60 * 60_000, inviteTTL = 10 * 60_000, maxRooms = 1000, trustedProxyCIDRs = [] } = {}) {
  const app = express();
  const relay = relayConfiguration(process.env.TURN_SECRET, process.env.TURN_URLS);
  const cloudflare = cloudflareConfiguration(process.env.CF_TURN_KEY_ID,process.env.CF_TURN_API_TOKEN);
  if (relay && cloudflare) throw new Error('Choose one TURN provider.');
  const server = createServer(app);
  const rooms = new Map();
  const nicknames = new Set();
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
  app.post('/api/rooms', (req, res) => {
    if (!allowed(req)) return res.status(403).json({ error: 'This origin is not allowed.' });
    res.set('Access-Control-Allow-Origin', req.headers.origin);
    res.vary('Origin');
    if (!quota(clientIP(req)) || rooms.size >= maxRooms) return res.status(429).json({ error: 'Too many rooms. Try again in a minute.' });
    let identity, nickname;
    try { identity = allocateIdentity(rooms); nickname = allocateNickname(nicknames); }
    catch { return res.status(503).json({ error: 'Could not create a safe room. Try again later.' }); }
    const { id } = identity;
    const room = { ...identity, nickname, requestId: null, expires: Date.now() + roomTTL, inviteExpires: Date.now() + inviteTTL, host: null, guest: null, approved: false };
    rooms.set(id, room);
    nicknames.add(nickname);
    res.status(201).json({ id, owner: room.owner, invite: room.invite, nickname, expires: room.expires });
  });
  app.options('/api/rooms', (req, res) => {
    if (!allowed(req) || req.headers['access-control-request-method'] !== 'POST') return res.sendStatus(403);
    res.set({ 'Access-Control-Allow-Origin': req.headers.origin, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' });
    res.vary('Origin'); res.sendStatus(204);
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint not found.' }));
  const wss = new WebSocketServer({ noServer: true, maxPayload: 24 * 1024 });
  server.on('upgrade', (req, socket, head) => {
    if (req.url !== '/signal' || !allowed(req) || wss.clients.size >= maxRooms * 2 || !quota(clientIP(req))) { socket.destroy(); return; }
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws));
  });
  function removeRoom(room, reason) {
    if (!rooms.has(room.id)) return;
    rooms.delete(room.id);
    nicknames.delete(room.nickname);
    for (const ws of [room.host, room.guest]) { send(ws, { type: 'closed', reason }); ws?.close(1000); }
  }
  wss.on('connection', ws => {
    let room, role;
    let descriptionSent = false, candidatesSent = 0;
    let count = 0, windowStart = Date.now();
    ws.alive = true;
    ws.on('pong', () => { ws.alive = true; });
    const authTimer = setTimeout(() => ws.close(1008, 'Join timeout'), 10_000);
    ws.on('message', (raw, binary) => {
      if (Date.now() - windowStart > 10_000) { count = 0; windowStart = Date.now(); }
      if (binary || ++count > 100) return ws.close(1008, 'Rate limit');
      let data;
      try { data = JSON.parse(raw.toString()); } catch { return ws.close(1008, 'Invalid message'); }
      if (!data || typeof data !== 'object' || Array.isArray(data) || typeof data.type !== 'string') return ws.close(1008);
      if (!room) {
        const candidate = typeof data.id === 'string' && /^[\w-]{43}$/.test(data.id) ? rooms.get(data.id) : undefined;
        const deny = () => { send(ws, { type: 'error', message: 'This invite is unavailable. Create a new room.' }); ws.close(1008); };
        if (data.type !== 'join' || typeof data.token !== 'string' || !/^[\w-]{43}$/.test(data.token) || !candidate || candidate.expires <= Date.now() || (!candidate.approved && candidate.inviteExpires <= Date.now())) return deny();
        const isHost = equal(data.token, candidate.owner);
        if ((!isHost && (!equal(data.token, candidate.invite) || candidate.approved)) || (isHost ? candidate.host : candidate.guest) || (!isHost && !candidate.host)) {
          return deny();
        }
        room = candidate; role = isHost ? 'host' : 'guest'; room[role] = ws; clearTimeout(authTimer);
        send(ws, { type: 'joined', role, nickname: room.nickname, expires: room.expires });
        if (!isHost) { room.requestId = token(); send(room.host, { type: 'request', requestId: room.requestId }); }
        return;
      }
      if (rooms.get(room.id) !== room) return ws.close(1008);
      if (room.expires <= Date.now() || (!room.approved && room.inviteExpires <= Date.now())) { removeRoom(room, 'This room or invite has expired.'); return; }
      if (['approve', 'reject'].includes(data.type) && role === 'host' && !room.approved && data.requestId !== room.requestId) { send(ws, { type: 'request-stale' }); return; }
      if (data.type === 'approve' && role === 'host' && room.guest && !room.approved) {
        room.approved = true;
        room.invite = token(); // Consume the public invitation permanently on approval.
        // One credential per device. Consume approval before awaiting the provider.
        const prepare = async () => {
          try {
            const issue = () => cloudflare ? createCloudflareIceServers(cloudflare,room.expires) : Promise.resolve(createIceServers(relay,room.expires));
            const [hostIce,guestIce] = await Promise.all([issue(),issue()]);
            if (rooms.get(room.id) !== room || room.expires <= Date.now()) return;
            send(room.host, { type: 'ready', initiator: true, iceServers:hostIce });
            send(room.guest, { type: 'ready', initiator: false, iceServers:guestIce });
          } catch { removeRoom(room,'Relay setup failed. Please try again later.'); }
        };
        void prepare();
      } else if (data.type === 'reject' && role === 'host' && !room.approved) {
        removeRoom(room, 'Pairing declined. This invite is revoked; create a new room.');
      } else if (data.type === 'signal' && room.approved) {
        const signal = data.signal;
        if (!signal || typeof signal !== 'object' || Array.isArray(signal) || Boolean(signal.description) === Boolean(signal.candidate)) return ws.close(1008, 'Invalid signal');
        if (signal.description) {
          const d = signal.description;
          if (descriptionSent || d.type !== (role === 'host' ? 'offer' : 'answer') || typeof d.sdp !== 'string' || d.sdp.length > 20_000) return ws.close(1008, 'Invalid description');
          descriptionSent = true;
        } else {
          const c = signal.candidate;
          if (++candidatesSent > 256 || typeof c.candidate !== 'string' || c.candidate.length > 2048 || (c.sdpMid != null && (typeof c.sdpMid !== 'string' || c.sdpMid.length > 64)) || (c.sdpMLineIndex != null && (!Number.isInteger(c.sdpMLineIndex) || c.sdpMLineIndex < 0 || c.sdpMLineIndex > 64))) return ws.close(1008, 'Invalid candidate');
        }
        send(role === 'host' ? room.guest : room.host, { type: 'signal', signal });
      } else if (data.type === 'leave') removeRoom(room, 'The other device ended this room.');
    });
    ws.on('error', () => {});
    ws.on('close', () => {
      clearTimeout(authTimer);
      if (!room || room[role] !== ws) return;
      if (role === 'guest' && !room.approved) { room.guest = null; room.requestId = null; send(room.host, { type: 'request-gone' }); }
      else removeRoom(room, 'The other device disconnected. Create a new room to reconnect.');
    });
  });
  const sweep = setInterval(() => {
    for (const room of rooms.values()) {
      if (room.expires <= Date.now()) removeRoom(room, 'This room has reached its time limit. Create a new room to continue.');
      else if (!room.approved && room.inviteExpires <= Date.now()) removeRoom(room, 'This unused invite expired after 10 minutes. Create a new room.');
    }
    for (const [ip, entry] of quotas) if (entry.until < Date.now()) quotas.delete(ip);
    for (const ws of wss.clients) { if (!ws.alive) ws.terminate(); else { ws.alive = false; ws.ping(); } }
  }, 15_000);
  sweep.unref();
  return { app, server, rooms, close: async () => { clearInterval(sweep); for (const ws of wss.clients) ws.terminate(); wss.close(); await new Promise(resolve => server.close(resolve)); } };
}
