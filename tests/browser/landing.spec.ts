import { test, expect } from '@playwright/test';

test('walkthrough cursor travels and clicks the visible control', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#watch');
  await page.locator('#watch').scrollIntoViewIfNeeded();
  await expect(page.locator('.film-caption')).toHaveText('Create a temporary room.');
  await expect(page.locator('.film-cursor')).toBeVisible();

  const positions = await page.evaluate(async () => {
    const cursor = document.querySelector<SVGPathElement>('.film-cursor')!;
    const positions: number[] = [];
    const start = performance.now();
    while (performance.now() - start < 650) {
      positions.push(cursor.getScreenCTM()!.e);
      await new Promise(requestAnimationFrame);
    }
    return positions;
  });
  expect(Math.max(...positions) - Math.min(...positions)).toBeGreaterThan(12);

  async function expectClickOn(selector: string) {
    await page.waitForFunction(selector => {
      const target = document.querySelector(selector)!;
      const pulse = document.querySelector('.cursor-click')!;
      return getComputedStyle(target.parentElement!).visibility === 'visible'
        && Number(getComputedStyle(pulse).opacity) > 0.2;
    }, selector);
    const error = await page.evaluate(selector => {
      const target = document.querySelector(selector)!.getBoundingClientRect();
      const cursor = document.querySelector<SVGPathElement>('.film-cursor')!;
      const tip = new DOMPoint(0, 0).matrixTransform(cursor.getScreenCTM()!);
      return Math.hypot(tip.x - (target.left + target.width / 2), tip.y - (target.top + target.height / 2));
    }, selector);
    expect(error).toBeLessThan(3);
    const pulseError = await page.evaluate(selector => {
      const bounds = document.querySelector(selector)!.getBoundingClientRect();
      const pulse = document.querySelector<SVGCircleElement>('.cursor-click')!;
      const center = new DOMPoint(pulse.cx.baseVal.value, pulse.cy.baseVal.value)
        .matrixTransform(pulse.getScreenCTM()!);
      return Math.hypot(center.x - (bounds.left + bounds.width / 2), center.y - (bounds.top + bounds.height / 2));
    }, selector);
    expect(pulseError).toBeLessThan(3);
  }
  await expectClickOn('.laptop-0 .film-button');
  await page.waitForFunction(() => {
    const camera = document.querySelector('.phone-0 .camera-app')!;
    const pulse = document.querySelector('.phone-tap')!;
    return getComputedStyle(camera.parentElement!).visibility === 'visible'
      && Number(getComputedStyle(pulse).opacity) > 0.2;
  });
  const tapError = await page.evaluate(() => {
    const camera = document.querySelector('.phone-0 .camera-app')!.getBoundingClientRect();
    const pulse = document.querySelector<SVGCircleElement>('.phone-tap')!;
    const center = new DOMPoint(pulse.cx.baseVal.value, pulse.cy.baseVal.value)
      .matrixTransform(pulse.getScreenCTM()!);
    return Math.hypot(center.x - (camera.left + camera.width / 2), center.y - (camera.top + camera.height / 2));
  });
  expect(tapError).toBeLessThan(3);
  await page.waitForFunction(() => {
    const target = document.querySelector('.phone-2 .film-button')!;
    return getComputedStyle(target.parentElement!).visibility === 'visible'
      && Number(getComputedStyle(document.querySelector('.phone-tap')!).opacity) > 0.2;
  });
  const liftedTapError = await page.evaluate(() => {
    const target = document.querySelector('.phone-2 .film-button')!.getBoundingClientRect();
    const pulse = document.querySelector<SVGCircleElement>('.phone-tap')!;
    const center = new DOMPoint(pulse.cx.baseVal.value, pulse.cy.baseVal.value)
      .matrixTransform(pulse.getScreenCTM()!);
    return Math.hypot(center.x - (target.left + target.width / 2), center.y - (target.top + target.height / 2));
  });
  expect(liftedTapError).toBeLessThan(3);
  await expectClickOn('.laptop-3 .film-button');
  expect(errors).toEqual([]);
});

test('demo frame does not tilt or press in response to pointer or touch', async ({page}) => {
  await page.goto('/');
  const frame = page.locator('.device-art');
  const before = await frame.evaluate(el => getComputedStyle(el).transform);
  for (const pointerType of ['mouse', 'touch']) {
    await frame.dispatchEvent('pointermove', {pointerType,clientX:600,clientY:500});
    await frame.dispatchEvent('pointerdown', {pointerType,clientX:600,clientY:500});
    await expect.poll(() => frame.evaluate(el => getComputedStyle(el).transform)).toBe(before);
    await frame.dispatchEvent('pointerup', {pointerType});
  }
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(250, 250, 248)');
});

test('one signature scene, replay and dedicated privacy page',async({page})=>{await page.goto('/');await expect(page.locator('.device-art')).toHaveCount(1);await expect(page.locator('[data-replay]')).toHaveCount(0);await page.locator('#watch').scrollIntoViewIfNeeded();await expect(page.locator('.film-phone')).toBeVisible();await page.goto('/privacy.html');await expect(page.locator('h1')).toHaveText('Your files. Your control.');});

for(const width of [320,390,768,1440]) test(`landing navigation and overflow at ${width}px`, async ({page})=>{
  await page.setViewportSize({width,height:900});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  await expect(page.locator('.film-caption')).toHaveText('Received. Save the file to Downloads.');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(width<761){await page.getByRole('button',{name:'Open menu'}).click();await expect(page.locator('#nav-menu')).toHaveClass(/is-open/);}
  await page.locator('.nav__cta').click();
  await expect(page.getByRole('button',{name:'Create a room'})).toBeInViewport();
  await expect(page.getByRole('textbox',{name:'Invite link'})).toHaveValue('');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.goto('/missing-page');
  await expect(page.getByRole('heading',{level:1})).toContainText("Oops, that page isn't");
  await page.getByRole('link',{name:'Return home'}).click();
  await expect(page.locator('#hero-title')).toBeVisible();
});
