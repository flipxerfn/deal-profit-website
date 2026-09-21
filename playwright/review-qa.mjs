// Final QA for the /reviews submit flow at 1440x900 and 390x844.
import { chromium } from 'playwright';

const BASE = 'http://localhost:8787';
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

  const name = `QA ${vp.name.split('-')[0]} ${Date.now().toString(36)}`;

  // 1. load /reviews
  await page.goto(`${BASE}/reviews`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(600);

  // no horizontal overflow on load
  const overflowOnLoad = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );

  // approved review should be visible
  const approvedVisible = await page.locator('article', { hasText: 'Valid Tester' }).count();

  // 2. open form
  await page.locator('button', { hasText: 'Leave a review' }).first().click();
  await page.waitForTimeout(400);
  const formVisible = await page.locator('form').count() === 1;

  // 3. fill + submit
  if (formVisible) {
    await page.locator('input[aria-label="Display name"]').fill(name);
    await page.locator('button[aria-label="5 stars"]').click();
    await page.locator('textarea[aria-label="Review text"]').fill('This is a browser QA review submission. Nice alerts!');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2500);
  }

  const after = await page.evaluate(() => {
    const t = document.body.innerText;
    return {
      successBanner: t.includes('submitted and will appear once approved'),
      hasError: t.includes('could not be submitted') || t.includes('Could not reach') || t.includes('too many'),
      formClosed: !document.querySelector('form'),
    };
  });

  // no overflow after interaction
  const overflowAfter = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );

  let posted = null;
  const postResponses = [];
  page.on('response', async (res) => {
    if (res.url().includes('/api/reviews') && res.request().method() === 'POST') {
      postResponses.push(res.status());
    }
  });

  report.push({
    viewport: vp.name,
    overflowOnLoad,
    overflowAfter,
    approvedVisible: approvedVisible > 0,
    formVisible,
    successBanner: after.successBanner,
    hasError: after.hasError,
    formClosed: after.formClosed,
    errors,
  });
  overallOk &&= formVisible && after.successBanner && !after.hasError && overflowAfter <= 0 && errors.length === 0;

  await context.close();
}

console.log(JSON.stringify(report, null, 2));
console.log(`\nOVERALL QA: ${overallOk ? 'PASS' : 'FAIL'}`);
await browser.close();
process.exit(overallOk ? 0 : 1);