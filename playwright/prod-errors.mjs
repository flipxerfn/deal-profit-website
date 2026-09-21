import { chromium } from 'playwright';

const BASE_URL = 'https://goosiev.com';
const routes = ['/', '/reviews', '/upgrade', '/deals', '/trial', '/discord'];

const browser = await chromium.launch({ headless: true });
for (const route of routes) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(`console: ${m.text()}`); });
  let status = null;
  try {
    const resp = await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    status = resp ? resp.status() : null;
  } catch (e) {
    errs.push(`goto: ${e.message}`);
  }
  await page.waitForTimeout(4000);
  const body = await page.evaluate(() => document.body.innerText.slice(0, 120));
  console.log(`\n=== ${route} [HTTP ${status}] ===`);
  console.log('  body:', JSON.stringify(body));
  console.log('  errors:', errs.length ? errs.slice(0, 6) : 'none');
  const cf = await page.evaluate(() => performance.getEntriesByType('resource').map(r => r.name).filter(n => n.includes('index-')).join(', '));
  console.log('  bundle:', cf);
  await ctx.close();
}
await browser.close();