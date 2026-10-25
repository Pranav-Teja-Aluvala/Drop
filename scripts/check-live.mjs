import assert from 'node:assert/strict';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium} from '@playwright/test';

const origin = process.env.TEST_BASE_URL || 'https://drop-devs-52b0.vercel.app';
const backend = process.env.TEST_SIGNAL_ORIGIN || 'https://drop-pairing.onrender.com';
assert.equal(new URL(origin).protocol, 'https:');
assert.equal(new URL(backend).protocol, 'https:');
const browser = await chromium.launch();
const results = [];
try {
  for (const width of [320, 390, 768, 1440]) {
    const page = await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const route of ['/', '/app', '/privacy.html', '/terms.html', '/missing-release-check']) {
      const response = await page.goto(origin + route);
      assert.equal(response.status(), route.includes('missing') ? 404 : 200);
      await page.locator('h1').waitFor();
      const state = await page.evaluate(() => ({
        title: document.title,
        headings: document.querySelectorAll('h1').length,
        overflow: document.documentElement.scrollWidth > innerWidth,
        missingAlt: document.querySelectorAll('img:not([alt])').length,
        canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
        csp: document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content') || '',
        overlay: Boolean(document.querySelector('vite-error-overlay')),
      }));
      assert.ok(state.title && !/Vite|React App/.test(state.title));
      assert.equal(state.headings, 1); assert.equal(state.overflow, false);
      assert.equal(state.missingAlt, 0); assert.equal(state.overlay, false);
      if (['/', '/privacy.html', '/terms.html'].includes(route)) assert.equal(state.canonical, origin + route);
      const headers = response.headers();
      assert.match(state.csp || headers['content-security-policy'] || '', /object-src 'none'/);
      assert.equal(headers['x-content-type-options'], 'nosniff');
      assert.equal(headers['x-frame-options'], 'DENY');
      assert.match(headers['strict-transport-security'], /max-age=/);
      if (route === '/privacy.html') {
        assert.ok(await page.getByRole('link',{name:'pranavteja.dev@gmail.com',exact:true}).count());
        assert.doesNotMatch(await page.locator('main').innerText(), /will be published|must be confirmed before public launch/);
      }
      if (width === 390 && route === '/app') await page.screenshot({path:join(tmpdir(),'drop-release-live-mobile.png'),fullPage:true});
      results.push({width,route,status:response.status()});
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
  for (const path of ['/.env','/.git/config','/src/App.tsx','/server/app.mjs']) assert.equal((await fetch(origin+path)).status,404);
  for (const path of ['/robots.txt','/sitemap.xml','/llms.txt','/favicon.svg','/assets/social-share.jpg']) assert.equal((await fetch(origin+path)).status,200);
  const denied = await fetch(backend+'/api/rooms',{method:'OPTIONS',headers:{Origin:'https://untrusted.example','Access-Control-Request-Method':'POST'}});
  assert.equal(denied.status,403); assert.notEqual(denied.headers.get('access-control-allow-origin'), '*');
  const allowed = await fetch(backend+'/api/rooms',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST'}});
  assert.equal(allowed.status,204); assert.equal(allowed.headers.get('access-control-allow-origin'),origin);
  assert.equal((await fetch(backend+'/api/rooms',{method:'POST'})).status,403);
  assert.equal((await fetch(backend+'/api/health')).status,200);
  console.log(JSON.stringify({passed:true,pageChecks:results.length,checks:['public routes and 404','mobile/tablet/desktop overflow','headings/alt text','canonical metadata','runtime errors and error overlay','HTTPS security headers and CSP','public contact','exposed-file probes','robots/sitemap/favicon/social image','live exact-origin CORS'],screenshot:join(tmpdir(),'drop-release-live-mobile.png')},null,2));
} finally { await browser.close(); }
