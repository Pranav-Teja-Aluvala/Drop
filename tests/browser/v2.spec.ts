import {readFile} from 'node:fs/promises';
import {test,expect,type Page} from '@playwright/test';import {tmpdir} from 'node:os';import {join} from 'node:path';
async function create(host:Page){await host.goto('/app');await host.getByRole('button',{name:'Create a room',exact:true}).click();const link=host.getByLabel('Room invite',{exact:true});await expect(link).toBeVisible({timeout:80000});return link.inputValue();}
async function admit(host:Page,guest:Page,invite:string){await guest.goto(invite);await expect(guest.getByRole('heading',{name:'One check, then you’re in.'})).toBeVisible();await expect(guest.getByLabel('Room name')).toHaveText(await host.locator('#connection-title').innerText());await host.getByRole('button',{name:'Allow device',exact:true}).click();await expect(guest.getByRole('button',{name:'Browse files',exact:true})).toBeEnabled();await expect(host.getByRole('button',{name:'Browse files',exact:true})).toBeEnabled();}
async function note(page:Page,text:string){await page.getByRole('tab',{name:/Chat/}).click();await page.getByRole('textbox',{name:'Text & links',exact:true}).fill(text);await page.getByRole('button',{name:'Send message',exact:true}).click();}

test('three devices share with one admission per device, private recipient selection and unchanged HTML bytes',async({browser})=>{
 const contexts=await Promise.all([browser.newContext(),browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),browser.newContext()]);const [host,phone,third]=await Promise.all(contexts.map(c=>c.newPage()));try{
 const invite=await create(host);await admit(host,phone,invite);await admit(host,third,invite);await expect(host.getByLabel('Room devices').locator('li')).toHaveCount(3);await expect(host.getByRole('button',{name:/Choose Device/})).toHaveCount(2);await phone.screenshot({path:join(tmpdir(),'drop-v2-phone-connected.png'),fullPage:true});await host.screenshot({path:join(tmpdir(),'drop-room-desktop.png'),fullPage:true});await host.getByRole('button',{name:'Choose Device 2',exact:true}).click();
 await note(host,'Only the phone should receive this');await phone.getByRole('tab',{name:/Chat/}).click();await expect(phone.locator('.message-text')).toContainText('Only the phone');await expect(third.locator('.message-text')).toHaveCount(0);
 const file={name:'unchanged.html',mimeType:'text/html',buffer:Buffer.from('<script>throw new Error("must never execute")</script>original bytes')};await host.getByLabel('Choose file to send',{exact:true}).setInputFiles(file);await expect(phone.getByLabel('Incoming file',{exact:true})).toContainText(file.name);await expect(third.getByLabel('Incoming file',{exact:true})).toHaveCount(0);await phone.getByRole('button',{name:'Accept file',exact:true}).click();await phone.getByRole('tab',{name:/Files/}).click();const save=phone.getByRole('link',{name:'Save file',exact:true});await expect(save).toBeVisible();const downloading=phone.waitForEvent('download');await save.click();const download=await downloading;expect(download.suggestedFilename()).toBe(file.name);expect(await readFile((await download.path())!)).toEqual(file.buffer);
 await third.getByRole('button',{name:'Choose Device 2',exact:true}).click();await note(third,'Third to phone');await phone.getByRole('tab',{name:/Chat/}).click();await expect(phone.locator('.message-text').last()).toHaveText('Third to phone');
 const extra=await browser.newPage();await extra.goto(invite);await expect(extra.getByRole('alert')).toContainText('unavailable, expired or full');await extra.close();
 await host.getByRole('button',{name:'End room',exact:true}).click();await expect(phone.getByRole('heading',{level:1})).toHaveText('Let’s reconnect.');
 }finally{await Promise.all(contexts.map(c=>c.close()));}
});

test('approved mobile returns from a dropped socket without scanning or another approval',async({browser})=>{
 const a=await browser.newContext(),b=await browser.newContext();const host=await a.newPage(),guest=await b.newPage();await guest.addInitScript(()=>{const Native=WebSocket;window.WebSocket=class extends Native{constructor(url:string|URL,protocols?:string|string[]){super(url,protocols);(window as Window&{testSocket?:WebSocket}).testSocket=this;}};});
 try{await admit(host,guest,await create(host));await guest.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));});await expect(host.getByLabel('Background time remaining')).toBeVisible();await guest.evaluate(()=>(window as Window&{testSocket?:WebSocket}).testSocket?.close());await guest.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'));});await expect(guest.getByRole('button',{name:'Browse files',exact:true})).toBeEnabled({timeout:20000});await expect(host.getByRole('button',{name:'Allow device',exact:true})).toHaveCount(0);await guest.setViewportSize({width:844,height:390});
 await guest.getByRole('link',{name:'Chat',exact:true}).click();
 await guest.reload();
 await expect(guest.getByRole('button',{name:'Browse files',exact:true})).toBeEnabled({timeout:20000});
 expect(await guest.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await host.reload();
 await expect(host.getByRole('button',{name:'Browse files',exact:true})).toBeEnabled({timeout:20000});
 await expect(host.getByLabel('Room invite',{exact:true})).toHaveValue(/#.+/);
 await note(guest,'I came back without scanning');await host.getByRole('tab',{name:/Chat/}).click();await expect(host.locator('.message-text')).toContainText('came back');await host.getByRole('button',{name:'End room',exact:true}).click();}finally{await a.close();await b.close();}
});

test('v2 landing, legal pages and error states render at mobile widths without overflow or personal-detail duplication',async({page})=>{
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:950});await page.emulateMedia({reducedMotion:'reduce'});for(const route of ['/','/app','/privacy.html','/terms.html','/cookies.html','/room-expired.html','/connection-help.html','/unknown-v2-page']){const response=await page.goto(route);expect(response?.status()).toBe(route.includes('unknown')?404:200);await expect(page.locator('h1')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),route+' '+width).toBe(false);expect(await page.locator('body').innerText()).not.toMatch(/Pranav|pranavteja\.dev@gmail\.com/);await expect(page.locator('#preview')).toHaveCount(0);if(route==='/'&&(width===390||width===1440))await page.screenshot({path:join(tmpdir(),`drop-v2-${width}.png`),fullPage:true});}}
});

test('eight-minute app switch keeps approval; ten-minute expiry closes the room',async({browser})=>{
 const a=await browser.newContext(),b=await browser.newContext();const host=await a.newPage(),guest=await b.newPage();try{
 await admit(host,guest,await create(host));await guest.clock.install();await guest.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));});const eight=await guest.evaluate(()=>Date.now()+8*60000);await guest.clock.setSystemTime(eight);await guest.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'));});await expect(guest.getByRole('button',{name:'Browse files',exact:true})).toBeEnabled();await expect(host.getByRole('button',{name:'Allow device',exact:true})).toHaveCount(0);
 await host.clock.install();await host.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));});const later=await host.evaluate(()=>Date.now()+11*60000);await host.clock.setSystemTime(later);await host.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'));});await expect(host.getByRole('alert')).toContainText('10 minutes');await expect(guest.getByRole('alert')).toContainText('owner ended');
 }finally{await a.close();await b.close();}
});

test('landing mouse field responds without moving controls; reduced motion and mobile navigation work',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');const canvas=page.locator('.ribbon-field');const first=await canvas.evaluate(el=>(el as HTMLCanvasElement).toDataURL());const cta=page.getByRole('link',{name:'Start sharing',exact:true}).first();const before=await cta.boundingBox();await page.mouse.move(150,160);await expect.poll(()=>canvas.evaluate(el=>(el as HTMLCanvasElement).toDataURL())).not.toBe(first);expect(await cta.boundingBox()).toEqual(before);
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();const still=await canvas.evaluate(el=>(el as HTMLCanvasElement).toDataURL());await page.mouse.move(1000,550);await page.waitForTimeout(150);expect(await canvas.evaluate(el=>(el as HTMLCanvasElement).toDataURL())).toBe(still);
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Open menu',exact:true}).click();await expect(page.getByRole('navigation',{name:'Primary'})).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('navigation',{name:'Primary'})).toBeHidden();await expect(page.getByRole('link',{name:'See how it works'})).toHaveCSS('min-height','48px');await page.getByRole('link',{name:'See how it works'}).click();await expect(page.locator('#how')).toBeInViewport();expect(errors).toEqual([]);
});

test('mobile chat has compact metadata, scrolls independently and keeps its layout when a peer leaves', async ({browser}) => {
  const owner = await browser.newContext();
  const mobile = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const host = await owner.newPage(), phone = await mobile.newPage();
  try {
    await admit(host, phone, await create(host));
    for(let index=0; index<10; index++) await note(host, 'Message '+index+' '+ 'A useful note. '.repeat(18));
    await phone.getByRole('tab',{name:/Chat/}).click();
    await expect(phone.locator('.chat-message')).toHaveCount(10);
    await expect(phone.locator('.chat-meta').first()).toHaveCSS('font-size','11px');
    await expect(phone.getByRole('button',{name:'Copy message'}).first()).toHaveCSS('width','44px');
    const feed=phone.getByLabel('Conversation');
    await feed.evaluate(el=>{el.scrollTop=0});
    expect(await feed.evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true);
    await phone.screenshot({path:join(tmpdir(),'drop-room-chat-mobile.png'),fullPage:true});
    await phone.setViewportSize({width:844,height:390});
    expect(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await host.close();
    await expect(phone.locator('main.connected-layout')).toBeVisible();
    await expect(phone.locator('.room-activity')).toHaveCSS('width',/px/);
    expect(await phone.locator('.room-activity').evaluate(el=>el.getBoundingClientRect().width>innerWidth*.8)).toBe(true);
  } finally {
    await owner.close();
    await mobile.close();
  }
});

test('mobile creation shows invitation first; connected invite drawer opens and closes accessibly', async ({browser}) => {
  const owner = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const other = await browser.newContext();
  const host=await owner.newPage(), guest=await other.newPage();
  try {
    const invite=await create(host);
    await expect(host.getByLabel('Room invite',{exact:true})).toBeVisible();
    await expect(host.getByRole('button',{name:'Browse files',exact:true})).toBeHidden();
    await host.screenshot({path:join(tmpdir(),'drop-qr-first-mobile.png'),fullPage:true});
    await admit(host,guest,invite);
    const more=host.getByRole('button',{name:'Connect more',exact:true});
    await expect(more).toHaveAttribute('aria-expanded','false');
    await expect(host.getByRole('button',{name:'Reconnect devices',exact:true})).toHaveCount(0);
    await expect(host.getByLabel('Files in this room')).toHaveCount(0);
    await more.click();
    await expect(host.locator('#room-invitation')).toHaveAttribute('aria-hidden','false');
    await expect.poll(()=>host.locator('#room-invitation').evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThan(150);
    await expect(host.getByLabel('Room invite',{exact:true})).toBeVisible();
    expect(await host.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await host.screenshot({path:join(tmpdir(),'drop-invite-drawer-mobile.png'),fullPage:true});
    await host.getByRole('button',{name:'Close invitation',exact:true}).click();
    await expect(more).toBeFocused();
    await expect(more).toHaveAttribute('aria-expanded','false');
    await more.click();
    await host.getByRole('button',{name:'Close invitation',exact:true}).press('Escape');
    await expect(more).toHaveAttribute('aria-expanded','false');
    await host.getByRole('button',{name:'End room',exact:true}).click();
  } finally {await owner.close();await other.close();}
});

test('code joining retains approval and automatic acceptance is opt-in and reversible',async({browser})=>{
 const owner=await browser.newContext(),other=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const host=await owner.newPage(),guest=await other.newPage();
 try{
   await create(host);
   const code=await host.getByLabel('Room join code',{exact:true}).innerText();
   expect(code).toMatch(/^\d{5}$/);
   await guest.goto('/app');
   await guest.getByRole('textbox',{name:'Room code or invite link',exact:true}).fill(code);
   await guest.getByRole('button',{name:'Join',exact:true}).click();
   await expect(guest.getByRole('heading',{name:'One check, then you’re in.'})).toBeVisible();
   await expect(guest.getByRole('button',{name:'Browse files',exact:true})).toBeHidden();
   await host.getByRole('button',{name:'Allow device',exact:true}).click();
   await expect(guest.getByRole('button',{name:'Browse files',exact:true})).toBeEnabled();
   const auto=guest.getByRole('checkbox',{name:/Accept all incoming files/});
   await expect(auto).not.toBeChecked();
   const first={name:'first.html',mimeType:'text/html',buffer:Buffer.from('<script>throw Error("must not execute")</script>hello')};
   await host.getByLabel('Choose file to send',{exact:true}).setInputFiles(first);
   await expect(guest.getByLabel('Incoming file',{exact:true})).toBeVisible();
   await auto.check();
   await expect(guest.getByLabel('Incoming file',{exact:true})).toHaveCount(0);
   const save=guest.getByRole('link',{name:'Save file',exact:true});
   await expect(save).toBeVisible();
   const pending=guest.waitForEvent('download');await save.click();
   const download=await pending;
   expect(await readFile((await download.path())!)).toEqual(first.buffer);
   await expect(host.getByRole('button',{name:'Browse files',exact:true})).toBeEnabled();
   await host.getByLabel('Choose file to send',{exact:true}).setInputFiles({name:'second.txt',mimeType:'text/plain',buffer:Buffer.from('automatic')});
   await expect(guest.getByRole('link',{name:'Save file',exact:true})).toHaveCount(2);
   await auto.uncheck();
   await expect(host.getByRole('button',{name:'Browse files',exact:true})).toBeEnabled();
   await host.getByLabel('Choose file to send',{exact:true}).setInputFiles({name:'third.txt',mimeType:'text/plain',buffer:Buffer.from('ask again')});
   await expect(guest.getByLabel('Incoming file',{exact:true})).toBeVisible();
   await guest.getByRole('button',{name:'Decline file',exact:true}).click();
   await guest.reload();
   await expect(guest.getByRole('checkbox',{name:/Accept all incoming files/})).not.toBeChecked({timeout:20000});
 }finally{await owner.close();await other.close();}
});
