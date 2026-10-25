import {test,expect} from '@playwright/test';
import {mobileQuality} from './helpers/mobileQuality';

test('390px: all public pages and app have readable text and 44px controls',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
  for(const route of ['/','/app','/privacy.html','/terms.html','/cookies.html','/contact.html','/missing']){
    await page.goto(route);await page.locator('h1').waitFor();if(route==='/')await expect(page.locator('.hero__cta')).toBeInViewport({ratio:1});if(route==='/app')await expect(page.getByRole('button',{name:'Create a room',exact:true})).toBeInViewport({ratio:1});const audit=await mobileQuality(page);
    expect(audit.text,`small text on ${route}`).toEqual([]);expect(audit.targets,`small tap targets on ${route}`).toEqual([]);expect(audit.overflow,route).toBe(false);
  }
});
