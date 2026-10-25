import {test, expect} from '@playwright/test';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

test('real offline navigation uses the cached error artwork and reconnect restores the requested page', async ({page, context}) => {
  const errors:string[]=[];
  page.on('pageerror', error=>errors.push(error.message));
  await page.setViewportSize({width:390,height:900});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/app');
  await expect(page.getByRole('button',{name:'Create a room',exact:true})).toBeVisible();
  await page.evaluate(async()=>{
    await navigator.serviceWorker.ready;
    if(!navigator.serviceWorker.controller) await new Promise<void>(resolve=>navigator.serviceWorker.addEventListener('controllerchange',()=>resolve(),{once:true}));
  });
  await context.setOffline(true);
  const response=await page.goto('/app?offline-check=1');
  expect(response?.status()).toBe(503);
  await expect(page.locator('body')).toHaveClass('offline');
  await expect(page.locator('h1')).toContainText('left you on read');
  await expect(page.locator('#preview')).toHaveCount(0);
  await expect(page.locator('#sub')).toHaveCSS('opacity','1');
  await page.screenshot({path:join(tmpdir(),'drop-real-offline-mobile.png'),fullPage:true});
  const cached=await page.evaluate(async()=>{
    const names=(await caches.keys()).filter(name=>name.startsWith('drop-error-screen-'));
    return (await Promise.all(names.map(async name=>(await (await caches.open(name)).keys()).map(request=>new URL(request.url).pathname)))).flat();
  });
  expect(cached.sort()).toEqual(['/assets/not-found.js','/favicon.svg','/offline.html']);
  // Retry remains a real offline screen, rather than Chrome's network error.
  const requested=page.url();
  const [retry]=await Promise.all([page.waitForNavigation({waitUntil:'commit'}),page.getByRole('link',{name:'Try again, no cap',exact:true}).click()]);
  expect(retry?.status()).toBe(503);expect(page.url()).toBe(requested);
  await expect(page.locator('h1')).toContainText('left you on read');
  await context.setOffline(false);
  await expect(page.getByRole('button',{name:'Create a room',exact:true})).toBeVisible({timeout:30_000});
  expect(new URL(page.url()).pathname).toBe('/app');
  const missing=await page.goto('/missing-production-check?preview=offline');
  expect(missing?.status()).toBe(404);
  await expect(page.locator('h1')).toContainText("Oops, that page isn't");
  await expect(page.locator('#preview')).toHaveCount(0);
  await expect(page.locator('body')).not.toHaveClass('offline');
  await page.setViewportSize({width:1440,height:1000});
  await expect(page.locator('#sub')).toHaveCSS('opacity','1');
  await page.screenshot({path:join(tmpdir(),'drop-production-404-desktop.png'),fullPage:true});
  expect(errors).toEqual([]);
});
