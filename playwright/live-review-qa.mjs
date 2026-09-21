// Live production verification of the /reviews submit flow (fresh contexts).
import { chromium } from 'playwright';

const BASE = 'https://goosiev.com';
const VIEWPORTS = [
  { width: 1440, height: 900, name: 'desktop-1440' },
  { width: 390, height: 844, name: 'mobile-390' },
];

const browser = await chromium.launch();
let overallOk = true;
const report = [];

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${String(e).slice(0, 300)}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 300)}`);
  });
  let postStatus = null;
  page.on('response', (res) => {
    if (res.url().includes('/api/reviews') && res.request().method() === 'POST') postStatus = res.status();
  });

  const name = `QA Live ${vp.name.split('-')[0]} ${Date.now().toString(36)}`;

  await page.goto(`${BASE}/reviews`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(1200);
  const overflowOnLoad = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

  await page.locator('button', { hasText: 'Leave a review' }).first().click();
  await page.waitForTimeout(500);
  const formVisible = await page.locator('form').count() === 1;

  if (formVisible) {
    await page.locator('input[aria-label="Display name"]').fill(name);
    await page.locator('button[aria-label="5 stars"]').click();
    await page.locator('textarea[aria-label="Review text"]').fill('Live QA check - please reject/delete this test review. Thanks!');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(4000);
  }

  const after = await page.evaluate(() => {
    const t = document.body.innerText;
    return {
      successBanner: t.includes('submitted and will appear once approved'),
      hasError: t.includes('could not be submitted') || t.includes('Could not reach') || t.includes('try again later'),
    };
  });
  const overflowAfter = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

  report.push({ viewport: vp.name, overflowOnLoad, overflowAfter, formVisible, postStatus, successBanner: after.successBanner, hasError: after.hasError, errors });
  overallOk &&= formVisible && after.successBanner && !after.hasError && postStatus === 201 && overflowAfter <= 0 && errors.length === 0;
  await context.close();
}

console.log(JSON.stringify(report, null, 2));
console.log(`\nLIVE QA: ${overallOk ? 'PASS' : 'FAIL'}`);
await browser.close();
process.exit(overallOk ? 0 : 1);