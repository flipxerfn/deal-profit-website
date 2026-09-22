// Screenshot current homepage hero at 3 viewports for visual review.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
mkdirSync('/tmp/opencode/hero-before', { recursive: true });
const browser = await chromium.launch();
for (const vp of [{ w: 1440, h: 900, n: 'd1440' }, { w: 1280, h: 800, n: 'd1280' }, { w: 390, h: 844, n: 'm390' }]) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `/tmp/opencode/hero-before/home-${vp.n}.png` });
  // hero region: below navbar (64px) down ~660px
  await page.screenshot({ path: `/tmp/opencode/hero-before/hero-${vp.n}.png`, clip: { x: 0, y: 64, width: vp.w, height: 660 } });
  // the deal preview card alone (right column, desktop only)
  if (vp.w >= 1280) {
    const card = await page.evaluate(() => {
      const els = [...document.querySelectorAll('main img')].filter((im) => im.offsetParent !== null && im.getBoundingClientRect().width > 200);
      const winner = els[0];
      if (!winner) return null;
      const container = winner.closest('div')?.parentElement || winner.parentElement;
      const r = container.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height, src: winner.src.slice(0, 90) };
    });
    if (card) {
      await page.screenshot({ path: `/tmp/opencode/hero-before/previewcard-${vp.n}.png`, clip: { x: card.x, y: card.y, width: card.w, height: card.h } });
    }
  }
  await ctx.close();
}
await browser.close();
console.log('done');