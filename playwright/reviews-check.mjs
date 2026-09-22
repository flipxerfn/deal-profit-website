import { chromium } from 'playwright';

const browser = await chromium.launch();
const out = {};

// 1. Dev-mode /reviews: /api/reviews 404s in dev → error state renders cleanly.
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push(`PAGEERROR: ${e.message}`));

await page.goto('http://localhost:5173/reviews', { waitUntil: 'networkidle' });
const errorState = await page.evaluate(() => {
  const doc = document.documentElement;
  const retryBtn = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Retry');
  return {
    errorText: document.body.textContent.includes('Could not load reviews right now'),
    retryVisible: !!retryBtn,
    overflow: doc.scrollWidth > doc.clientWidth,
  };
});

// Empty form validation
await page.click('button:has-text("Leave a review")');
await page.waitForTimeout(200);
await page.click('button:has-text("Submit review")');
await page.waitForTimeout(200);
const validationMsg = await page.evaluate(() =>
  document.body.textContent.includes('Please enter a display name')
);

// 2. Full snapshot of the distribution + card markup against a stub /api/reviews.
// Serve a fake API by intercepting the fetch.
const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page2 = await ctx2.newPage();
const apiConsoleErrors = [];
page2.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) apiConsoleErrors.push(m.text()); });
await page2.route('**/api/reviews', (route) =>
  route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      ok: true,
      reviews: [
        { id: 'r1', name: 'PennyHunter', rating: 5, text: 'Insane price error catches every single day. My go-to community.', category: 'deals', featured: true, createdAt: '2026-08-01T00:00:00Z' },
        { id: 'r2', name: 'SlideKing', rating: 4, text: 'Alerts are fast and the mods keep the feed clean.', category: 'alerts', featured: false, createdAt: '2026-08-10T00:00:00Z' },
        { id: 'r3', name: 'DealCatcher', rating: 5, text: 'Saved hundreds on my build thanks to penny deals.', category: 'community', featured: false, createdAt: '2026-09-01T00:00:00Z' },
      ],
      summary: { count: 3, average: 4.7 },
      featured: { id: 'r1', name: 'PennyHunter', rating: 5, text: 'Insane price error catches every single day. My go-to community.', category: 'deals', featured: true, createdAt: '2026-08-01T00:00:00Z' },
    }),
  })
);
await page2.goto('http://localhost:5173/reviews', { waitUntil: 'networkidle' });
const rich = await page2.evaluate(() => {
  const doc = document.documentElement;
  const bars = document.querySelectorAll('[aria-label="Rating distribution"] > div').length;
  const shieldBadges = document.querySelectorAll('svg[class*="text-brand-2"]').length;
  const cards = document.querySelectorAll('article').length;
  return {
    distributionBars: bars,
    cards,
    overflow: doc.scrollWidth > doc.clientWidth,
    avgVisible: document.body.textContent.includes('4.7'),
  };
});

// mobile overflow
await page2.setViewportSize({ width: 390, height: 844 });
await page2.waitForTimeout(300);
const mobOverflow = await page2.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);

out.errorState = errorState;
out.validationMsg = validationMsg;
out.rich = rich;
out.mobOverflow = mobOverflow;
out.apiConsoleErrors = apiConsoleErrors;
console.log(JSON.stringify(out, null, 2));
await browser.close();