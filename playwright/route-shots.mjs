import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
mkdirSync('/tmp/opencode/routes', { recursive: true });
const browser = await chromium.launch();
for (const vp of [{ w: 1440, h: 900, n: 'd1440' }, { w: 390, h: 844, n: 'm390' }]) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
  const page = await ctx.newPage();
  for (const route of ['/deals', '/reviews', '/upgrade', '/trial', '/discord']) {
    await page.goto(`http://localhost:4173${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1800);
    const slug = route.slice(1);
    await page.screenshot({ path: `/tmp/opencode/routes/${slug}-${vp.n}.png` });
  }
  await ctx.close();
}
await browser.close();
console.log('done');
