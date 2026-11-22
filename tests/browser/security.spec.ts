import { test, expect } from '@playwright/test';
import { safeFilename } from '../../src/security';
import { Transfer } from '../../src/transfer';

class Channel {
  readyState = 'open'; bufferedAmount = 0; binaryType = ''; bufferedAmountLowThreshold = 0;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  messages: any[] = [];
  send(value: string) { this.messages.push(JSON.parse(value)); }
  close() { this.readyState = 'closed'; }
  receive(value: unknown) { this.onmessage?.({ data: value }); }
  asRTC() { return this as unknown as RTCDataChannel; }
}

test('all file extensions are preserved while OS-sensitive filenames are normalized', () => {
  for (const name of ['install.EXE','photo.jpg.exe','icon.svg','run.ps1','sheet.xlsm','app.apk','page.html','unknown.xyz','README']) expect(safeFilename(name)).toBe(name);
  expect(safeFilename('../a:b.txt')).toBe('.._a_b.txt');
  expect(safeFilename('CON.txt')).toBe('_CON.txt');
  expect(safeFilename('a'.repeat(220)+'.custom')).toMatch(/\.custom$/);
  expect(safeFilename('photo\u202Egpj.exe')).not.toContain('\u202E');
});

test('program extensions still require explicit recipient acceptance', () => {
  const channel = new Channel(); const offers: any[]=[]; const items: any[]=[];
  const transfer=new Transfer(channel.asRTC(),{item:item=>items.push(item),offer:value=>offers.push(value),error:()=>{}});
  channel.receive(JSON.stringify({type:'offer',id:'program',name:'tool.exe',size:4,hash:'a'.repeat(64)}));
  expect(offers[0].name).toBe('tool.exe');expect(channel.messages).not.toContainEqual({type:'accept',id:'program'});
  channel.receive(new Uint8Array([0x4d,0x5a,0,0]).buffer);
  expect(items.some(item=>item.url)).toBe(false);transfer.decline();
  expect(channel.messages).toContainEqual({type:'cancel',id:'program'});transfer.dispose();
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
