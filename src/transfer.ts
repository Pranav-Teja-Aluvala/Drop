import { safeFilename } from './security';
export const MAX_FILE = 50 * 1024 * 1024;
export const MAX_TEXT = 50_000;
const CHUNK = 16 * 1024;
export type Item = { id: string; name: string; size: number; direction: 'in' | 'out'; status: string; progress: number; url?: string; text?: string; createdAt?: number };
type Offer = { type: 'offer'; id: string; name: string; size: number; hash: string };
type Callbacks = { item: (item: Item) => void; offer: (offer: Offer | null) => void; error: (message: string) => void };
const digest = async (bytes: ArrayBuffer) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(x => x.toString(16).padStart(2, '0')).join('');

// One active file per direction. Ordered, reliable channel; explicit offers and SHA-256 receipt.
export class Transfer {
  private outgoing?: { file: File; item: Item; hash: string; cancelled: boolean; timer?: ReturnType<typeof setTimeout> };
  private incoming?: { offer: Offer; item: Item; chunks: ArrayBuffer[]; received: number; accepted: boolean; finalizing?: boolean; timer?: ReturnType<typeof setTimeout> };
  private urls: string[] = [];
  private disposed = false;
  private retainedBytes = 0;
  private retainedFiles = 0;
  private pendingTexts = new Map<string, Item>();
  private textTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private incomingText?: { id: string; length: number; text: string; timer: ReturnType<typeof setTimeout> };
  private controlWindow = Date.now();
  private controlCount = 0;
  constructor(private channel: RTCDataChannel, private callbacks: Callbacks) {
    channel.binaryType = 'arraybuffer';
    channel.bufferedAmountLowThreshold = 128 * 1024;
    channel.onmessage = e => { void this.receive(e.data).catch(() => this.fail('The transfer could not be read. Please try again.')); };
  }
  private send(message: object) { if (this.channel.readyState === 'open') this.channel.send(JSON.stringify(message)); else throw new Error('The other device is no longer connected.'); }
  private update(item: Item, status: string, progress = item.progress) { Object.assign(item, { status, progress }); this.callbacks.item({ ...item }); }
  private deadline() {
    if (!this.incoming) return;
    clearTimeout(this.incoming.timer);
    this.incoming.timer = setTimeout(() => this.cancel(this.incoming?.offer.id || ''), 60_000);
  }
  async offer(file: File) {
    if (this.outgoing) throw new Error('Finish or cancel your current file first.');
    if (file.size > MAX_FILE) throw new Error('This first version supports files up to 50 MB.');
    const item: Item = { id: crypto.randomUUID(), name: safeFilename(file.name), size: file.size, direction: 'out', status: 'Preparing', progress: 0 };
    const outgoing = { file, item, hash: '', cancelled: false, timer: undefined as ReturnType<typeof setTimeout> | undefined };
    this.outgoing = outgoing; this.callbacks.item(item);
    try {
      outgoing.hash = await digest(await file.arrayBuffer());
      if (outgoing.cancelled || this.disposed) return;
      this.send({ type: 'offer', id: item.id, name: item.name, size: file.size, hash: outgoing.hash });
      this.update(item, 'Waiting for acceptance');
      outgoing.timer = setTimeout(() => this.cancel(item.id), 60_000);
    } catch (error) { this.update(item, 'Failed'); this.outgoing = undefined; throw error; }
  }
  accept() {
    if (!this.incoming) return;
    this.incoming.accepted = true; this.callbacks.offer(null);
    this.update(this.incoming.item, 'Receiving'); this.deadline();
    this.send({ type: 'accept', id: this.incoming.offer.id });
  }
  decline() { if (this.incoming) this.cancel(this.incoming.offer.id); }
  cancel(id: string) {
    if (this.channel.readyState === 'open') this.send({ type: 'cancel', id });
    this.clear(id, 'Cancelled');
  }
  private clear(id: string, status: string) {
    if (this.outgoing?.item.id === id) { this.outgoing.cancelled = true; clearTimeout(this.outgoing.timer); this.update(this.outgoing.item, status); this.outgoing = undefined; }
    if (this.incoming?.offer.id === id) { clearTimeout(this.incoming.timer); this.update(this.incoming.item, status); this.incoming = undefined; this.callbacks.offer(null); }
  }
  text(text: string) {
    if (!text.trim() || text.length > MAX_TEXT) throw new Error('Send between 1 and 50,000 characters.');
    if (this.pendingTexts.size >= 10) throw new Error('Wait for your previous notes to arrive.');
    if (this.channel.bufferedAmount > 1024 * 1024) throw new Error('The connection is busy. Try sending your note again in a moment.');
    const item: Item = { id: crypto.randomUUID(), name: 'Note', text, size: new TextEncoder().encode(text).length, direction: 'out', status: 'Sending', progress: 0 };
    this.pendingTexts.set(item.id, item); this.callbacks.item(item);
    try {
      // Small JSON frames stay below WebRTC message limits, even with escaped Unicode.
      this.send({ type: 'text-start', id: item.id, length: text.length });
      for (let offset = 0; offset < text.length; offset += 2000) this.send({ type: 'text-part', id: item.id, text: text.slice(offset, offset + 2000) });
      this.send({ type: 'text-end', id: item.id });
      this.textTimers.set(item.id, setTimeout(() => {
        if (this.pendingTexts.delete(item.id)) this.update(item, 'Delivery unconfirmed');
        this.textTimers.delete(item.id);
      }, 60_000));
    } catch (error) { this.pendingTexts.delete(item.id); this.update(item, 'Failed'); throw error; }
  }
  private async transmit() {
    const out = this.outgoing;
    if (!out) return;
    clearTimeout(out.timer); this.update(out.item, 'Sending');
    try {
      for (let offset = 0; offset < out.file.size; offset += CHUNK) {
        if (out.cancelled || this.disposed) return;
        const started = Date.now();
        while (this.channel.bufferedAmount > 512 * 1024) {
          if (out.cancelled || this.disposed) return;
          if (this.channel.readyState !== 'open' || Date.now() - started > 15_000) throw new Error('Transfer stalled');
          await new Promise(resolve => setTimeout(resolve, 15));
        }
        const bytes = await out.file.slice(offset, offset + CHUNK).arrayBuffer();
        if (out.cancelled || this.disposed) return;
        this.channel.send(bytes);
        const progress = Math.min(99, Math.floor((offset + bytes.byteLength) / out.file.size * 100));
        if (progress !== out.item.progress) this.update(out.item, 'Sending', progress);
      }
      this.send({ type: 'end', id: out.item.id }); this.update(out.item, 'Verifying receipt', 99);
      out.timer = setTimeout(() => this.cancel(out.item.id), 60_000);
    } catch { this.clear(out.item.id, 'Failed'); this.callbacks.error('Transfer interrupted. Reconnect and send the file again.'); }
  }
  private async receive(data: string | ArrayBuffer) {
    if (this.disposed) return;
    if (data instanceof ArrayBuffer) {
      const incoming = this.incoming;
      if (!incoming?.accepted) return;
      if (incoming.finalizing || !data.byteLength || data.byteLength !== Math.min(CHUNK, incoming.offer.size - incoming.received)) { this.cancel(incoming.offer.id); return; }
      incoming.chunks.push(data); incoming.received += data.byteLength; this.deadline();
      const progress = Math.min(99, Math.floor(incoming.received / Math.max(1, incoming.offer.size) * 100));
      if (progress !== incoming.item.progress) this.update(incoming.item, 'Receiving', progress);
      return;
    }
    if (Date.now() - this.controlWindow > 10_000) { this.controlWindow = Date.now(); this.controlCount = 0; }
    if (++this.controlCount > 600 || typeof data !== 'string' || data.length > 32_000) {
      this.callbacks.error('Unexpected message volume or size. Connection closed.'); this.dispose(); this.channel.close(); return;
    }
    let msg;
    try { msg = JSON.parse(data); } catch { return; }
    if (!msg || typeof msg.id !== 'string' || msg.id.length > 64) return;
    if (msg.type === 'offer') {
      if (this.incoming || typeof msg.name !== 'string' || msg.name.length > 240 || !Number.isSafeInteger(msg.size) || msg.size < 0 || msg.size > MAX_FILE || typeof msg.hash !== 'string' || !/^[a-f0-9]{64}$/.test(msg.hash)) { this.send({ type: 'cancel', id: msg.id }); return; }
      if (this.retainedFiles >= 20 || this.retainedBytes + msg.size > 150 * 1024 * 1024) {
        this.send({ type: 'cancel', id: msg.id });
        this.callbacks.error('This room’s download memory limit is reached (20 files or 150 MB). Save your downloads, then create a new room.'); return;
      }
      const offer: Offer = { type: 'offer', id: msg.id, name: safeFilename(msg.name), size: msg.size, hash: msg.hash };
      this.incoming = { offer, item: { id: offer.id, name: offer.name, size: offer.size, direction: 'in', status: 'Awaiting your approval', progress: 0 }, chunks: [], received: 0, accepted: false };
      this.callbacks.item(this.incoming.item); this.callbacks.offer(offer); this.deadline();
    } else if (msg.type === 'accept' && this.outgoing && this.outgoing.item.id === msg.id && this.outgoing.item.status === 'Waiting for acceptance') {
      await this.transmit();
    } else if (msg.type === 'cancel') this.clear(msg.id, 'Cancelled');
    else if (msg.type === 'end' && this.incoming && this.incoming.offer.id === msg.id && this.incoming.accepted) {
      const incoming = this.incoming;
      if (incoming.finalizing) return;
      incoming.finalizing = true;
      clearTimeout(incoming.timer);
      if (incoming.received !== incoming.offer.size) { this.cancel(msg.id); return; }
      this.update(incoming.item, 'Verifying');
      const blob = new Blob(incoming.chunks, { type: 'application/octet-stream' });
      const hash = await digest(await blob.arrayBuffer());
      if (this.incoming !== incoming || this.disposed) return;
      if (hash !== incoming.offer.hash) { this.cancel(msg.id); this.callbacks.error('File integrity check failed. Nothing was saved.'); return; }
      const url = URL.createObjectURL(blob); this.urls.push(url); incoming.item.url = url;
      this.retainedBytes += incoming.offer.size; this.retainedFiles++;
      this.update(incoming.item, 'Received', 100); this.incoming = undefined;
      this.send({ type: 'received', id: msg.id, hash });
    } else if (msg.type === 'received' && this.outgoing && this.outgoing.item.id === msg.id && msg.hash === this.outgoing.hash) {
      clearTimeout(this.outgoing.timer); this.update(this.outgoing.item, 'Delivered', 100); this.outgoing = undefined;
    } else if (msg.type === 'text-start' && Number.isSafeInteger(msg.length) && msg.length > 0 && msg.length <= MAX_TEXT) {
      clearTimeout(this.incomingText?.timer);
      this.incomingText = { id: msg.id, length: msg.length, text: '', timer: setTimeout(() => { this.incomingText = undefined; }, 30_000) };
    } else if (msg.type === 'text-part' && this.incomingText && msg.id === this.incomingText.id && typeof msg.text === 'string') {
      if (msg.text.length > 2000 || this.incomingText.text.length + msg.text.length > this.incomingText.length) {
        clearTimeout(this.incomingText.timer); this.incomingText = undefined; return;
      }
      this.incomingText.text += msg.text;
    } else if (msg.type === 'text-end' && this.incomingText && msg.id === this.incomingText.id) {
      const note = this.incomingText; clearTimeout(note.timer); this.incomingText = undefined;
      if (note.text.length !== note.length) return;
      this.callbacks.item({ id: msg.id, name: 'Note', text: note.text, size: 0, direction: 'in', status: 'Received', progress: 100 });
      this.send({ type: 'text-received', id: msg.id });
    } else if (msg.type === 'text-received') {
      const item = this.pendingTexts.get(msg.id);
      if (item) { this.update(item, 'Delivered', 100); this.pendingTexts.delete(msg.id); clearTimeout(this.textTimers.get(msg.id)); this.textTimers.delete(msg.id); }
    }
  }
  private fail(message: string) { this.callbacks.error(message); if (this.incoming) this.cancel(this.incoming.offer.id); }
  dispose() {
    this.disposed = true;
    if (this.outgoing) this.clear(this.outgoing.item.id, 'Interrupted');
    if (this.incoming) this.clear(this.incoming.offer.id, 'Interrupted');
    for (const item of this.pendingTexts.values()) this.update(item, 'Interrupted');
    for (const timer of this.textTimers.values()) clearTimeout(timer);
    this.textTimers.clear(); clearTimeout(this.incomingText?.timer); this.incomingText = undefined;
    this.pendingTexts.clear(); this.channel.onmessage = null;
  }
  releaseDownloads() { for (const url of this.urls) URL.revokeObjectURL(url); this.urls = []; this.retainedBytes = 0; this.retainedFiles = 0; }
}
