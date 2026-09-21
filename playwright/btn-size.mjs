// Verify button font sizes after removing text-sm from base.
import { chromium } from 'playwright';
const browser = await chromium.launch();
for (const route of ['/', '/upgrade', '/deals', '/reviews']) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:4173${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const btns = await page.evaluate(() => {
    return [...document.querySelectorAll('a[class*="inline-flex"], button[class*="inline-flex"]')]
      .filter((el) => el.offsetParent !== null && el.scrollWidth > 40)
      .map((el) => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return {
          text: el.textContent.trim().slice(0, 24),
          fontSize: cs.fontSize,
          h: Math.round(r.height),
          hasShadow: cs.boxShadow !== 'none',
          lineHeight: cs.lineHeight,
        };
      })
      .slice(0, 6);
  });
  console.log(`/${route === '/' ? '' : route.slice(1)}`, JSON.stringify(btns, null, 1));
  await ctx.close();
}
await browser.close();