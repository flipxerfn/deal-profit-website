import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = '/tmp/opencode/audit-current';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const viewports = [
  { w: 1440, h: 900, n: 'd1440' },
  { w: 1280, h: 800, n: 'd1280' },
  { w: 1024, h: 768, n: 't1024' },
  { w: 390, h: 844, n: 'm390' },
];

const routes = ['/', '/deals', '/reviews', '/upgrade', '/trial', '/discord'];

// Collect console errors too
for (const vp of viewports) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(`PAGEERROR: ${err.message}`));
  for (const route of routes) {
    await page.goto(`http://localhost:5173${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const slug = route === '/' ? 'home' : route.slice(1);
    await page.screenshot({ path: `${OUT}/${slug}-${vp.n}.png` });
    // also full page
    await page.screenshot({ path: `${OUT}/${slug}-${vp.n}-full.png`, fullPage: true });

    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
    }));
    console.log(`${route} ${vp.n}: scrollW=${metrics.scrollWidth} clientW=${metrics.clientWidth} bodyScrollW=${metrics.bodyScrollWidth}`);
  }
  if (errors.length) {
    console.log(`${vp.n} console errors:`);
    for (const e of [...new Set(errors)].slice(0, 10)) console.log('  ', e);
  }
  await ctx.close();
}
await browser.close();
console.log('done');