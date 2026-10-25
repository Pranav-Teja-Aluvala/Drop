import { test, expect, type Page } from '@playwright/test';

async function requestPair(host: Page, guest: Page) {
  await host.goto('/app');
  await host.getByRole('button', {name:'Create a room',exact:true}).click();
  const invite=host.getByRole('textbox',{name:'Room invite'});await expect(invite).toBeVisible();
  await expect(host.getByRole('heading',{level:1})).toHaveText('Your room is ready.');
  await expect(host.locator('[aria-current="step"]')).toContainText('Find device');
  await guest.goto(await invite.inputValue());
  await guest.getByRole('button',{name:'Join',exact:true}).click();
  await expect(guest.getByRole('heading',{level:1})).toHaveText('Waiting for approval.');
  await expect(host.getByRole('heading',{level:1})).toHaveText('Your device has arrived.');
  await host.getByRole('button',{name:'Allow device',exact:true}).click();
}

test('unavailable service shows a useful recovery screen instead of a JSON parser exception', async({page})=>{
  await page.route('**/api/rooms',route=>route.fulfill({status:503,contentType:'text/html',body:'<h1>Starting service</h1>'}));
  await page.goto('/app');await page.getByRole('button',{name:'Create a room',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('waking up or temporarily unavailable');
  await expect(page.getByRole('heading',{level:1})).toHaveText('Let’s reconnect.');
  await expect(page.getByRole('button',{name:'Create a room',exact:true})).toBeVisible();
  await expect(page.getByText('Unexpected token')).toHaveCount(0);
});

test('mobile document and media pickers are separate; approval and verification stages reflect real events',async({browser})=>{
  const a=await browser.newContext();const b=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const host=await a.newPage();const guest=await b.newPage();
  await guest.addInitScript(()=>{const Peer=window.RTCPeerConnection;window.RTCPeerConnection=class extends Peer{constructor(config?:RTCConfiguration){super(config);(window as Window & {testPeer?:RTCPeerConnection}).testPeer=this;}};});
  try{
    await requestPair(host,guest);
    await expect(host.getByRole('heading',{level:1})).toHaveText('Check both screens.');
    await expect(guest.getByLabel('Device verification code')).toHaveText(await host.getByLabel('Device verification code').innerText());
    // A transient network-state change must restore code verification, never bypass it.
    await guest.evaluate(()=>{const pc=(window as Window & {testPeer?:RTCPeerConnection}).testPeer!;Object.defineProperty(pc,'connectionState',{configurable:true,value:'disconnected'});pc.dispatchEvent(new Event('connectionstatechange'));});
    await expect(guest.getByRole('heading',{level:1})).toHaveText('Restoring your connection.');
    await expect(guest.locator('.document-picker')).toBeDisabled();
    await guest.evaluate(()=>{const pc=(window as Window & {testPeer?:RTCPeerConnection}).testPeer!;delete (pc as unknown as {connectionState?:string}).connectionState;pc.dispatchEvent(new Event('connectionstatechange'));});
    await expect(guest.getByRole('heading',{level:1})).toHaveText('Check both screens.');
    await host.getByRole('button',{name:'Codes match',exact:true}).click();
    await expect(host.locator('.phase-description')).toContainText('Waiting for the other device');
    await expect(host.locator('.document-picker')).toBeDisabled();
    await guest.getByRole('button',{name:'Codes match',exact:true}).click();
    await expect(guest.getByRole('button',{name:'Browse files',exact:true})).toBeEnabled();
    await expect(guest.getByLabel('Choose file to send',{exact:true})).toHaveAttribute('accept',/application\/\*/);
    await expect(guest.getByLabel('Choose file to send',{exact:true})).not.toHaveAttribute('capture',/.*/);
    await expect(guest.getByLabel('Choose photo or video to send')).toHaveAttribute('accept','image/*,video/*');
    const chooserPromise=guest.waitForEvent('filechooser');await guest.getByRole('button',{name:'Browse files',exact:true}).click();
    await (await chooserPromise).setFiles({name:'notes.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\nsynthetic picker test\n%%EOF')});
    await expect(host.getByLabel('Incoming file')).toContainText('notes.pdf');
    await expect(guest.locator('.connected-state h3')).toHaveText('Waiting for acceptance');
    await host.getByRole('button',{name:'Accept file',exact:true}).click();
    await expect(guest.locator('.transfer-row').filter({hasText:'notes.pdf'})).toContainText('Delivered');
    expect(await guest.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
    await guest.screenshot({path:'C:/Users/prana/AppData/Local/Temp/drop-mobile-pickers.png'});
    const mediaPromise=guest.waitForEvent('filechooser');await guest.getByRole('button',{name:'Photos & videos',exact:true}).click();
    await (await mediaPromise).setFiles({name:'photo.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jSWkAAAAASUVORK5CYII=','base64')});
    await expect(host.getByLabel('Incoming file')).toContainText('photo.png');
    await host.getByRole('button',{name:'Decline file',exact:true}).click();
    await expect(guest.locator('.transfer-row').filter({hasText:'photo.png'})).toContainText('Cancelled');
    await guest.getByRole('button',{name:'End room',exact:true}).click();
  }finally{await a.close();await b.close();}
});

test('blocked direct routes show network-stage detail and a fresh-room recovery action',async({browser})=>{
  const a=await browser.newContext();const b=await browser.newContext();
  const host=await a.newPage();const guest=await b.newPage();
  // Simulate networks that cannot establish a direct route. There is no relay in this local test.
  await host.addInitScript(()=>{const Peer=window.RTCPeerConnection;window.RTCPeerConnection=class extends Peer{constructor(config?:RTCConfiguration){super({...config,iceTransportPolicy:'relay'});}};});
  await guest.addInitScript(()=>{const Peer=window.RTCPeerConnection;window.RTCPeerConnection=class extends Peer{constructor(config?:RTCConfiguration){super({...config,iceTransportPolicy:'relay'});}};});
  await host.clock.install();
  try{
    await requestPair(host,guest);
    await expect(host.getByRole('heading',{level:1})).toHaveText('Finding your connection.');
    await expect(host.locator('.route-capability')).toHaveText('Direct route only · relay not enabled');
    await host.screenshot({path:'C:/Users/prana/AppData/Local/Temp/drop-network-progress.png'});
    await host.clock.fastForward(46_000);
    await expect(host.getByRole('alert')).toContainText('no TURN relay enabled');
    await expect(host.getByRole('heading',{level:1})).toHaveText('Let’s reconnect.');
    await expect(host.getByRole('button',{name:'Create a room',exact:true})).toBeVisible();
    await expect(host.locator('.document-picker')).toBeDisabled();
  }finally{await a.close();await b.close();}
});

test('an async error from an old peer cannot close a newly created room',async({browser})=>{
  const a=await browser.newContext();const b=await browser.newContext();const host=await a.newPage();const guest=await b.newPage();
  await host.addInitScript(()=>{
    const Peer=window.RTCPeerConnection;
    window.RTCPeerConnection=class extends Peer{
      async setLocalDescription(description?:RTCLocalSessionDescriptionInit){
        if(description?.type==='offer') await new Promise<void>((_,reject)=>{(window as Window & {rejectOldOffer?:()=>void}).rejectOldOffer=()=>reject(new Error('Old peer closed'));});
        return super.setLocalDescription(description);
      }
    };
  });
  try{
    await requestPair(host,guest);
    await expect.poll(()=>host.evaluate(()=>typeof (window as Window & {rejectOldOffer?:()=>void}).rejectOldOffer)).toBe('function');
    await host.getByRole('button',{name:'End room',exact:true}).click();
    await host.getByRole('button',{name:'Create a room',exact:true}).click();
    await expect(host.getByRole('textbox',{name:'Room invite'})).toBeVisible();
    await host.evaluate(async()=>{(window as Window & {rejectOldOffer?:()=>void}).rejectOldOffer!();await new Promise(resolve=>setTimeout(resolve,0));});
    await expect(host.getByRole('heading',{level:1})).toHaveText('Your room is ready.');
    await expect(host.getByRole('textbox',{name:'Room invite'})).toBeVisible();
    await host.getByRole('button',{name:'End room',exact:true}).click();
  }finally{await a.close();await b.close();}
});
