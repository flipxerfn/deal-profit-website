import { chromium } from 'playwright';

const browser = await chromium.launch();
const results = {};

// Interaction test at desktop
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push(`PAGEERROR: ${e.message}`));

await page.goto('http://localhost:5173/deals', { waitUntil: 'networkidle' });

// 1. `/` focuses search
await page.keyboard.press('/');
await page.waitForTimeout(150);
const searchFocused = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));

// 2. type rtx -> count line changes
const before = await page.locator('p[aria-live="polite"]').first().textContent();
await page.keyboard.type('rtx');
await page.waitForTimeout(200);
const after = await page.locator('p[aria-live="polite"]').first().textContent();

// 3. Escape clears
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
const afterEsc = await page.locator('p[aria-live="polite"]').first().textContent();

// 4. category chip click -> pill moves (layoutId element present in new chip)
const techChip = page.locator('button[aria-pressed]').filter({ hasText: 'Tech' });
await techChip.click();
await page.waitForTimeout(400);
const activeChipText = await page.evaluate(() => {
  const pill = document.querySelector('[data-layout-projector-id], .absolute.inset-0');
  const activeBtn = [...document.querySelectorAll('button[aria-pressed="true"]')][0];
  return { hasPill: !!pill, active: activeBtn?.textContent.trim().slice(0, 30) };
});

// 5. no overflow @ 390
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
const overflow390 = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);

results.kbdFocus = searchFocused;
results.countBefore = before?.replace(/\s+/g, ' ').trim();
results.countAfterRtx = after?.replace(/\s+/g, ' ').trim();
results.countAfterEsc = afterEsc?.replace(/\s+/g, ' ').trim();
results.chip = activeChipText;
results.overflow390 = overflow390;
results.consoleErrors = consoleErrors;
console.log(JSON.stringify(results, null, 2));
await browser.close();