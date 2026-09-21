// Mobile menu: opens cleanly at 390 and 767; trial CTA visible; no overflow.
import { chromium } from 'playwright';
const browser = await chromium.launch();

for (const w of [390, 767, 1023]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const before = await page.evaluate(() => ({
    hamVisible: !!document.querySelector('button[aria-label="Open menu"]')?.offsetParent,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  await page.locator('button[aria-label="Open menu"]').click();
  await page.waitForTimeout(700);
  const after = await page.evaluate(() => ({
    panelVisible: !!document.querySelector('button[aria-label="Close menu"]')?.offsetParent,
    trialInPanel: [...document.querySelectorAll('a')]
      .some((a) => a.textContent.trim() === 'Start Free Trial' && a.offsetParent !== null && a.closest('[class*="lg:hidden"]')),
    linksInPanel: [...document.querySelectorAll('header a')].filter((a) => /^Home$|^Deals$|^Reviews$|^Trial$|^Discord$|^Upgrade$/.test(a.textContent.trim()) && a.offsetParent !== null && a.getBoundingClientRect().top > 100).length,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    panelBottomCut: document.querySelector('header').getBoundingClientRect().bottom <= innerHeight + 1,
  }));
  console.log(w, JSON.stringify({ before, after, errors }, null, 1));
  await ctx.close();
}
await browser.close();