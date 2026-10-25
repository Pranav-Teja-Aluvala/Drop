import { Brand } from './Brand';

import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, FileUp, MessageSquare, X } from 'lucide-react';
import { useRoom } from './useRoom';
import { Connection, InfoDialog, bytes } from './components';
import {RoomActivity, type ActivityView} from './RoomActivity';

export function App() {
  const room = useRoom();
  const [dialog, setDialog] = useState<'help' | 'privacy' | null>(null);
  const [text, setText] = useState('');
  const [dragging, setDragging] = useState(false);
  const [activityView, setActivityView] = useState<ActivityView>('files');
  const [readNotes, setReadNotes] = useState<string[]>([]);
  const notes = room.items.filter(item => item.text !== undefined && item.direction === 'in');
  const unread = notes.filter(item => !readNotes.includes(item.id)).length;
  const notesKey = notes.map(item => item.id).join(',');
  useEffect(() => {
    if (activityView === 'chat') setReadNotes(notesKey ? notesKey.split(',') : []);
  }, [activityView, notesKey]);
  useEffect(() => { if (room.status === 'creating' || room.status === 'closed') { setActivityView('files'); setReadNotes([]); } }, [room.status]);
  const fileInput = useRef<HTMLInputElement>(null);
  const mediaInput = useRef<HTMLInputElement>(null);
  useEffect(() => { if (/^#[\w-]{43}\.[\w-]{43}$/.test(location.hash)) document.getElementById('transfer')?.scrollIntoView(); }, []);
  const connected = room.status === 'connected';
  const intro = {
    idle: room.joining ? ['Joining your room.', 'Your scanned invitation is ready.'] : ['A little closer.', 'Your next screen is one connection away.'],
    creating: room.joining ? ['Joining your room.', 'Your invite was read. Connecting to your other device…'] : ['Opening your room.', 'Stay here while the pairing service responds.'],
    waiting: room.request ? ['Your device has arrived.', 'Check the request on this screen before allowing it.'] : ['Your room is ready.', 'Scan its QR from your other device to continue.'],
    approval: ['Waiting for approval.', 'Check the room name on both screens, then allow this device on your other screen.'],
    connecting: ['Finding your connection.', 'Both devices are looking for a route to each other.'],
    verifying: ['Check both screens.', 'Match every security-code group before sharing.'],
    connected: ['Your devices. Connected.', 'Send files and notes in either direction.'],
    recovering: ['Restoring your connection.', 'Sending is paused while your devices reconnect.'],
    closed: room.error ? ['Let’s reconnect.', 'Review the connection message, then start a fresh room.'] : ['Room ended.', 'Create a fresh room whenever you are ready.']
  }[room.status];
  const activeOutgoing = room.items.some(item => !item.text && item.direction === 'out' && !['Delivered', 'Cancelled', 'Failed', 'Interrupted'].includes(item.status));
  function selectFiles(files: FileList | null) {
    if (!connected || !files?.length) return;
    if (files.length > 1) { room.setError('Choose one file at a time in this first version.'); return; }
    void room.sendFile(files[0]);
  }
  return <><div className="app-shell app-page">
    {room.offer ? <section className="incoming-offer" aria-label="Incoming file" role="status"><div><strong>Your other device sent a file.</strong><p>{room.offer.name} · {bytes(room.offer.size)}</p><p className="small">Accept only files you expect. Files and archives are not scanned for malware.</p></div><div className="offer-actions"><button className="button secondary" onClick={room.decline}>Decline file</button><button className="button accent" onClick={room.accept}>Accept file</button></div></section> : null}
    <div className="workspace-bar"><a className="brand" href="/" aria-label="DROP home"><Brand/></a><button className="text-button" onClick={() => setDialog('help')}>Connection help <ArrowUpRight size={17}/></button></div>
    <main className={connected ? 'connected-layout' : room.joining && room.status !== 'closed' ? 'onboarding-layout joining-layout' : 'onboarding-layout'}><div id="transfer" className="intro"><h1>{intro[0]}</h1><p>{intro[1]}</p>{['idle','closed'].includes(room.status) && <><ol className="connection-steps"><li><span>01</span><div><strong>Create a room</strong><p>A temporary space for your two devices.</p></div></li><li><span>02</span><div><strong>Scan on your other device</strong><p>Open the invite with your phone’s camera, or paste the link.</p></div></li><li><span>03</span><div><strong>Compare codes. Start sharing.</strong><p>Approve your device and check every code group.</p></div></li></ol><p className="onboarding-note">Two devices. No signup.<span>Keep both screens open while you send.</span></p></>}</div>
    {room.error ? <div className="notice" role="alert"><p>{room.error}</p><button className="icon-button" aria-label="Dismiss message" onClick={() => room.setError('')}><X size={18}/></button></div> : null}
    {connected && <div className="file-counts" aria-label="Files in this room"><span>This room</span><span><strong aria-label="Files sent">{room.fileCounts.sent}</strong> sent</span><span><strong aria-label="Files received">{room.fileCounts.received}</strong> received</span></div>}
    <div className="workspace"><Connection room={room}/><section className={`send-panel ${dragging ? 'dragging' : ''}`} aria-label="Send files and notes" onDragOver={e => { e.preventDefault(); if (connected && !activeOutgoing) setDragging(true); }} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false); }} onDrop={e => { e.preventDefault(); setDragging(false); selectFiles(e.dataTransfer.files); }}>
      <div className="drop-zone"><FileUp size={72} strokeWidth={1.1} className="upload-icon"/><h2>{connected ? 'Drop something good.' : 'Good things travel light.'}</h2><p>{connected ? 'Any file type. Your original bytes, delivered.' : 'Pair two devices to start sending.'}</p>
      <input ref={fileInput} className="sr-only" type="file" aria-label="Choose file to send" tabIndex={-1} onChange={e => { selectFiles(e.target.files); e.target.value = ''; }}/>
      <input ref={mediaInput} className="sr-only" type="file" accept="image/*,video/*" aria-label="Choose photo or video to send" tabIndex={-1} onChange={e => { selectFiles(e.target.files); e.target.value = ''; }}/>
      <div className="file-picker-actions"><button className={`button document-picker ${connected ? 'accent' : 'secondary'}`} disabled={!connected || activeOutgoing} onClick={() => fileInput.current?.click()}><FileUp size={19}/>{activeOutgoing ? 'File in progress' : 'Browse files'}</button><button className="button secondary media-picker" disabled={!connected || activeOutgoing} onClick={() => mediaInput.current?.click()}>Photos & videos</button></div><span className="small muted file-limit">One file at a time · up to 50 MB</span><p className="picker-help">Choose any file from Files or your file manager. Nothing is previewed or opened automatically.</p></div>
    </section></div>

    {(connected || room.status === 'recovering' || room.items.length > 0) && <RoomActivity room={room} view={activityView} setView={setActivityView} text={text} setText={setText} unread={unread}/>}
    </main>
    <footer><p>© 2026 Drop · Public beta</p><div className="app-footer-links"><button className="text-button" onClick={() => setDialog('privacy')}>Privacy</button><a href="/terms.html">Terms</a><a href="/cookies.html">Cookies</a><a href="/privacy.html#choices">Contact</a></div></footer>
    {dialog ? <InfoDialog kind={dialog} close={() => setDialog(null)}/> : null}
    {(connected || room.items.length > 0) && activityView !== 'chat' && <aside className="message-dock" aria-label="Room messages">
      <span className="sr-only" role="status">{unread ? `${unread} unread message${unread === 1 ? '' : 's'} from your other device` : ''}</span>
      <button className="message-launcher" aria-label={unread ? `Messages, ${unread} unread` : 'Open messages'} aria-controls="room-activity" onClick={() => { setActivityView('chat'); requestAnimationFrame(() => document.getElementById('room-activity')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})); }}><MessageSquare size={23}/>{unread > 0 && <span className="message-badge">{unread}</span>}</button>
    </aside>}
  </div></>;
}
