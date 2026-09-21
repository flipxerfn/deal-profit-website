// Sanity: /admin renders (login gate) with no page errors / overflow.
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text().slice(0, 300));
});
await page.goto('http://localhost:8787/admin', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(800);
const text = await page.evaluate(() => document.body.innerText.slice(0, 400));
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
console.log(JSON.stringify({ hasAdminUI: /admin|login|sign in|reviews|rejected|pending/i.test(text), bodyHead: text.slice(0, 120), pageErrors: errors, overflow }, null, 2));
await browser.close();
process.exit(errors.length === 0 && overflow <= 0 ? 0 : 1);