import { useEffect, useRef, useState, type ReactNode } from 'react';
import QRCode from 'qrcode';
import { ArrowDownToLine, ArrowUpRight, Check, Copy, File, Link, LoaderCircle, Plus, Smartphone, X } from 'lucide-react';
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

export function Connection({ room }: { room: Room }) {
  const [link, setLink] = useState(() => (/^#[\w-]{43}\.[\w-]{43}$/.test(location.hash)) ? location.href : '');
  const [qr, setQR] = useState('');
  useEffect(() => { let active = true; setQR(''); if (room.invite) void QRCode.toDataURL(room.invite, { width: 240, margin: 2, color: { dark: '#232723', light: '#ffffff' } }).then(value => { if (active) setQR(value); }); return () => { active = false; }; }, [room.invite]);
  const initial = room.status === 'idle' || room.status === 'closed';
  return <section className="connection panel" aria-labelledby="connection-title">
    {initial && <div className="connection-symbol" aria-hidden="true"><i/><i/><span/></div>}
    <h2 id="connection-title">{room.status === 'connected' ? 'You’re connected.' : 'Connect your other device'}</h2>
    {room.nickname ? <p className="room-name">Room <strong aria-label="Room name">{room.nickname}</strong><span>For recognition, not a security code.</span></p> : null}
    {initial ? <>
      
      <button className="button primary full" onClick={() => void room.create()}><Plus size={20}/>Create a room</button>
      <div className="divider"><span>or join with an invite</span></div>
      <label className="join-label" htmlFor="join-invite">Invite link</label><form className="join-form" onSubmit={e => { e.preventDefault(); room.join(link); }}><label className="invite-field"><Link size={20}/><input id="join-invite" aria-label="Invite link" type="url" placeholder="Paste your invite link" value={link} onChange={e => setLink(e.target.value)} required/></label><button className="button secondary" disabled={!link.trim()}>Join</button></form><p className="pairing-note">Keep your invite private. Approve only the device you intended.</p>
    </> : <>
      {room.status === 'waiting' && !room.request ? <><div className="qr-frame">{qr ? <img src={qr} width="220" height="220" alt="Scan this invite with your other device’s camera"/> : <LoaderCircle className="spin"/>}</div><p className="center muted">Scan with your phone camera</p><CopyButton value={room.invite} onError={room.setError}>Copy invite link</CopyButton><input className="invite-visible" aria-label="Room invite" value={room.invite} readOnly onFocus={e => e.target.select()}/><p className="small muted">Invite expires in 10 minutes. Keep it private; compare the device codes before sending.</p></> : null}
      {room.request ? <div className="pair-request"><Smartphone size={44}/><h3>A device wants to join.</h3><p>Only allow it if you just opened your invite on your other device.</p><button className="button accent full" onClick={room.approve}>Allow device</button><button className="button secondary full" onClick={room.reject}>Decline</button></div> : null}
      {room.status === 'connected' ? <div className="connected-state"><div className="connected-icon"><Check size={44}/></div><h3>Ready when you are.</h3><p>Send in either direction. Keep both screens open until delivery is confirmed.</p><span className="connection-dot">Device connected</span></div> : null}
      {room.status === 'verifying' ? <div className="pair-request"><Smartphone size={40}/><h3>Same code. Right device.</h3><p>Compare all eight groups on both screens. Only confirm if they match exactly.</p><output className="verification-code" aria-label="Device verification code">{room.code || 'Checking…'}</output><button className="button accent full" disabled={!room.code || room.confirmed} onClick={room.confirm}>{room.confirmed ? 'Waiting for other device…' : 'Codes match'}</button><button className="button secondary full" onClick={room.mismatch}>Codes do not match</button><p className="small">Files and notes stay locked until both devices confirm. This check expires in 90 seconds.</p></div> : null}
      {['creating', 'connecting', 'approval'].includes(room.status) ? <div className="pending-state"><LoaderCircle size={42} className="spin"/><h3>{room.status === 'approval' ? 'One last hello.' : room.status === 'connecting' ? 'Bringing you together…' : 'Opening your room…'}</h3><p>{room.status === 'approval' ? 'Approve this device on the screen that created the room.' : 'This usually takes a few moments.'}</p></div> : null}
      {room.expires > 0 ? <p className="expiry">Room ends at {new Date(room.expires).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · 2-hour limit</p> : null}
      <button className="text-button leave" onClick={room.leave}><X size={16}/>End room</button>
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
  {kind === 'help' ? <><ol className="steps"><li><strong>Create a room.</strong><p>Open DROP on the device with your files. Create a room and scan its QR code with your other device, or copy the invite link.</p></li><li><strong>Say hello.</strong><p>On the second device, select Join. Approve that device on the first screen.</p></li><li><strong>Send something.</strong><p>Choose or drop a file, then accept it on the receiving screen. When it says Received, select Save file.</p></li></ol><p>Files up to 50 MB. One file per direction at a time. Rooms last 2 hours. Keep both pages in the foreground; phone backgrounding can interrupt transfers.</p><p>This initial build has no relay by default. Some networks cannot connect directly. Try the same Wi-Fi if pairing fails. Mobile access requires an HTTPS deployment.</p></> : <><p>DROP has no signup, analytics, advertising or persistent file database in this build.</p><p>Files and notes travel through a WebRTC data channel, encrypted in transit. When a TURN relay is configured, encrypted traffic may pass through that relay. This is not a guarantee of anonymity.</p><p>The pairing server temporarily holds random room identifiers, credentials, connection messages and room expiry in memory. It sees network addresses; the hosting provider may keep operational logs. Rooms end after 2 hours, when a paired device disconnects, or when you end the room.</p><p>Cloudflare’s public STUN service helps establish connections and receives network metadata. File contents are not sent through STUN. A configured TURN provider can also receive connection metadata and encrypted traffic.</p><p>Received files stay in this page’s memory until you start a new room or close the page. Files you choose to save remain in your downloads. No clipboard content is read automatically; copying is an explicit action.</p><p>Share invites only with the intended device. Approve only a pairing you initiated. Closing a page clears its unsaved transfer history; saved downloads are unaffected.</p></>}
  <p>Unused invites expire after 10 minutes and are consumed when pairing is approved. Declining a pairing revokes its room. Before sending, compare all eight verification-code groups on both screens and confirm only if they match. The code is derived from the connection certificates. This protects only when you compare it correctly and the website code is trustworthy.</p>
  <p>Common executable/script filenames, hidden direction-changing names and common program headers are blocked. This is not antivirus: allowed files and archives can still contain malicious content. Nothing is opened automatically.</p>
  <button className="button primary" onClick={close}>Got it</button></dialog>;
}
