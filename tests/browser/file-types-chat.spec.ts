import {test,expect} from '@playwright/test';

test('every extension downloads unchanged; Files and Chat separate a two-way conversation without persistent storage',async({browser})=>{
  test.setTimeout(process.env.TEST_BASE_URL?.startsWith('https:')?180_000:90_000);
  const a=await browser.newContext({viewport:{width:1440,height:1000}});
  const b=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const host=await a.newPage(),guest=await b.newPage();
  const errors:string[]=[];for(const page of [host,guest])page.on('pageerror',error=>errors.push(error.message));
  try{
    await host.goto('/app');await host.getByRole('button',{name:'Create a room',exact:true}).click();
    const invite=host.getByLabel('Room invite',{exact:true});await expect(invite).toBeVisible({timeout:80_000});
    await guest.goto(await invite.inputValue());await host.getByRole('button',{name:'Allow device',exact:true}).click();
    await expect(guest.getByLabel('Device verification code')).toHaveText(await host.getByLabel('Device verification code').innerText());
    await host.getByRole('button',{name:'Codes match',exact:true}).click();await guest.getByRole('button',{name:'Codes match',exact:true}).click();
    await expect(host.getByRole('button',{name:'Browse files',exact:true})).toBeEnabled();
    await expect(host.getByLabel('Choose file to send',{exact:true})).not.toHaveAttribute('accept',/.*/);
    const names=['sample.exe','source.js','script.ps1','package.apk','vector.svg','unknown.custom','README','archive.zip','font.woff2','model.blend','header.jpg'];
    for(const name of names){
      const payload=Buffer.from(name.endsWith('.svg')?'<svg xmlns="http://www.w3.org/2000/svg"><script>window.__fileExecuted=true</script></svg>':`MZ\u0000synthetic fixture only: ${name}`);
      await host.getByLabel('Choose file to send',{exact:true}).setInputFiles({name,mimeType:'application/octet-stream',buffer:payload});
      await expect(guest.getByLabel('Incoming file')).toContainText(name);
      await guest.getByRole('button',{name:'Accept file',exact:true}).click();
      const row=guest.locator('.transfer-row').filter({hasText:name});const save=row.getByRole('link',{name:'Save file',exact:true});await expect(save).toBeVisible();
      const pending=guest.waitForEvent('download');await save.click();const download=await pending;
      expect(download.suggestedFilename()).toBe(name);
      const chunks:Buffer[]=[];for await(const chunk of (await download.createReadStream())!)chunks.push(chunk);
      expect(Buffer.concat(chunks).equals(payload)).toBeTruthy();
      expect(await guest.evaluate(()=>(window as Window & {__fileExecuted?:boolean}).__fileExecuted)).toBeUndefined();
    }
    await host.getByRole('tab',{name:/Chat/}).click();await host.getByLabel('Text & links',{exact:true}).fill('Here are the project files. Ready for your other screen.');await host.getByRole('button',{name:'Send message',exact:true}).click();
    await expect(guest.getByRole('button',{name:'Messages, 1 unread',exact:true})).toBeVisible();
    await guest.getByRole('button',{name:'Messages, 1 unread',exact:true}).click();
    await expect(guest.locator('.chat-message.received')).toContainText('Here are the project files.');
    await guest.getByLabel('Text & links',{exact:true}).fill('Received them. Everything is right here ✨');await guest.getByLabel('Text & links',{exact:true}).press('Enter');
    await expect(host.locator('.chat-message.received')).toContainText('Received them.');
    await expect(guest.locator('.chat-message.sent')).toContainText('Delivered');
    await expect(guest.locator('.transfer-row')).toHaveCount(0);
    await guest.getByRole('tab',{name:/Files/}).click();await expect(guest.locator('.transfer-row')).toHaveCount(names.length);
    await guest.getByRole('tab',{name:/Chat/}).click();await expect(guest.locator('.chat-message')).toHaveCount(2);
    await guest.getByLabel('Text & links',{exact:true}).fill('Line one');await guest.getByLabel('Text & links',{exact:true}).press('Shift+Enter');await expect(guest.getByLabel('Text & links',{exact:true})).toHaveValue('Line one\n');
    await guest.getByLabel('Text & links',{exact:true}).fill('');
    expect(await guest.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
    expect(await guest.evaluate(()=>({local:Object.keys(localStorage),session:Object.keys(sessionStorage)}))).toEqual({local:[],session:[]});
    expect(await b.cookies()).toEqual([]);
    await guest.locator('.chat-heading').click();
    await guest.locator('#room-activity').screenshot({path:'C:/Users/prana/AppData/Local/Temp/drop-chat-mobile.png'});
    await host.locator('#room-activity').screenshot({path:'C:/Users/prana/AppData/Local/Temp/drop-chat-desktop.png'});
    await host.getByLabel('Text & links',{exact:true}).fill('Private draft from the old room');
    await guest.getByRole('button',{name:'End room',exact:true}).click();
    await expect(guest.getByRole('heading',{level:1})).toHaveText('Room ended.');
    await expect(guest.getByRole('tab',{name:/Chat/})).toHaveAttribute('aria-selected','true');
    await expect(guest.locator('.message-badge')).toHaveCount(0);
    await expect(host.getByRole('button',{name:'Create a room',exact:true})).toBeVisible();
    await host.getByRole('button',{name:'Create a room',exact:true}).click();await expect(invite).toBeVisible({timeout:80_000});
    await guest.goto(await invite.inputValue());await host.getByRole('button',{name:'Allow device',exact:true}).click();
    await expect(host.getByLabel('Device verification code')).toHaveText(/^[A-F0-9]{4}( [A-F0-9]{4}){7}$/);
    await host.getByRole('button',{name:'Codes match',exact:true}).click();await guest.getByRole('button',{name:'Codes match',exact:true}).click();
    await expect(host.getByRole('tab',{name:/Chat/})).toBeVisible();await host.getByRole('tab',{name:/Chat/}).click();
    await expect(host.getByLabel('Text & links',{exact:true})).toHaveValue('');await expect(host.locator('.chat-message')).toHaveCount(0);
    expect(errors).toEqual([]);
  }finally{await a.close();await b.close();}
});
