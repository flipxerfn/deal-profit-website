import { chromium } from 'playwright';

const browser = await chromium.launch();
const out = {};

const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push(`PAGEERROR: ${e.message}`));

await page.goto('http://localhost:5173/upgrade', { waitUntil: 'networkidle' });

out.viewport = await page.evaluate(() => ({
  priceVisible: document.body.textContent.includes('$25'),
  trialCopy: document.body.textContent.includes('Start free — pay $25/month after your trial'),
  faqCount: document.querySelectorAll('[aria-expanded]').length,
  overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  whopLinks: [...document.querySelectorAll('a[href*="whop.com/deal-profit-6dcc?a=phillipkuz9"]')].length,
  wrapIssue: [...document.querySelectorAll('a.btn')].some((b) => {
    const lh = parseFloat(getComputedStyle(b).lineHeight) || 16;
    const r = b.getBoundingClientRect();
    return r.height > lh * 2.2;
  }),
}));

// FAQ toggle
await page.click('button[aria-controls^="acc-"][aria-expanded="false"]');
await page.waitForTimeout(400);
out.afterOpen = await page.evaluate(() => ({
  openPanels: document.querySelectorAll('button[aria-controls^="acc-"][aria-expanded="true"]').length,
  panelHasText: [...document.querySelectorAll('button[aria-controls^="acc-"][aria-expanded="true"]')].some((b) =>
    document.getElementById(b.getAttribute('aria-controls'))?.textContent.includes('Whop')
  ),
}));

// mobile
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
out.mobile = await page.evaluate(() => ({
  overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  priceVisible: document.body.textContent.includes('$25'),
}));
out.consoleErrors = consoleErrors;
console.log(JSON.stringify(out, null, 2));
await browser.close();