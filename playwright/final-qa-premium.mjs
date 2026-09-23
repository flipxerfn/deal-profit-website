// Final premium-evolution QA: every route × 4 viewports + interactions.
// Usage: node playwright/final-qa-premium.mjs   (dev server on :5173)
// Exit code 1 on any failure. Screenshots → playwright/.qa/

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:5173';
const VIEWPORTS = [
  { width: 1440, height: 900, name: '1440' },
  { width: 1280, height: 800, name: '1280' },
  { width: 1024, height: 768, name: '1024' },
  { width: 390, height: 844, name: '390' },
];

const ROUTES = [
  { path: '/', key: 'home', expect: 'Catch the deals' },
  { path: '/deals', key: 'deals', expect: 'deal' },
  { path: '/reviews', key: 'reviews', expect: 'review' },
  { path: '/upgrade', key: 'upgrade', expect: 'Premium' },
  { path: '/trial', key: 'trial', expect: 'Free Trial' },
  { path: '/discord', key: 'discord', expect: 'Discord' },
  { path: '/admin', key: 'admin', expect: 'admin' },
];

mkdirSync(new URL('./.qa', import.meta.url), { recursive: true });

const browser = await chromium.launch();
const failures = [];
let screenshots = 0;

// ---------- geometry pass ----------
for (const route of ROUTES) {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on('console', (m) => {
      if (m.type() === 'error' && !m.text().includes('404')) consoleErrors.push(m.text());
    });
    page.on('pageerror', (e) => consoleErrors.push(`PAGEERROR: ${e.message}`));

    const label = `${route.path}@${vp.name}`;
    try {
      await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle' });
      // Wait for the route's own content to actually mount (survives loaded-box chunk latency).
      await page
        .waitForFunction(
          (exp) => document.body && document.body.textContent.toLowerCase().includes(exp.toLowerCase()),
          route.expect,
          { timeout: 10000 }
        )
        .catch(() => {});
      await page.waitForTimeout(400); // let entrance animations settle

      const m = await page.evaluate(() => {
        const doc = document.documentElement;
        // Real button-wrap check: measure rendered text height vs line-height
        const wrapped = [];
        document.querySelectorAll('a.btn, button.btn').forEach((b) => {
          const range = document.createRange();
          const walker = document.createTreeWalker(b, NodeFilter.SHOW_TEXT, {
            acceptNode: (n) => (n.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
          });
          let textH = 0;
          let node;
          while ((node = walker.nextNode())) {
            range.selectNodeContents(node);
            textH = Math.max(textH, range.getBoundingClientRect().height);
          }
          const lh = parseFloat(getComputedStyle(b).lineHeight) || 16;
          if (textH > lh * 1.4) wrapped.push(b.textContent.trim().replace(/\s+/g, ' ').slice(0, 40));
        });
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          hScroll: doc.scrollWidth > doc.clientWidth + 1,
          wrapped,
          bodyText: document.body.textContent.replace(/\s+/g, ' '),
        };
      });

      await page.screenshot({
        path: new URL(`./.qa/${route.key}-${vp.name}.png`, import.meta.url).pathname,
        fullPage: true,
      });
      screenshots += 1;

      if (m.hScroll) failures.push(`${label}: horizontal scroll (${m.scrollWidth} > ${m.clientWidth})`);
      if (m.wrapped.length) failures.push(`${label}: wrapped buttons → ${m.wrapped.join(' | ')}`);
      if (m.bodyText.includes('Application error') || m.bodyText.includes('Internal Server Error')) {
        failures.push(`${label}: error boundary rendered`);
      }
      if (!m.bodyText.toLowerCase().includes(route.expect.toLowerCase())) {
        failures.push(`${label}: expected text "${route.expect}" missing`);
      }
      if (consoleErrors.length) failures.push(`${label}: console errors → ${consoleErrors.join(' | ')}`);
    } catch (e) {
      failures.push(`${label}: exception ${e.message.split('\n')[0]}`);
    }
    await ctx.close();
  }
}

// ---------- interactions (1440) ----------
const ctxI = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctxI.newPage();
page.on('pageerror', (e) => failures.push(`interaction PAGEERROR: ${e.message}`));

// Deals: `/` focus, rtx filter, Esc clear, chip count, refresh completes
await page.goto(`${BASE}/deals`, { waitUntil: 'networkidle' });
await page.locator('input[aria-label="Search deals"]').waitFor({ state: 'visible', timeout: 10000 });
await page.keyboard.press('/');
await page.waitForTimeout(120);
if ((await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))) !== 'Search deals') {
  failures.push('deals: "/" did not focus search');
}
await page.keyboard.type('rtx');
await page.waitForTimeout(150);
const afterType = await page.locator('p[aria-live="polite"]').first().textContent();
if (!afterType?.includes('matching "rtx"')) failures.push(`deals: filter text wrong → ${afterType}`);
await page.keyboard.press('Escape');
await page.waitForTimeout(150);
const afterEsc = await page.locator('p[aria-live="polite"]').first().textContent();
if (!afterEsc?.includes('Showing 3 of 3')) failures.push(`deals: Esc did not clear → ${afterEsc}`);
// chip: click Tech → count line includes "in Tech"
await page.locator('button[aria-pressed]').filter({ hasText: 'Tech' }).click();
await page.waitForTimeout(200);
const chipText = await page.locator('p[aria-live="polite"]').first().textContent();
if (!chipText?.includes('in Tech')) failures.push(`deals: chip count line wrong → ${chipText}`);
// refresh button completes
await page.locator('button:has-text("Refresh")').click();
await page.waitForTimeout(500);
const refreshDone = await page.locator('button:has-text("Refresh") svg.animate-spin').count() === 0;
if (!refreshDone) failures.push('deals: refresh button stuck busy');

// Reviews: empty submit → validation error (stub /api/reviews so the form renders)
await page.route('**/api/reviews', (route) =>
  route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      ok: true,
      reviews: [],
      summary: { count: 0, average: null },
      featured: null,
    }),
  })
);
await page.goto(`${BASE}/reviews`, { waitUntil: 'networkidle' });
await page.locator('button:has-text("Leave a review")').first().waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});
await page.click('button:has-text("Leave a review")');
await page.waitForTimeout(200);
await page.click('button:has-text("Submit review")');
await page.waitForTimeout(200);
if (!(await page.evaluate(() => document.body.textContent.includes('Please enter a display name')))) {
  failures.push('reviews: empty submit did not show validation error');
}

// Admin: empty submit → validation error
await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => document.querySelector('button[type="submit"]'), null, { timeout: 10000 }).catch(() => {}); // lazy chunk settle
await page.click('button[type="submit"]');
await page.waitForTimeout(200);
if (!(await page.evaluate(() => document.body.textContent.includes('Enter a username and password.')))) {
  failures.push('admin: empty submit did not show validation error');
}

await ctxI.close();
await browser.close();

const report = {
  routes: ROUTES.length,
  viewports: VIEWPORTS.length,
  geometryChecks: ROUTES.length * VIEWPORTS.length,
  screenshots,
  interactions: 5,
  failures,
  passed: failures.length === 0,
};
console.log(JSON.stringify(report, null, 2));
process.exit(failures.length ? 1 : 0);