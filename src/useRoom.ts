import { useEffect, useRef, useState } from 'react';
import { Transfer, type Item } from './transfer';
import { connectionCode, VerificationGate } from './security';
export type Status = 'idle' | 'creating' | 'waiting' | 'approval' | 'connecting' | 'verifying' | 'connected' | 'closed';
export function useRoom() {
  const [status, setStatus] = useState<Status>('idle');
  const [invite, setInvite] = useState('');
  const [request, setRequest] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [expires, setExpires] = useState(0);
  const [code, setCode] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const gate = useRef<VerificationGate | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [fileCounts, setFileCounts] = useState({ sent: 0, received: 0 });
  const [offer, setOffer] = useState<{ name: string; size: number } | null>(null);
  const socket = useRef<WebSocket | null>(null);
  const peer = useRef<RTCPeerConnection | null>(null);
  const transfer = useRef<Transfer | null>(null);
  const generation = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const busy = useRef(false);
  const channelAttached = useRef(false);

  function cleanup(release = false) {
    clearTimeout(timer.current);
    gate.current?.dispose(); gate.current = null; setCode(''); setConfirmed(false);
    transfer.current?.dispose();
    if (release) transfer.current?.releaseDownloads();
    if (peer.current) { peer.current.onconnectionstatechange = null; peer.current.close(); peer.current = null; }
    if (socket.current) { socket.current.onclose = null; socket.current.onmessage = null; socket.current.close(); socket.current = null; }
    setOffer(null); setRequest(''); setNickname(''); channelAttached.current = false; busy.current = false;
  }
  function end(message: string) { ++generation.current; cleanup(); setInvite(''); setStatus('closed'); if (message) setError(message); }
  function signal(data: object) { if (socket.current?.readyState === WebSocket.OPEN) socket.current.send(JSON.stringify(data)); }
  function attach(channel: RTCDataChannel, roomId: string) {
    if (channelAttached.current) { channel.close(); end('Unexpected additional transfer channel.'); return; }
    channelAttached.current = true;
    const gen = generation.current;
    channel.onopen = async () => {
      clearTimeout(timer.current); setStatus('verifying'); setInvite(''); setError('');
      // Reject unexpected traffic while the comparison code is being computed.
      channel.onmessage = () => end('Unexpected traffic before verification.');
      try {
        const pc = peer.current;
        const value = await connectionCode(pc?.localDescription?.sdp || '', pc?.remoteDescription?.sdp || '', roomId);
        if (generation.current !== gen || channel.readyState !== 'open') return;
        setCode(value);
        gate.current = new VerificationGate(channel, value, () => {
          setStatus('connected');
          transfer.current = new Transfer(channel, { item: item => {
            setItems(prev => [item, ...prev.filter(x => x.id !== item.id)].slice(0, 40));
            // The protocol emits each completed receipt once. Keep room totals independent
            // of the bounded activity history, so sending notes cannot reduce the count.
            if (item.text === undefined && (item.status === 'Delivered' || item.status === 'Received')) {
              const key = item.direction === 'out' ? 'sent' : 'received';
              setFileCounts(prev => ({ ...prev, [key]: prev[key] + 1 }));
            }
          }, offer: setOffer, error: setError });
        }, end);
      } catch { if (generation.current === gen) end('Could not verify this connection. Create a new room.'); }
    };
    channel.onclose = () => { if (peer.current) end('Connection ended. Create a new room to send again.'); };
    channel.onerror = () => setError('The transfer channel encountered a problem.');
  }
  function connect(id: string, token: string, gen: number) {
    const endpoint = new URL(import.meta.env.VITE_SIGNAL_ORIGIN || location.origin);
    const ws = new WebSocket(`${endpoint.protocol === 'https:' ? 'wss:' : 'ws:'}//${endpoint.host}/signal`);
    socket.current = ws;
    ws.onopen = () => ws.send(JSON.stringify({ type: 'join', id, token }));
    let candidates: RTCIceCandidateInit[] = [];
    let chain = Promise.resolve();
    ws.onmessage = event => {
      chain = chain.then(async () => {
        if (generation.current !== gen) return;
        const msg = JSON.parse(event.data);
        if (msg.type === 'joined') { setNickname(msg.nickname); setExpires(msg.expires); setStatus(msg.role === 'host' ? 'waiting' : 'approval'); busy.current = false; }
        else if (msg.type === 'request') setRequest(msg.requestId);
        else if (msg.type === 'request-gone') setRequest('');
        else if (msg.type === 'request-stale') setError('The joining device changed. Review the current request again.');
        else if (msg.type === 'closed' || msg.type === 'error') end(msg.reason || msg.message);
        else if (msg.type === 'ready') {
          if (peer.current) { end('Unexpected duplicate connection setup.'); return; }
          setRequest(''); setStatus('connecting');
          const pc = new RTCPeerConnection({ iceServers: msg.iceServers }); peer.current = pc;
          pc.onicecandidate = e => { if (e.candidate) signal({ type: 'signal', signal: { candidate: e.candidate.toJSON() } }); };
          pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'failed') end('These devices could not connect. Try the same Wi-Fi. This build has no relay configured by default.');
            if (pc.connectionState === 'disconnected') setError('Connection interrupted. Keep both screens open; waiting for the network.');
            if (pc.connectionState === 'connected') setError('');
          };
          pc.ondatachannel = e => attach(e.channel, id);
          timer.current = setTimeout(() => end('Connection timed out. Try the same Wi-Fi or configure a relay.'), 30_000);
          if (msg.initiator) { attach(pc.createDataChannel('drop', { ordered: true }), id); await pc.setLocalDescription(await pc.createOffer()); signal({ type: 'signal', signal: { description: pc.localDescription } }); }
        } else if (msg.type === 'signal' && peer.current) {
          const pc = peer.current;
          if (msg.signal.description) {
            if (pc.remoteDescription) { end('Unexpected connection renegotiation. Room closed.'); return; }
            await pc.setRemoteDescription(msg.signal.description);
            for (const candidate of candidates) await pc.addIceCandidate(candidate); candidates = [];
            if (msg.signal.description.type === 'offer') { await pc.setLocalDescription(await pc.createAnswer()); signal({ type: 'signal', signal: { description: pc.localDescription } }); }
          } else if (msg.signal.candidate) {
            if (pc.remoteDescription) await pc.addIceCandidate(msg.signal.candidate); else { if (candidates.length >= 256) throw new Error('Too many candidates'); candidates.push(msg.signal.candidate); }
          }
        }
      }).catch(() => end('Pairing failed. Create a new room and try again.'));
    };
    ws.onerror = () => setError('Could not reach the pairing server.');
    ws.onclose = () => { if (generation.current === gen) end('Pairing server disconnected. Create a new room to reconnect.'); };
  }
  function supported() {
    if (!window.isSecureContext || !window.RTCPeerConnection || !crypto.subtle) { setError('Open DROP over HTTPS (or localhost) in a browser with WebRTC support.'); return false; }
    return true;
  }
  async function create() {
    if (busy.current || !supported()) return;
    cleanup(true); setItems([]); setFileCounts({ sent: 0, received: 0 }); setError(''); setStatus('creating'); busy.current = true;
    const gen = ++generation.current;
    try {
      const response = await fetch(`${import.meta.env.VITE_SIGNAL_ORIGIN || ''}/api/rooms`, { method: 'POST', credentials: 'omit', signal: AbortSignal.timeout(75_000) });
      const room = await response.json();
      if (!response.ok) throw new Error(room.error || 'Could not create a room.');
      if (gen !== generation.current) return;
      setInvite(`${location.origin}/app#${room.id}.${room.invite}`); connect(room.id, room.owner, gen);
    } catch (e) { if (gen === generation.current) end(e instanceof Error ? e.message : 'Could not create a room.'); }
  }
  function join(value: string) {
    if (busy.current || !supported()) return;
    let url: URL;
    try { url = new URL(value); } catch { setError('Paste the complete invite link from your other device.'); return; }
    if (url.origin !== location.origin || !/^#[\w-]{43}\.[\w-]{43}$/.test(url.hash)) { setError('Use a newly created invite link from this DROP website.'); return; }
    history.replaceState(null, '', location.pathname);
    cleanup(true); setItems([]); setFileCounts({ sent: 0, received: 0 }); setError(''); setStatus('creating'); busy.current = true;
    const [id, token] = url.hash.slice(1).split('.'); connect(id, token, ++generation.current);
  }
  useEffect(() => () => { ++generation.current; cleanup(true); }, []);
  return { status, invite, request, nickname, error, expires, items, fileCounts, offer, create, join, setError, code, confirmed,
    confirm: () => { if (gate.current) { setConfirmed(true); gate.current.confirm(); } },
    mismatch: () => { signal({ type: 'leave' }); end('Codes did not match. Nothing was transferred.'); },
    approve: () => signal({ type: 'approve', requestId: request }), reject: () => { signal({ type: 'reject', requestId: request }); },
    leave: () => { signal({ type: 'leave' }); end(''); },
    sendFile: async (file: File) => { try { await transfer.current?.offer(file); } catch (e) { setError(e instanceof Error ? e.message : 'Could not send file.'); } },
    sendText: (text: string) => { try { if (!transfer.current) return false; transfer.current.text(text); return true; } catch (e) { setError(e instanceof Error ? e.message : 'Could not send note.'); return false; } },
    accept: () => transfer.current?.accept(), decline: () => transfer.current?.decline(), cancel: (id: string) => transfer.current?.cancel(id) };
}
