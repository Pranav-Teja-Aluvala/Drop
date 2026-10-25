import {test,expect,type Page} from '@playwright/test';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

async function visibility(page:Page,hidden:boolean){
  await page.evaluate(value=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:value?'hidden':'visible'});document.dispatchEvent(new Event('visibilitychange'));},hidden);
}

test('five minute background timer cancels on return, restarts and ends both connected devices',async({browser})=>{
  const a=await browser.newContext(),b=await browser.newContext();const host=await a.newPage(),guest=await b.newPage();
  try{
    await host.goto('/app');await host.getByRole('button',{name:'Create a room',exact:true}).click();
    const invite=host.getByLabel('Room invite',{exact:true});await expect(invite).toBeVisible({timeout:80_000});
    await guest.goto(await invite.inputValue());await host.getByRole('button',{name:'Allow device',exact:true}).click();
    await host.getByRole('button',{name:'Codes match',exact:true}).click();await guest.getByRole('button',{name:'Codes match',exact:true}).click();
    await expect(host.getByRole('button',{name:'Browse files',exact:true})).toBeEnabled();
    await guest.clock.install();
    await visibility(guest,true);
    await expect(host.getByText('Your other device is away',{exact:true})).toBeVisible();
    await expect(host.getByLabel('Background time remaining')).toHaveText(/^[45]:\d{2}$/);
    await host.setViewportSize({width:390,height:1000});
    await host.locator('.room-session').screenshot({path:join(tmpdir(),'drop-background-countdown.png')});
    await guest.clock.fastForward(4*60_000);
    await visibility(guest,false);
    await expect(host.getByText('Your other device is away',{exact:true})).toHaveCount(0);
    await expect(guest.getByRole('button',{name:'Browse files',exact:true})).toBeEnabled();
    await visibility(guest,true);
    await expect(host.getByText('Your other device is away',{exact:true})).toBeVisible();
    await guest.clock.fastForward(5*60_000);
    await expect(guest.getByRole('alert')).toContainText('5 minutes');
    await expect(host.getByRole('heading',{level:1})).toHaveText('Let’s reconnect.');
    await expect(guest.getByRole('button',{name:'Browse files',exact:true})).toHaveCount(0);
    await visibility(guest,false);
    await guest.getByRole('button',{name:'Create a room',exact:true}).click();
    await expect(guest.getByLabel('Room invite',{exact:true})).toBeVisible({timeout:80_000});
    await expect(guest.getByLabel('Background time remaining')).toHaveCount(0);
    await guest.getByRole('button',{name:'End room',exact:true}).click();
  }finally{await a.close();await b.close();}
});

test('resuming a frozen page after the deadline cannot cancel its expired room',async({page})=>{
  await page.goto('/app');await page.getByRole('button',{name:'Create a room',exact:true}).click();
  await expect(page.getByLabel('Room invite',{exact:true})).toBeVisible({timeout:80_000});
  await page.clock.install();await visibility(page,true);
  const later=await page.evaluate(()=>Date.now()+6*60_000);
  // Simulate wall time advancing while JavaScript timers were frozen by the OS.
  await page.clock.setSystemTime(later);await visibility(page,false);
  await expect(page.getByRole('alert')).toContainText('5 minutes');
  await expect(page.getByRole('heading',{level:1})).toHaveText('Let’s reconnect.');
});
