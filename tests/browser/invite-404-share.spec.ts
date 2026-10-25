import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

test('invite focus uses one rounded boundary; room timing is grouped and native sharing is explicit',async({page})=>{
  await page.addInitScript(()=>Object.defineProperty(navigator,'share',{configurable:true,value:async(payload:ShareData)=>{
    const state=window as Window&{sharedInvite?:ShareData;shareMode?:string};state.sharedInvite=payload;
    if(state.shareMode==='cancel')throw new DOMException('Cancelled','AbortError');
    if(state.shareMode==='deny')throw new DOMException('Not allowed','NotAllowedError');
  }}));
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/app');const input=page.getByRole('textbox',{name:'Invite link',exact:true});await input.focus();
  await expect(input).toHaveCSS('outline-style','none');
  expect(await page.locator('.invite-field').evaluate(element=>getComputedStyle(element).boxShadow)).not.toBe('none');
  await page.locator('.join-form').screenshot({path:join(tmpdir(),'drop-invite-focus.png')});
  await page.getByRole('button',{name:'Create a room',exact:true}).click();const invite=page.getByLabel('Room invite',{exact:true});await expect(invite).toBeVisible({timeout:80_000});
  await expect(page.locator('.invite-note')).toContainText('Private invite · 10 minutes');
  await expect(page.locator('.room-session')).toContainText('Room ends');await expect(page.locator('.room-session')).toContainText('2-hour limit');
  await page.getByRole('button',{name:'Share invite',exact:true}).click();
  expect(await page.evaluate(()=>(window as Window&{sharedInvite?:ShareData}).sharedInvite?.url)).toBe(await invite.inputValue());
  await page.evaluate(()=>{(window as Window&{shareMode?:string}).shareMode='cancel';});await page.getByRole('button',{name:'Share invite',exact:true}).click();await expect(page.getByRole('alert')).toHaveCount(0);
  await page.evaluate(()=>{(window as Window&{shareMode?:string}).shareMode='deny';});await page.getByRole('button',{name:'Share invite',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Use Copy invite link');await page.getByRole('button',{name:'Dismiss message'}).click();
  await page.locator('.connection').screenshot({path:join(tmpdir(),'drop-room-details.png')});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'End room',exact:true}).click();
});

test('supplied 404 preserves CSS, copy and interactions with only the logo/integration substitutions',async({page,browser})=>{
  const reference=readFileSync('design/user-404.html','utf8');
  const built=readFileSync('public/404.html','utf8');
  const logo=readFileSync('public/drop-mark.svg','utf8').replace('<svg ','<svg aria-hidden="true" ');
  const expected=reference.replace(/(<a class="logo"[\s\S]*?)<svg[\s\S]*?<\/svg>/,(_,prefix)=>prefix+logo).replace(/<script>[\s\S]*?<\/script>/,'<script src="/assets/not-found.js"></script>');
  expect(built.match(/<body>[\s\S]*<\/body>/)?.[0]).toBe(expected.match(/<body>[\s\S]*<\/body>/)?.[0]);
  expect(built.match(/<style>[\s\S]*?<\/style>/)?.[0]).toBe(reference.match(/<style>[\s\S]*?<\/style>/)?.[0]);
  expect(readFileSync('public/assets/not-found.js','utf8')).toBe(reference.match(/<script>([\s\S]*?)<\/script>/)?.[1]);
  const original=await browser.newPage({viewport:{width:390,height:900},reducedMotion:'reduce'});await original.setContent(reference);await expect(original.locator('#sub')).toHaveCSS('opacity','1');await original.evaluate(()=>document.querySelectorAll('svg').forEach(svg=>svg.pauseAnimations()));await original.screenshot({path:join(tmpdir(),'drop-404-reference.png'),fullPage:true});await original.close();
  await page.setViewportSize({width:390,height:900});await page.emulateMedia({reducedMotion:'reduce'});
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));const response=await page.goto('/a-missing-drop-page');expect(response?.status()).toBe(404);
  await expect(page.locator('h1')).toContainText("Oops, that page isn't");await expect(page.locator('.logo svg')).toHaveAttribute('viewBox','0 0 120 144');
  await expect(page.locator('#sub')).toHaveCSS('opacity','1');await page.evaluate(()=>document.querySelectorAll('svg').forEach(svg=>svg.pauseAnimations()));await page.screenshot({path:join(tmpdir(),'drop-404-updated.png'),fullPage:true});
  const before=await page.locator('#sub').innerText();await page.locator('#card').click();await expect(page.locator('#sub')).not.toHaveText(before);
  await page.getByRole('button',{name:'Offline mode',exact:true}).click();await expect(page.locator('body')).toHaveClass('offline');await expect(page.locator('h1')).toContainText('left you on read');
  await page.getByRole('button',{name:'Online 404',exact:true}).click();await expect(page.locator('body')).not.toHaveClass('offline');
  await page.getByRole('link',{name:'Return home',exact:true}).click();await expect(page.locator('#hero-title')).toBeVisible();expect(errors).toEqual([]);
});
