// Reproduction: /reviews submit flow — captures console, page errors, network, UI state.
import { chromium } from 'playwright';

const BASE = 'http://localhost:8787';

const results = {
  steps: [],
  console: [],
  pageErrors: [],
  requests: [],
  responses: [],
};

const log = (step, detail) => {
  results.steps.push({ step, detail });
  console.log(`[STEP] ${step}: ${detail}`);
};

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

page.on('console', (msg) => {
  results.console.push({ type: msg.type(), text: msg.text().slice(0, 400) });
  if (msg.type() === 'error') console.log(`[CONSOLE-ERROR] ${msg.text().slice(0, 400)}`);
});
page.on('pageerror', (err) => {
  results.pageErrors.push(String(err).slice(0, 600));
  console.log(`[PAGEERROR] ${String(err).slice(0, 600)}`);
});
page.on('request', (req) => {
  if (req.url().includes('/api/')) {
    results.requests.push({ url: req.url(), method: req.method() });
    console.log(`[REQ] ${req.method()} ${req.url()}`);
  }
});
page.on('response', async (res) => {
  if (res.url().includes('/api/')) {
    let body = null;
    try {
      body = (await res.text()).slice(0, 300);
    } catch {
      /* ignore */
    }
    results.responses.push({ url: res.url(), status: res.status(), body });
    console.log(`[RES] ${res.status()} ${res.url()} body=${body}`);
  }
});

// --- 1. Load the page
await page.goto(`${BASE}/reviews`, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(800);
log('page-load', 'opened /reviews; h1=' + JSON.stringify(await page.locator('h1').first().textContent().catch(() => null)));

// --- 2. Click "Leave a review"
const leaveBtn = page.locator('button', { hasText: 'Leave a review' }).first();
log('leave-btn-visible', String(await leaveBtn.isVisible().catch(() => false)));
await leaveBtn.click();
await page.waitForTimeout(1200);

// --- 3. Check whether the form appeared or the page crashed
const bodyText = await page.evaluate(() => document.body ? document.body.innerText.slice(0, 300) : 'NO BODY');
const formVisible = await page.locator('form').count();
log('post-toggle-state', `form count=${formVisible} pageerr=${results.pageErrors.length} bodyTextHead=${JSON.stringify(bodyText.slice(0, 120))}`);

if (results.pageErrors.length > 0 || formVisible === 0) {
  log('REPRODUCED', `form did not render; pageErrors=${results.pageErrors.length}; console errors=${results.console.filter((c) => c.type === 'error').length}`);
} else {
  // --- 4. Fill the form
  log('form-rendered', 'form is visible');
  await page.locator('input[aria-label="Display name"]').fill('Test User');
  await page.locator('textarea[aria-label="Review text"]').fill('This is a test review submission.');
  // click the 5th star
  const starBtns = page.locator('button[aria-label^="5 "]').first();
  const allStars = page.locator('button[aria-label$="stars"]');
  log('star-count', `${await allStars.count()} star buttons`);
  await page.locator('button[aria-label*="star"]').nth(4).click();
  await page.waitForTimeout(300);

  const ratingText = await page.evaluate(() => document.body.innerText.includes('5 / 5'));
  log('rating-selected', `body shows "5 / 5" ? ${ratingText}`);

  // --- 5. Submit
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(2500);

  log('post-submit', `pageErrors=${results.pageErrors.length} formMsg/Err in body=${JSON.stringify(
    await page.evaluate(() => {
      const t = document.body.innerText;
      return {
        hasThanks: t.includes('approved'),
        hasError: t.includes('could not be submitted') || t.includes('Could not reach'),
        hasSubmitting: t.includes('Submitting'),
      };
    })
  )}`);
}

// --- 6. Refresh and check persistence
await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(800);
log('after-reload', 'reviews=' + JSON.stringify((await page.evaluate(() => document.body.innerText.match(/Test User|This is a test review/g) || []))));

console.log('\n===== SUMMARY =====');
console.log(JSON.stringify({ pageErrors: results.pageErrors, consoleErrors: results.console.filter((c) => c.type === 'error'), requests: results.requests, responses: results.responses }, null, 2));

await browser.close();