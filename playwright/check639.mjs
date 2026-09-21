// Verify the 639px transient overflow with a fresh load + full settle.
import { chromium } from 'playwright';
const browser = await chromium.launch();
for (const w of [639, 640, 638, 641]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 800 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => {
    const de = document.documentElement;
    const o = de.scrollWidth - de.clientWidth;
    const vw = de.clientWidth;
    const culprits = o > 0 ? [...document.querySelectorAll('body *')].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 1 && (r.right > vw + 0.5 || r.left < -0.5);
    }).map((el) => ({ tag: el.tagName, cls: (el.className || '').toString().slice(0, 60), right: Math.round(el.getBoundingClientRect().right * 10) / 10 })) : [];
    return { w: vw, overflowX: o, culprits };
  });
  console.log(r);
  await ctx.close();
}
await browser.close();