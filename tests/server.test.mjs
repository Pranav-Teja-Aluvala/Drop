import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { createDropServer } from '../server/app.mjs';
import { validateProductionOrigin } from '../server/config.mjs';
import { allocateIdentity, allocateNickname } from '../server/identity.mjs';
import { mountProductionFiles } from '../server/static.mjs';
import { createIceServers, relayConfiguration, cloudflareConfiguration, createCloudflareIceServers } from '../server/ice.mjs';
import { createHmac } from 'node:crypto';

test('relay config fails closed on partial settings, short secrets and invalid URLs', () => {
  assert.equal(relayConfiguration(undefined,undefined),null);
  for (const [secret,urls] of [[undefined,'turn:relay.example:3478'],['short','turn:relay.example:3478'],['x'.repeat(32),undefined],['x'.repeat(32),'https://relay.example'],['x'.repeat(32),'turn:user:password@relay.example'],['x'.repeat(32),'turn:relay.example/path'],['x'.repeat(32),'turn:relay.example?transport=bad']]) assert.throws(()=>relayConfiguration(secret,urls));
  const relay = relayConfiguration('x'.repeat(32),'turn:relay.example:3478?transport=udp,turns:relay.example:5349?transport=tcp');
  assert.equal(relay.urls.length,2);
});

test('coturn credentials expire relative to room end, have unique usernames and never expose the shared secret', () => {
  const relay = relayConfiguration('synthetic-test-secret-not-real-12345','turn:relay.example:3478');
  const now = Date.now(), end = now + 60_000;
  const first = createIceServers(relay,end,now)[1], second = createIceServers(relay,end,now)[1];
  assert.equal(Number(first.username.split(':')[0]),Math.floor(end/1000)+300);
  assert.notEqual(first.username,second.username);
  assert.equal(first.credential,createHmac('sha1',relay.secret).update(first.username).digest('base64'));
  assert.equal(JSON.stringify(first).includes(relay.secret),false);
  assert.throws(()=>createIceServers(relay,now-1,now));
});

test('Cloudflare adapter uses server auth, bounded TTL, fixed destination and validated credentials', async () => {
  const config = cloudflareConfiguration('k'.repeat(32),'synthetic-server-token-not-real');
  let request;
  const servers = await createCloudflareIceServers(config,Date.now()+60_000,async (url,options)=>{
    request={url,...options};
    return {ok:true,text:async()=>JSON.stringify({iceServers:[{urls:['turn:turn.cloudflare.com:3478?transport=udp','turn:evil.example:3478?transport=udp'],username:'temporary-user',credential:'temporary-password'}]})};
  });
  assert.ok(request.url.startsWith('https://rtc.live.cloudflare.com/v1/turn/keys/'));
  assert.equal(request.headers.Authorization,`Bearer ${config.apiToken}`);
  assert.ok(JSON.parse(request.body).ttl<=360);
  assert.deepEqual(servers[1].urls,['turn:turn.cloudflare.com:3478?transport=udp']);
  assert.equal(JSON.stringify(servers).includes(config.apiToken),false);
  await assert.rejects(createCloudflareIceServers(config,Date.now()+60_000,async()=>({ok:false})));
  await assert.rejects(createCloudflareIceServers(config,Date.now()+60_000,async()=>({ok:true,text:async()=>'{}'})));
  assert.throws(()=>cloudflareConfiguration('k'.repeat(32),undefined));
});

test('split hosting accepts exactly the configured frontend origin and rejects others', async t => {
  const frontend='https://drop.example.com'; const {base}=await fixture(t,{origin:frontend});
  const good=await fetch(`${base}/api/rooms`,{method:'POST',headers:{Origin:frontend}});
  assert.equal(good.status,201); assert.equal(good.headers.get('access-control-allow-origin'),frontend);
  assert.equal(good.headers.get('access-control-allow-credentials'),null);
  const bad=await fetch(`${base}/api/rooms`,{method:'POST',headers:{Origin:'https://evil.example'}});
  assert.equal(bad.status,403); assert.equal(bad.headers.get('access-control-allow-origin'),null);
  const preflight=await fetch(`${base}/api/rooms`,{method:'OPTIONS',headers:{Origin:frontend,'Access-Control-Request-Method':'POST'}});
  assert.equal(preflight.status,204);
});

test('identity allocation retries collisions without overwriting rooms and fails closed on repeated entropy', () => {
  const existing = 'A'.repeat(43);
  const rooms = new Map([[existing, { marker: 'original' }]]);
  const values = [existing, 'B'.repeat(43), 'B'.repeat(43), 'C'.repeat(43), 'C'.repeat(43), 'D'.repeat(43)];
  assert.deepEqual(allocateIdentity(rooms, () => values.shift()), { id: 'B'.repeat(43), owner: 'C'.repeat(43), invite: 'D'.repeat(43) });
  assert.equal(rooms.get(existing).marker, 'original');
  assert.throws(() => allocateIdentity(rooms, () => existing));
  assert.throws(() => allocateIdentity(rooms, () => 'invalid'));
});

test('10,000 generated room identities have distinct IDs and credentials', () => {
  const rooms = new Map(), credentials = new Set();
  for (let index = 0; index < 10_000; index++) {
    const identity = allocateIdentity(rooms);
    for (const value of Object.values(identity)) {
      assert.match(value, /^[A-Za-z0-9_-]{43}$/);
      assert.equal(credentials.has(value), false);
      credentials.add(value);
    }
    rooms.set(identity.id, identity);
  }
  assert.equal(rooms.size, 10_000);
});

async function fixture(t, options = {}) {
  const drop = createDropServer(options);
  await new Promise(resolve => drop.server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${drop.server.address().port}`;
  t.after(() => drop.close());
  const create = async () => (await fetch(`${base}/api/rooms`, { method: 'POST', headers: { Origin: base } })).json();
  const connect = async (id, token) => {
    const ws = new WebSocket(`${base.replace('http', 'ws')}/signal`, { origin: base });
    const queue = [], waiters = []; let requestId;
    ws.on('message', raw => { const msg = JSON.parse(raw.toString()); if (msg.type === 'request') requestId = msg.requestId; const waiter = waiters.shift(); if (waiter) waiter(msg); else queue.push(msg); });
    await new Promise(resolve => ws.on('open', resolve));
    ws.send(JSON.stringify({ type: 'join', id, token }));
    return { ws, next: () => queue.length ? Promise.resolve(queue.shift()) : new Promise(resolve => waiters.push(resolve)), send: msg => ws.send(JSON.stringify(['approve', 'reject'].includes(msg.type) ? { requestId, ...msg } : msg)) };
  };
  return { ...drop, base, create, connect };
}

test('stale host approval cannot approve a replacement guest', { timeout: 5000 }, async t => {
  const { create, connect, rooms } = await fixture(t);
  const room = await create(); const host = await connect(room.id, room.owner); await host.next();
  const guest = await connect(room.id, room.invite); await guest.next();
  const firstRequest = await host.next();
  guest.ws.close(); await host.next();
  const replacement = await connect(room.id, room.invite); await replacement.next();
  await host.next();
  host.send({type:'approve',requestId:firstRequest.requestId});
  assert.equal((await host.next()).type, 'request-stale');
  assert.equal(rooms.get(room.id).approved, false);
  host.send({type:'approve'});
  assert.equal((await host.next()).type, 'ready');
  assert.equal((await replacement.next()).type, 'ready');
});

test('friendly names retry active collisions and are never join credentials', async t => {
  const names = new Set(['ABCD']); const attempts = ['ABCD', 'WXYZ'];
  assert.equal(allocateNickname(names, () => attempts.shift()), 'WXYZ');
  assert.throws(() => allocateNickname(names, () => 'ABCD'));
  const {create, connect} = await fixture(t);
  const room = await create();
  assert.match(room.nickname, /^[A-HJ-NP-Z2-9]{4}$/);
  const bad = await connect(room.nickname, room.nickname);
  assert.equal((await bad.next()).type, 'error');
  const host = await connect(room.id, room.owner);
  assert.equal((await host.next()).nickname, room.nickname);
  const guest = await connect(room.id, room.invite);
  assert.equal((await guest.next()).nickname, room.nickname);
});

test('origin check prevents foreign room creation', async t => {
  const { base } = await fixture(t);
  const res = await fetch(`${base}/api/rooms`, { method: 'POST', headers: { Origin: 'https://evil.example' } });
  assert.equal(res.status, 403);
  assert.equal(res.headers.get('referrer-policy'), 'no-referrer');
});
test('new rooms get a two-hour lifetime', async t => {
  const { create } = await fixture(t);
  const before = Date.now(); const room = await create();
  assert.ok(room.expires >= before + 2 * 60 * 60_000);
  assert.ok(room.expires <= Date.now() + 2 * 60 * 60_000);
});

test('background deadline is enforced by the server for both peers and repeated hiding cannot extend it', {timeout:5000}, async t=>{
  const {create,connect,rooms}=await fixture(t,{backgroundTTL:120});
  const room=await create();const host=await connect(room.id,room.owner);await host.next();
  const guest=await connect(room.id,room.invite);await guest.next();await host.next();
  host.send({type:'approve'});await host.next();await guest.next();
  guest.send({type:'visibility',hidden:true});
  const h=await host.next(),g=await guest.next();
  assert.equal(h.type,'background');assert.equal(g.selfUntil,h.peerUntil);assert.equal(h.selfUntil,0);
  guest.send({type:'visibility',hidden:true});
  assert.equal((await host.next()).peerUntil,h.peerUntil);await guest.next();
  assert.match((await host.next()).reason,/background or locked for 5 minutes/);
  assert.equal((await guest.next()).type,'closed');assert.equal(rooms.has(room.id),false);
});

test('foreground cancels only its own deadline and a later hide starts a fresh grace period', {timeout:5000}, async t=>{
  const {create,connect,rooms}=await fixture(t,{backgroundTTL:100});
  const room=await create();const host=await connect(room.id,room.owner);await host.next();
  host.send({type:'visibility',hidden:true});const first=await host.next();
  host.send({type:'visibility',hidden:false});assert.equal((await host.next()).selfUntil,0);
  await new Promise(resolve=>setTimeout(resolve,150));assert.equal(rooms.has(room.id),true);
  host.send({type:'visibility',hidden:true});assert.ok((await host.next()).selfUntil>first.selfUntil);
  assert.equal((await host.next()).type,'closed');assert.equal(rooms.size,0);
});

test('one foreground device cannot cancel the other device background deadline', {timeout:5000},async t=>{
  const {create,connect,rooms}=await fixture(t,{backgroundTTL:100});
  const room=await create();const host=await connect(room.id,room.owner);await host.next();
  const guest=await connect(room.id,room.invite);await guest.next();await host.next();
  host.send({type:'visibility',hidden:true});const deadline=(await host.next()).selfUntil;await guest.next();
  guest.send({type:'visibility',hidden:false});assert.equal((await host.next()).selfUntil,deadline);await guest.next();
  assert.equal((await host.next()).type,'closed');await guest.next();assert.equal(rooms.size,0);
});
test('two devices require host approval, third device cannot join, disconnect clears room', { timeout: 5000 }, async t => {
  const { create, connect, rooms } = await fixture(t);
  const room = await create();
  const host = await connect(room.id, room.owner);
  assert.equal((await host.next()).role, 'host');
  const guest = await connect(room.id, room.invite);
  assert.equal((await guest.next()).role, 'guest');
  assert.equal((await host.next()).type, 'request');
  const third = await connect(room.id, room.invite);
  assert.equal((await third.next()).type, 'error');
  guest.send({ type: 'approve' });
  assert.equal(rooms.get(room.id).approved, false);
  host.send({ type: 'approve' });
  assert.equal((await host.next()).initiator, true);
  assert.equal((await guest.next()).initiator, false);
  host.send({ type: 'signal', signal: { description: { type: 'offer', sdp: 'test' } } });
  assert.equal((await guest.next()).signal.description.sdp, 'test');
  guest.ws.close();
  assert.equal((await host.next()).type, 'closed');
  assert.equal(rooms.size, 0);
});
test('bad token including unicode is rejected safely', { timeout: 5000 }, async t => {
  const { create, connect } = await fixture(t);
  const room = await create();
  const wrong = await connect(room.id, 'é'.repeat(32));
  assert.equal((await wrong.next()).type, 'error');
  const host = await connect(room.id, room.owner);
  assert.equal((await host.next()).role, 'host');
});

test('simultaneous pairs cannot authenticate or route signals into another room', { timeout: 5000 }, async t => {
  const { create, connect } = await fixture(t);
  const first = await create(), second = await create();
  const hostA = await connect(first.id, first.owner); await hostA.next();
  const hostB = await connect(second.id, second.owner); await hostB.next();
  const wrong = await connect(second.id, first.invite);
  assert.equal((await wrong.next()).type, 'error');
  const guestA = await connect(first.id, first.invite); await guestA.next(); await hostA.next();
  const guestB = await connect(second.id, second.invite); await guestB.next(); await hostB.next();
  hostA.send({ type: 'approve' }); await hostA.next(); await guestA.next();
  hostB.send({ type: 'approve' }); await hostB.next(); await guestB.next();
  // A client-supplied room ID must never change its authenticated routing context.
  hostA.send({ type: 'signal', id: second.id, signal: { candidate: { candidate: 'only-room-A' } } });
  hostB.send({ type: 'signal', id: first.id, signal: { candidate: { candidate: 'only-room-B' } } });
  assert.equal((await guestA.next()).signal.candidate.candidate, 'only-room-A');
  assert.equal((await guestB.next()).signal.candidate.candidate, 'only-room-B');
});
test('declining revokes room and prevents invite reuse', { timeout: 5000 }, async t => {
  const { create, connect, rooms } = await fixture(t);
  const room = await create(); const host = await connect(room.id, room.owner); await host.next();
  const guest = await connect(room.id, room.invite); await guest.next(); await host.next();
  host.send({ type: 'reject' });
  assert.equal((await guest.next()).type, 'closed');
  assert.equal(rooms.has(room.id), false);
  const next = await connect(room.id, room.invite);
  assert.equal((await next.next()).type, 'error');
});

test('unused invitations expire before the two-hour room lifetime', { timeout: 5000 }, async t => {
  const { create, connect, rooms } = await fixture(t);
  const room = await create(); const host = await connect(room.id, room.owner); await host.next();
  rooms.get(room.id).inviteExpires = Date.now() - 1;
  const guest = await connect(room.id, room.invite);
  assert.equal((await guest.next()).type, 'error');
});
test('production origin rejects HTTP and non-origin URLs', () => {
  for (const value of [undefined, 'http://example.com', 'https://example.com/', 'https://example.com/path', 'https://user:pass@example.com']) assert.throws(() => validateProductionOrigin(value));
  assert.equal(validateProductionOrigin('https://drop.example.com'), 'https://drop.example.com');
});
test('expired room cannot be joined', { timeout: 5000 }, async t => {
  const { create, connect, rooms } = await fixture(t);
  const room = await create(); rooms.get(room.id).expires = Date.now() - 1;
  const host = await connect(room.id, room.owner);
  assert.equal((await host.next()).type, 'error');
});

test('HTTP API does not list rooms, expose credentials or serve source files in production routes', async t => {
  const {app, base, create} = await fixture(t);
  mountProductionFiles(app);
  const room = await create();
  for (const path of ['/api/rooms', `/api/rooms/${room.id}`, '/api/files', '/.env', '/.git/config', '/server/app.mjs', '/src/useRoom.ts', '/package.json', '/assets/missing.js.map']) {
    const response = await fetch(`${base}${path}`);
    assert.equal(response.status, 404, path);
    const body = await response.text();
    assert.equal(body.includes(room.owner), false);
    assert.equal(body.includes(room.invite), false);
  }
  assert.equal((await fetch(base)).status, 200);
  const health = await fetch(`${base}/api/health`);
  assert.deepEqual(await health.json(), {ok:true});
  assert.equal(health.headers.get('access-control-allow-origin'), null);
  assert.equal(health.headers.get('cache-control'), 'no-store');
  assert.equal(health.headers.get('x-frame-options'), 'DENY');
});

test('production policy restricts WebSocket destinations and enables HSTS', async t => {
  const {base} = await fixture(t, {origin:'https://drop.example.com'});
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.headers.get('strict-transport-security'), 'max-age=31536000');
  assert.ok(res.headers.get('content-security-policy').includes("connect-src 'self' wss://drop.example.com;"));
});

test('explicit trusted proxy uses the nearest untrusted client and ignores spoofed earlier hops', async t => {
  const {base} = await fixture(t,{trustedProxyCIDRs:['127.0.0.1/32']});
  for(let i=0;i<31;i++) {
    const res = await fetch(`${base}/api/rooms`,{method:'POST',headers:{Origin:base,'X-Forwarded-For':`198.51.100.${i}, 192.0.2.1`}});
    assert.equal(res.status,i<30 ? 201 : 429);
  }
  assert.equal((await fetch(`${base}/api/rooms`,{method:'POST',headers:{Origin:base,'X-Forwarded-For':'192.0.2.2'}})).status,201);
  assert.throws(()=>createDropServer({trustedProxyCIDRs:['0.0.0.0/0']}));
  assert.throws(()=>createDropServer({trustedProxyCIDRs:['::/0']}));
});

test('room creation quotas and capacity fail closed without accepting spoofed forwarded IPs', async t => {
  const {base, rooms} = await fixture(t);
  for (let i = 0; i < 31; i++) {
    const res = await fetch(`${base}/api/rooms`, {method:'POST',headers:{Origin:base,'X-Forwarded-For':`192.0.2.${i}`}});
    assert.equal(res.status, i < 30 ? 201 : 429);
  }
  assert.equal(rooms.size,30);
  const limited = await fixture(t,{maxRooms:1});
  await limited.create();
  assert.equal((await fetch(`${limited.base}/api/rooms`,{method:'POST',headers:{Origin:limited.base}})).status,429);
});

test('WebSocket rejects absent/foreign origins and non-signal paths', {timeout:5000}, async t => {
  const {base} = await fixture(t);
  for (const [path, origin] of [['/signal',undefined],['/signal','https://evil.example'],['/other',base]]) {
    await new Promise((resolve,reject) => {
      const ws = new WebSocket(`${base.replace('http','ws')}${path}`,origin ? {origin} : {});
      ws.on('open', () => {ws.terminate(); reject(new Error('Unauthorized upgrade accepted'));});
      ws.on('error', resolve);
    });
  }
});

test('WebSocket rejects malformed, binary and oversized messages', {timeout:5000}, async t => {
  const {base} = await fixture(t);
  for (const payload of ['{', 'null', '[]', Buffer.from('binary'), 'x'.repeat(25*1024)]) {
    const code = await new Promise((resolve,reject) => {
      const ws = new WebSocket(`${base.replace('http','ws')}/signal`,{origin:base});
      ws.on('error',reject);
      ws.on('close',resolve);
      ws.on('open',() => {
        ws.send(payload);
      });
    });
    assert.ok([1008,1009].includes(code),String(code));
  }
});

test('authenticated message flooding closes the socket', {timeout:5000}, async t => {
  const {create,connect} = await fixture(t); const room = await create();
  const host = await connect(room.id,room.owner); await host.next();
  const closed = new Promise(resolve => host.ws.on('close',resolve));
  for(let i=0;i<101;i++) host.send({type:'unknown'});
  assert.equal(await closed,1008);
});

test('incorrect tokens cannot distinguish an existing room from an unknown room', async t => {
  const {create,connect} = await fixture(t); const room = await create();
  const a = await connect(room.id,'X'.repeat(43));
  const b = await connect('Y'.repeat(43),'X'.repeat(43));
  assert.deepEqual(await a.next(),await b.next());
});

test('malformed signaling closes only the attacking room', {timeout:5000}, async t => {
  const {create,connect,rooms} = await fixture(t);
  const untouched = await create();
  for (const signal of [{description:{type:'answer',sdp:'wrong role'}},{candidate:{candidate:42}},{description:{type:'offer',sdp:'x'},candidate:{candidate:'x'}}]) {
    const room = await create(); const host = await connect(room.id,room.owner); await host.next();
    const guest = await connect(room.id,room.invite); await guest.next(); await host.next();
    host.send({type:'approve'}); await host.next(); await guest.next();
    host.send({type:'signal',signal});
    assert.equal((await guest.next()).type,'closed');
    assert.equal(rooms.has(untouched.id),true);
  }
});

test('duplicate connection descriptions cannot renegotiate a paired room', {timeout:5000}, async t => {
  const {create,connect} = await fixture(t); const room = await create();
  const host = await connect(room.id,room.owner); await host.next();
  const guest = await connect(room.id,room.invite); await guest.next(); await host.next();
  host.send({type:'approve'}); await host.next(); await guest.next();
  const message = {type:'signal',signal:{description:{type:'offer',sdp:'v=0'}}};
  host.send(message); assert.equal((await guest.next()).type,'signal');
  host.send(message); assert.equal((await guest.next()).type,'closed');
});
