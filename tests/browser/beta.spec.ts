import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdtemp, writeFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MAX_FILE } from '../../src/transfer';

test('beta: exact file cap, oversize rejection, disconnect and new-room recovery', async ({ browser }) => {
  test.setTimeout(90_000);
  const temp = await mkdtemp(join(tmpdir(), 'drop-beta-'));
  const oversizedPath = join(temp, 'too-large.bin');
  const limitPath = join(temp, 'at-limit.bin');
  const a = await browser.newContext(); const b = await browser.newContext();
  const host = await a.newPage(); const guest = await b.newPage();
  const errors: string[] = [];
  for (const page of [host, guest]) page.on('pageerror', error => errors.push(error.message));
  try {
    await host.goto('/app');
    await host.getByRole('button', {name:'Create a room',exact:true}).click();
    const invite = host.getByRole('textbox', {name:'Room invite'});
    await expect(invite).toBeVisible();
    const oldInvite = await invite.inputValue();
    await guest.goto(oldInvite);
    await guest.getByRole('button', {name:'Join',exact:true}).click();
    await host.getByRole('button', {name:'Allow device',exact:true}).click();
    await expect(guest.getByLabel('Device verification code')).toHaveText(await host.getByLabel('Device verification code').innerText());
    await host.getByRole('button', {name:'Codes match',exact:true}).click();
    await guest.getByRole('button', {name:'Codes match',exact:true}).click();
    await expect(host.getByText('You’re connected.',{exact:true})).toBeVisible();
    // Synthetic bytes: no personal files are involved.
    await writeFile(oversizedPath, Buffer.alloc(MAX_FILE+1,7));
    await host.getByLabel('Choose file to send').setInputFiles(oversizedPath);
    await expect(host.getByRole('alert')).toContainText('up to 50 MB');
    await expect(guest.getByRole('button',{name:'Accept file',exact:true})).toHaveCount(0);
    await host.getByRole('button',{name:'Dismiss message'}).click();
    const payload=Buffer.alloc(MAX_FILE,7);
    await writeFile(limitPath, payload);
    await host.getByLabel('Choose file to send').setInputFiles(limitPath);
    await guest.getByRole('button',{name:'Accept file',exact:true}).click();
    await expect(host.locator('.transfer-row').filter({hasText:'at-limit.bin'})).toContainText('Delivered',{timeout:45_000});
    const downloadPromise=guest.waitForEvent('download');
    await guest.getByRole('link',{name:'Save file'}).click();
    const download=await downloadPromise;
    const stream=await download.createReadStream(); const hash=createHash('sha256'); let length=0;
    for await(const chunk of stream!){hash.update(chunk);length+=chunk.length;}
    expect(length).toBe(MAX_FILE);
    expect(hash.digest('hex')).toBe(createHash('sha256').update(payload).digest('hex'));
    await expect(host.getByLabel('Files sent',{exact:true})).toHaveText('1');
    // Losing a peer during an unaccepted offer must never report delivery.
    await host.getByLabel('Choose file to send').setInputFiles({name:'interrupted.txt',mimeType:'text/plain',buffer:Buffer.from('not accepted')});
    await expect(guest.getByRole('button',{name:'Accept file',exact:true})).toBeVisible();
    await guest.close();
    await expect(host.getByRole('button',{name:'Create a room',exact:true})).toBeVisible({timeout:45_000});
    await expect(host.locator('.transfer-row').filter({hasText:'interrupted.txt'})).toContainText('Interrupted');
    await host.getByRole('button',{name:'Create a room',exact:true}).click();
    await expect(invite).toBeVisible();
    expect(await invite.inputValue()).not.toBe(oldInvite);
    await expect(host.locator('.history')).toHaveCount(0);
    await host.getByRole('button',{name:'End room',exact:true}).click();
    expect(errors).toEqual([]);
  } finally {
    await a.close();await b.close();
    for (const path of [oversizedPath,limitPath]) await unlink(path).catch(()=>{});
    await rmdir(temp);
  }
});
