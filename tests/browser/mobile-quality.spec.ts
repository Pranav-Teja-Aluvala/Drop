import {test,expect} from '@playwright/test';
import {mobileQuality} from './helpers/mobileQuality';

test('390px: standard pages/app use 16px and 44px controls; supplied 404 retains approved styling',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
  for(const route of ['/','/app','/privacy.html','/terms.html','/cookies.html','/contact.html','/missing']){
    await page.goto(route);await page.locator('h1').waitFor();if(route==='/')await expect(page.locator('.hero__cta')).toBeInViewport({ratio:1});if(route==='/app')await expect(page.getByRole('button',{name:'Create a room',exact:true})).toBeInViewport({ratio:1});const audit=await mobileQuality(page);
    // The supplied 404 retains its exact typography/preview controls at the user's request.
    if(route!=='/missing'){expect(audit.text,`small text on ${route}`).toEqual([]);expect(audit.targets,`small tap targets on ${route}`).toEqual([]);}expect(audit.overflow,route).toBe(false);
  }
});
