import { createHmac, randomBytes } from 'node:crypto';

export function relayConfiguration(secret, urls) {
  if (!secret && !urls) return null;
  if (!secret || !urls || secret.length < 32) throw new Error('TURN needs URLs and a server-side shared secret of at least 32 characters.');
  const list = urls.split(',').map(value => value.trim());
  if (!list.length || list.length > 8) throw new Error('Invalid TURN URL count');
  for (const value of list) {
    if (!/^turns?:/.test(value) || /\s/.test(value)) throw new Error('Invalid TURN URL');
    const parsed = new URL(value.replace(/^turns?:/, value.startsWith('turns:') ? 'https://' : 'http://'));
    if (!parsed.hostname || parsed.username || parsed.password || parsed.hash || parsed.pathname !== '/' || !/^(\?transport=(udp|tcp))?$/.test(parsed.search) || value.split('?')[0].includes('/')) throw new Error('Invalid TURN URL');
  }
  return { secret, urls: list };
}

export function createIceServers(relay, expiresAt, now = Date.now()) {
  const servers = [{ urls: 'stun:stun.cloudflare.com:3478' }];
  if (relay) {
    if (expiresAt <= now) throw new Error('Room has expired');
    const username = `${Math.floor(expiresAt / 1000) + 300}:${randomBytes(8).toString('hex')}`;
    servers.push({ urls: relay.urls, username, credential: createHmac('sha1', relay.secret).update(username).digest('base64') });
  }
  return servers;
}

export function cloudflareConfiguration(keyId, apiToken) {
  if (!keyId && !apiToken) return null;
  if (!keyId || !/^[A-Za-z0-9_-]{16,128}$/.test(keyId) || !apiToken || apiToken.length < 20 || /\s/.test(apiToken)) throw new Error('Cloudflare TURN requires a valid server-side key ID and API token.');
  return {keyId,apiToken};
}

export async function createCloudflareIceServers(config, expiresAt, fetcher = fetch) {
  const ttl = Math.ceil((expiresAt-Date.now())/1000)+300;
  if (ttl <= 300 || ttl > 7500) throw new Error('Invalid relay lifetime');
  const response = await fetcher(`https://rtc.live.cloudflare.com/v1/turn/keys/${config.keyId}/credentials/generate-ice-servers`, {
    method:'POST', headers:{Authorization:`Bearer ${config.apiToken}`,'Content-Type':'application/json'},body:JSON.stringify({ttl}),signal:AbortSignal.timeout(8000),redirect:'error'
  });
  if (!response.ok) throw new Error('Relay credentials unavailable');
  const body = await response.text();
  if (body.length > 32_000) throw new Error('Invalid relay response');
  const data = JSON.parse(body);
  if (!Array.isArray(data.iceServers) || data.iceServers.length > 8) throw new Error('Invalid relay response');
  const servers = [{urls:'stun:stun.cloudflare.com:3478'}];
  for (const entry of data.iceServers) {
    const urls = Array.isArray(entry.urls) ? entry.urls : [entry.urls];
    const turn = urls.filter(value=>typeof value === 'string' && /^turns?:turn\.cloudflare\.com:(3478|443|80|5349)\?transport=(udp|tcp)$/.test(value));
    if (!turn.length) continue;
    if (typeof entry.username !== 'string' || entry.username.length > 1024 || typeof entry.credential !== 'string' || entry.credential.length > 2048 || !entry.username || !entry.credential) throw new Error('Invalid relay response');
    servers.push({urls:turn,username:entry.username,credential:entry.credential});
  }
  if (servers.length < 2) throw new Error('No usable relay credentials');
  return servers;
}
