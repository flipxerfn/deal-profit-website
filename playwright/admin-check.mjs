import { chromium } from 'playwright';

const browser = await chromium.launch();
const out = {};

// /admin in dev — /api/admin/status 404s → falls back to login phase.
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push(`PAGEERROR: ${e.message}`));

await page.goto('http://localhost:5173/admin', { waitUntil: 'networkidle' });
out.login = await page.evaluate(() => ({
  loginVisible: !!document.querySelector('#admin-username') && !!document.querySelector('#admin-password'),
  submitLabel: document.querySelector('button[type="submit"]')?.textContent.trim(),
  overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
}));

// empty submit → validation error
await page.click('button[type="submit"]');
await page.waitForTimeout(200);
out.validationError = await page.evaluate(() =>
  document.body.textContent.includes('Enter a username and password.')
);

// mobile login layout
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(200);
out.mobile = await page.evaluate(() => ({
  overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
}));

out.consoleErrors = consoleErrors;
console.log(JSON.stringify(out, null, 2));
await browser.close();