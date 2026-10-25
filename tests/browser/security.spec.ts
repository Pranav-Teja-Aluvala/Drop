import { test, expect } from '@playwright/test';
import { connectionCode, VerificationGate, fileRisk, safeFilename, executableHeader } from '../../src/security';
import { Transfer } from '../../src/transfer';

const sdp = (byte: string) => `v=0\r\na=fingerprint:sha-256 ${Array(32).fill(byte).join(':')}\r\n`;
class Channel {
  readyState = 'open'; bufferedAmount = 0; binaryType = ''; bufferedAmountLowThreshold = 0;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  messages: any[] = [];
  send(value: string) { this.messages.push(JSON.parse(value)); }
  close() { this.readyState = 'closed'; }
  receive(value: unknown) { this.onmessage?.({ data: value }); }
  asRTC() { return this as unknown as RTCDataChannel; }
}

test('certificate comparison is symmetric, changes with either fingerprint, and fails closed', async () => {
  const room = 'R'.repeat(43);
  const code = await connectionCode(sdp('AA'), sdp('BB'), room);
  expect(code).toMatch(/^[A-F0-9]{4}( [A-F0-9]{4}){7}$/);
  expect(await connectionCode(sdp('BB'), sdp('AA'), room)).toBe(code);
  expect(await connectionCode(sdp('AA'), sdp('CC'), room)).not.toBe(code);
  expect(await connectionCode(sdp('AA'), sdp('BB'), 'S'.repeat(43))).not.toBe(code);
  await expect(connectionCode('v=0', sdp('BB'), room)).rejects.toThrow();
  await expect(connectionCode(sdp('AA'), sdp('AA'), room)).rejects.toThrow();
  await expect(connectionCode(sdp('AA'), sdp('BB'), '')).rejects.toThrow();
});

test('verification gate needs both confirmations and rejects pre-verification data or mismatches', () => {
  for (const payload of [JSON.stringify({type:'offer',id:'x'}), JSON.stringify({type:'verify',code:'WRONG'}), new ArrayBuffer(4)]) {
    const channel = new Channel(); let ready = false, reason = '';
    const gate = new VerificationGate(channel.asRTC(), 'ABCD', () => { ready = true; }, value => { reason = value; });
    channel.receive(payload); gate.confirm();
    expect(ready).toBe(false); expect(reason).not.toBe(''); expect(channel.messages).toEqual([]);
  }
  const channel = new Channel(); let ready = false;
  const gate = new VerificationGate(channel.asRTC(), 'ABCD', () => { ready = true; }, () => {});
  gate.confirm(); expect(ready).toBe(false);
  channel.receive(JSON.stringify({ type: 'verify', code: 'ABCD' }));
  expect(ready).toBe(true);
});

test('common dangerous names and binary signatures are blocked; ordinary files remain allowed', () => {
  for (const name of ['install.EXE', 'photo.jpg.exe', 'icon.svg', 'run.ps1', 'sheet.xlsm', 'x\u202Egpj.exe', 'CON.txt', 'setup.exe. ']) expect(fileRisk(name)).not.toBeNull();
  for (const name of ['photo.jpg', 'document.pdf', 'archive.zip', 'notes.txt', 'page.html', 'index.htm', 'PAGE.HTML']) expect(fileRisk(name)).toBeNull();
  expect(safeFilename('../a:b.txt')).toBe('.._a_b.txt');
  expect(executableHeader(new Uint8Array([0x4d,0x5a,0,0]))).toBe(true);
  expect(executableHeader(new Uint8Array([0x7f,0x45,0x4c,0x46]))).toBe(true);
  expect(executableHeader(new Uint8Array([0xff,0xd8,0xff,0xe0]))).toBe(false);
});

test('receiver rejects dangerous offers even if sender bypasses its UI checks', () => {
  const channel = new Channel(); const errors: string[] = []; const offers: unknown[] = [];
  const transfer = new Transfer(channel.asRTC(), { item: () => {}, offer: value => offers.push(value), error: value => errors.push(value) });
  channel.receive(JSON.stringify({ type:'offer', id:'attack', name:'run.exe', size:4, hash:'a'.repeat(64) }));
  expect(channel.messages).toContainEqual({type:'cancel',id:'attack'});
  expect(errors[0]).toContain('blocked'); expect(offers).toEqual([]); transfer.dispose();
});

test('receiver blocks a disguised executable after bytes arrive', async () => {
  const channel = new Channel(); const items: any[] = []; const errors: string[] = [];
  const transfer = new Transfer(channel.asRTC(), { item: item => items.push(item), offer: () => {}, error: value => errors.push(value) });
  channel.receive(JSON.stringify({type:'offer',id:'disguised',name:'photo.jpg',size:4,hash:'a'.repeat(64)}));
  transfer.accept();
  channel.receive(new Uint8Array([0x4d,0x5a,0,0]).buffer);
  channel.receive(JSON.stringify({type:'end',id:'disguised'}));
  await expect.poll(() => errors.length).toBe(1);
  expect(items.some(item => item.url)).toBe(false); transfer.dispose();
});

test('zero-byte and undersized chunks cannot inflate receiver object memory', () => {
  for (const chunk of [new ArrayBuffer(0), new ArrayBuffer(1)]) {
    const channel = new Channel();
    const transfer = new Transfer(channel.asRTC(), { item: () => {}, offer: () => {}, error: () => {} });
    channel.receive(JSON.stringify({type:'offer',id:'fragment',name:'data.bin',size:32768,hash:'a'.repeat(64)}));
    transfer.accept(); channel.receive(chunk);
    expect(channel.messages).toContainEqual({type:'cancel',id:'fragment'});
    transfer.dispose();
  }
});

test('filename normalization cannot turn an allowed name into an executable download', () => {
  const channel = new Channel(); const offers: unknown[] = [];
  const transfer = new Transfer(channel.asRTC(), {item:()=>{},offer:value=>offers.push(value),error:()=>{}});
  const name = 'a'.repeat(176) + '.exe.txt';
  expect(fileRisk(name)).toBeNull();
  expect(safeFilename(name)).toMatch(/\.exe$/);
  channel.receive(JSON.stringify({type:'offer',id:'truncated',name,size:1,hash:'a'.repeat(64)}));
  expect(channel.messages).toContainEqual({type:'cancel',id:'truncated'});
  expect(offers).toEqual([]); transfer.dispose();
});

test('altered file bytes fail integrity verification and create no download', async () => {
  const channel = new Channel(); const items: any[] = []; const errors: string[] = [];
  const transfer = new Transfer(channel.asRTC(), {item:item=>items.push(item),offer:()=>{},error:value=>errors.push(value)});
  channel.receive(JSON.stringify({type:'offer',id:'tampered',name:'data.txt',size:4,hash:'a'.repeat(64)}));
  transfer.accept(); channel.receive(new Uint8Array([1,2,3,4]).buffer);
  channel.receive(JSON.stringify({type:'end',id:'tampered'}));
  await expect.poll(()=>errors.length).toBe(1);
  expect(errors[0]).toContain('integrity check failed');
  expect(items.some(item=>item.url)).toBe(false); transfer.dispose();
});
