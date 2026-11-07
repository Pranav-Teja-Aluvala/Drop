import {test,expect} from '@playwright/test';
test('email appears only on Contact; legal pages point there and copy feedback handles denial',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/contact.html');await expect(page.getByRole('heading',{level:1})).toHaveText('Contact Drop');
  const address=await page.locator('#support-address').innerText();
  expect(address).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  await expect(page.locator('#support-address')).toHaveAttribute('href','mailto:'+address);
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(value:string)=>{(window as Window&{contactCopied?:string}).contactCopied=value;}}}));
  await page.getByRole('button',{name:'Copy email address',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Email address copied.');
  expect(await page.evaluate(()=>(window as Window&{contactCopied?:string}).contactCopied)).toBe(address);
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('Permission denied');}}}));
  await page.locator('#copy-contact').click();await expect(page.getByRole('status')).toContainText('Copy was unavailable');
  for(const path of ['/privacy.html','/terms.html','/cookies.html','/','/app']){
    await page.goto(path);await page.locator('h1').waitFor();expect(await page.locator('body').innerText()).not.toContain(address);
    await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);expect(await page.locator('a[href="/contact.html"]').count()).toBeGreaterThan(0);
  }
});
