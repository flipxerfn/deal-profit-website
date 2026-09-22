// Functional checks: review submission (local full-stack), admin login + queue (live, read-only).
import { chromium } from 'playwright';
const browser = await chromium.launch();

// 1. REVIEW SUBMISSION on local full-stack (8787) — same code path as live, no queue pollution.
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
  await page.goto('http://localhost:8787/reviews', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.locator('button', { hasText: 'Leave a review' }).first().click();
  await page.waitForTimeout(500);
  const name = `QA ${Date.now().toString().slice(-6)}`;
  await page.locator('input[aria-label="Display name"]').fill(name);
  await page.locator('button[aria-label="5 stars"]').click();
  await page.locator('textarea[aria-label="Review text"]').fill('Automated visual QA submission — functional check.');
  await page.locator('button', { hasText: 'Submit review' }).click();
  await page.waitForTimeout(1800);
  const result = await page.evaluate(() => ({
    successBanner: !!document.querySelector('[role="status"]'),
    bannerText: document.querySelector('[role="status"]')?.textContent.trim().slice(0, 90) || '',
    formClosed: !document.querySelector('form'),
  }));
  console.log('REVIEW SUBMIT:', JSON.stringify({ ...result, errors }, null, 1));
  await ctx.close();
}

// 2. ADMIN: login live + moderation UI renders (no changes made).
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
  await page.goto('https://goosiev.com/admin', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const inputs = page.locator('input');
  const ic = await inputs.count();
  let admin = {};
  if (ic >= 2) {
    await inputs.nth(0).fill('goosievv');
    await inputs.nth(1).fill('Orio23!!2012');
    await page.locator('button', { hasText: /sign in|login|log in/i }).first().click();
    await page.waitForTimeout(2200);
    admin = await page.evaluate(() => ({
      authed: !/sign in|log in/i.test(document.body.innerText.slice(0, 500)),
      heading: document.querySelector('h1,h2')?.textContent.trim().slice(0, 50) || '',
      hasQueue: /pending|approve|moderat/i.test(document.body.innerText),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      hasInputs: document.querySelectorAll('input').length,
    }));
  }
  console.log('ADMIN LIVE:', JSON.stringify({ ...admin, inputs: ic, errors }, null, 1));
  await ctx.close();
}
await browser.close();