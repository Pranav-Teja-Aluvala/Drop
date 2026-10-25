import { useEffect, useRef, useState, type ReactNode } from 'react';
import QRCode from 'qrcode';
import { ArrowDownToLine, ArrowUpRight, Check, Copy, File, Link, LoaderCircle, Plus, Share2, Smartphone, X } from 'lucide-react';
import type { useRoom } from './useRoom';
import type { Item } from './transfer';
export type Room = ReturnType<typeof useRoom>;
export const bytes = (n: number) => n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

export function CopyButton({ value, children = 'Copy', onError }: { value: string; children?: ReactNode; onError: (message: string) => void }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return <button className="button secondary" onClick={async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); clearTimeout(timer.current); timer.current = setTimeout(() => setCopied(false), 1800); }
    catch { onError('Clipboard access was denied. Select and copy the text manually.'); }
  }}>{copied ? <Check size={18}/> : <Copy size={18}/>} {copied ? 'Copied' : children}</button>;
}

function ConnectionProgress({ room }: { room: Room }) {
  const [seconds, setSeconds] = useState(0);
  const active = ['creating', 'connecting', 'recovering', 'approval'].includes(room.status);
  useEffect(() => {
    setSeconds(0);
    if (!active) return;
    const started = Date.now();
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [active, room.phase]);
  const index = {service:0, invite:0, approval:0, gathering:1, routing:1, secure:1, confirm:1, ready:2, reconnecting:1, closed:0}[room.phase];
  const steps = ['Find device', 'Check connection', 'Share'];
  const descriptions = {
    service: seconds >= 12 ? 'The free pairing service may be waking up. Keep this page open; we are still waiting for its response.' : room.joining ? 'Opening your scanned invitation. You do not need to paste a link or press Join.' : 'Contacting the pairing service and opening your temporary room.',
    invite: 'Your room is open. Scan the QR on your other device or share its private invite link.',
    approval: room.request ? 'Check that both screens show the same room name, then allow your device.' : 'Check the room name below against your other screen. Allow this device there to continue.',
    gathering: 'Collecting network addresses from both browsers. No files are being sent.',
    routing: room.relayAvailable ? 'Testing direct and encrypted relay routes between your devices.' : 'Testing a direct route between your devices. Keep both screens open.',
    secure: 'The network route is open. Preparing the encrypted channel and device-code check.',
    confirm: room.confirmed ? 'You confirmed the code. Waiting for the other device to confirm it too.' : 'The encrypted channel is open. Compare all code groups before unlocking transfers.',
    ready: 'Both devices confirmed the connection. Files still need the recipient’s acceptance.',
    reconnecting: 'The network changed or paused. Sending is paused while the existing connection tries to recover.',
    closed: 'This connection has ended.'
  };
  return <div className="connection-progress">
    <ol aria-label="Connection progress">{steps.map((step, i) => <li key={step} className={i < index ? 'done' : i === index ? 'current' : ''} aria-current={i === index ? 'step' : undefined}><span aria-hidden="true">{i < index ? <Check size={12}/> : i + 1}</span><small>{step}</small></li>)}</ol>
    <p className="phase-description" role="status">{descriptions[room.phase]}</p>
    {active && <span className="step-timer">{seconds}s in this step</span>}
    {room.relayAvailable !== null && <span className="route-capability">{room.relayAvailable ? 'Relay fallback available' : 'Direct route only · relay not enabled'}</span>}
  </div>;
}

export function Connection({ room }: { room: Room }) {
  const [link, setLink] = useState(() => (/^#[\w-]{43}\.[\w-]{43}$/.test(location.hash)) ? location.href : '');
  const [qr, setQR] = useState('');
  const [sharing, setSharing] = useState(false);
  async function shareInvite(){if(!navigator.share || sharing)return;setSharing(true);try{await navigator.share({title:'Join my Drop room',text:'Open this private invitation on your other device.',url:room.invite});}catch(error){if(!(error instanceof DOMException && error.name==='AbortError'))room.setError('Sharing was unavailable. Use Copy invite link instead.');}finally{setSharing(false);}}
  useEffect(() => { let active = true; setQR(''); if (room.invite) void QRCode.toDataURL(room.invite, { width: 240, margin: 2, color: { dark: '#232723', light: '#ffffff' } }).then(value => { if (active) setQR(value); }); return () => { active = false; }; }, [room.invite]);
  const initial = (room.status === 'idle' && !room.joining) || room.status === 'closed';
  const activeFile = room.items.find(item => item.text === undefined && !['Delivered','Received','Cancelled','Failed','Interrupted'].includes(item.status));
  return <section className="connection panel" aria-labelledby="connection-title">
    {initial && <div className="connection-symbol" aria-hidden="true"><i/><i/><span/></div>}
    <h2 id="connection-title">{room.status === 'connected' ? 'You’re connected.' : room.status === 'closed' ? 'Start a fresh connection' : room.status === 'recovering' ? 'Connection interrupted' : room.joining ? 'Joining your other device' : 'Connect your other device'}</h2>
    {!initial && <ConnectionProgress room={room}/>}
    {room.status === 'closed' && <p className="recovery-note">Create a new room and scan its new QR on your other device. Old invites cannot reconnect a paired room.</p>}
    {room.nickname ? <p className="room-name">Room <strong aria-label="Room name">{room.nickname}</strong><span>{room.status === 'connected' ? 'Your temporary room' : 'Check this name on both screens.'}</span></p> : null}
    {initial ? <>
      
      <button className="button primary full" onClick={() => void room.create()}><Plus size={20}/>Create a room</button>
      <div className="divider"><span>or join with an invite</span></div>
      <label className="join-label" htmlFor="join-invite">Invite link</label><form className="join-form" onSubmit={e => { e.preventDefault(); room.join(link); }}><label className="invite-field"><Link size={20}/><input id="join-invite" aria-label="Invite link" type="url" placeholder="Paste your invite link" value={link} onChange={e => setLink(e.target.value)} required/></label><button className="button secondary" disabled={!link.trim()}>Join</button></form><p className="pairing-note">Keep your invite private. Approve only the device you intended.</p><p className="browser-hint">Using a QR scanner’s preview? Open this page in Chrome or Safari before joining.</p>
    </> : <>
      {room.status === 'waiting' && !room.request ? <><div className="qr-frame">{qr ? <img src={qr} width="220" height="220" alt="Scan this invite with your other device’s camera"/> : <LoaderCircle className="spin"/>}</div><p className="center muted">Scan with your phone camera</p><div className="invite-actions"><CopyButton value={room.invite} onError={room.setError}>Copy invite link</CopyButton>{typeof navigator.share==='function' && <button className="button secondary" disabled={sharing} onClick={()=>void shareInvite()}><Share2 size={18}/>{sharing?'Opening share menu…':'Share invite'}</button>}</div><input className="invite-visible" aria-label="Room invite" value={room.invite} readOnly onFocus={e => e.target.select()}/><div className="invite-note"><strong>Private invite · 10 minutes</strong><p>Join within 10 minutes of creation. Share only with your intended device, then compare the security codes.</p></div></> : null}
      {room.request ? <div className="pair-request"><Smartphone size={44}/><h3>A device wants to join.</h3><p>Only allow it if you just opened your invite on your other device.</p><button className="button accent full" onClick={room.approve}>Allow device</button><button className="button secondary full" onClick={room.reject}>Decline</button></div> : null}
      {room.status === 'connected' ? <div className="connected-state"><div className="connected-icon"><Check size={44}/></div><h3>{activeFile ? activeFile.status : 'Ready when you are.'}</h3><p>{activeFile ? activeFile.name : 'Send in either direction. Keep both screens open until delivery is confirmed.'}</p>{activeFile && ['Sending','Receiving','Verifying','Verifying receipt'].includes(activeFile.status) && <progress max={100} value={activeFile.progress} aria-label="Current file progress"/>}<span className="connection-dot">Device connected</span></div> : null}
      {room.status === 'verifying' ? <div className="pair-request"><Smartphone size={40}/><h3>Same code. Right device.</h3><p>Compare all eight groups on both screens. Only confirm if they match exactly.</p><output className="verification-code" aria-label="Device verification code">{room.code || 'Checking…'}</output><button className="button accent full" disabled={!room.code || room.confirmed} onClick={room.confirm}>{room.confirmed ? 'Waiting for other device…' : 'Codes match'}</button><button className="button secondary full" onClick={room.mismatch}>Codes do not match</button><p className="small">Files and notes stay locked until both devices confirm. This check expires in 90 seconds.</p></div> : null}
      {['creating', 'connecting', 'approval', 'recovering'].includes(room.status) ? <div className="pending-state"><LoaderCircle size={42} className="spin"/><h3>{room.status === 'approval' ? 'One last hello.' : room.status === 'connecting' ? (room.phase === 'secure' ? 'Securing the connection…' : 'Finding a route…') : room.status === 'recovering' ? 'Trying to reconnect…' : room.joining ? 'Joining your room…' : 'Opening your room…'}</h3><p>{room.status === 'approval' ? 'Approve this device on the screen that created the room.' : room.status === 'recovering' ? 'Keep both devices online. If recovery fails, start a fresh room.' : room.status === 'connecting' ? 'Your file controls unlock after both devices verify their codes.' : room.joining ? 'Your invite was read automatically. Keep this page open.' : 'The QR appears as soon as the server opens your room.'}</p></div> : null}
      {room.expires > 0 ? <div className="room-session"><div className="session-heading"><span>Room ends</span><strong>{new Date(room.expires).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></div><p>2-hour limit from creation. Keep both screens open while sending.</p><button className="button secondary end-room" onClick={room.leave}><X size={16}/>End room</button></div> : <button className="text-button leave" onClick={room.leave}><X size={16}/>End room</button>}
    </>}
  </section>;
}

export function TransferList({ items, cancel, onError }: { items: Item[]; cancel: (id: string) => void; onError: (message: string) => void }) {
  if (!items.length) return null;
  return <section className="history" aria-label="Transfers"><div className="section-head"><h2>This room</h2><span className="small muted">Latest activity first</span></div>{items.map(item => <article className="transfer-row" key={item.id}>
    <div className="file-icon">{item.text ? <Link size={20}/> : <File size={20}/>}</div>
    <div className="transfer-details"><strong>{item.text ? `${item.direction === 'in' ? 'Received' : 'Sent'} note` : item.name}</strong><p className="small muted">{item.direction === 'in' ? 'Incoming' : 'Outgoing'}{!item.text ? ` · ${bytes(item.size)}` : ''} · <span>{item.status}</span></p>
    {item.text ? <pre className="note-content">{item.text}</pre> : null}
    {!item.text && ['Sending', 'Receiving', 'Verifying', 'Verifying receipt'].includes(item.status) ? <progress max="100" value={item.progress} aria-label={`${item.name} transfer progress`}/> : null}</div>
    <div className="transfer-actions">{item.url ? <a className="button secondary" href={item.url} download={item.name}><ArrowDownToLine size={18}/>Save file</a> : null}{item.text ? <CopyButton value={item.text} onError={onError}/> : null}
    {!item.text && !['Delivered', 'Received', 'Cancelled', 'Failed', 'Interrupted'].includes(item.status) ? <button className="icon-button" aria-label={`Cancel ${item.name}`} onClick={() => cancel(item.id)}><X size={18}/></button> : null}</div>
  </article>)}</section>;
}

export function InfoDialog({ kind, close }: { kind: 'help' | 'privacy'; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} onCancel={close} onClick={e => { if (e.target === e.currentTarget) close(); }}><div className="dialog-heading"><h2>{kind === 'help' ? 'A short journey.' : 'What stays where.'}</h2><button className="icon-button" aria-label="Close" onClick={close}><X/></button></div>
  {kind === 'help' ? <><ol className="steps"><li><strong>Create a room.</strong><p>Open DROP on the device with your files. Create a room and scan its QR code with your other device, or copy the invite link.</p></li><li><strong>Say hello.</strong><p>Scanning opens the join request automatically. Check the room name on both screens and approve your device.</p></li><li><strong>Send something.</strong><p>Choose or drop a file, then accept it on the receiving screen. When it says Received, select Save file.</p></li></ol><p>Files up to 50 MB. One file per direction at a time. Rooms last 2 hours. Keep both pages in the foreground; phone backgrounding can interrupt transfers.</p><p>This initial build has no relay by default. Some networks cannot connect directly. Try the same Wi-Fi if pairing fails. Mobile access requires an HTTPS deployment.</p></> : <><p>DROP has no signup, analytics, advertising or persistent file database in this build.</p><p>Files and notes travel through a WebRTC data channel, encrypted in transit. When a TURN relay is configured, encrypted traffic may pass through that relay. This is not a guarantee of anonymity.</p><p>The pairing server temporarily holds random room identifiers, credentials, connection messages and room expiry in memory. It sees network addresses; the hosting provider may keep operational logs. Rooms end after 2 hours, when a paired device disconnects, or when you end the room.</p><p>Cloudflare’s public STUN service helps establish connections and receives network metadata. File contents are not sent through STUN. A configured TURN provider can also receive connection metadata and encrypted traffic.</p><p>Received files stay in this page’s memory until you start a new room or close the page. Files you choose to save remain in your downloads. No clipboard content is read automatically; copying is an explicit action.</p><p>Share invites only with the intended device. Approve only a pairing you initiated. Closing a page clears its unsaved transfer history; saved downloads are unaffected.</p></>}
  <p>Unused invites expire after 10 minutes and are consumed when pairing is approved. Declining a pairing revokes its room. Before sending, compare all eight verification-code groups on both screens and confirm only if they match. The code is derived from the connection certificates. This protects only when you compare it correctly and the website code is trustworthy.</p>
  <p>All file extensions and binary contents are allowed within the size limit. Filenames may be adjusted for your operating system. Files, including programs and archives, are not scanned for malware. Accept only what you expect; nothing is previewed or executed automatically.</p>
  <p><a href="/privacy.html">Full privacy policy</a> · <a href="/cookies.html">Cookies & local data</a></p><button className="button primary" onClick={close}>Got it</button></dialog>;
}
