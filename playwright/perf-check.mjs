import { chromium } from 'playwright';

const browser = await chromium.launch();
const out = {};
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push(`PAGEERROR: ${e.message}`));

// Lazy Admin chunk loads and login renders
await page.goto('http://localhost:5173/admin', { waitUntil: 'networkidle' });
out.admin = await page.evaluate(() => ({
  loginVisible: !!document.querySelector('#admin-username'),
  spinnerGone: !document.body.querySelector('.animate-spin'),
}));

// Home renders webp hero image
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
out.home = await page.evaluate(() => {
  const imgs = [...document.querySelectorAll('img')];
  return {
    heroCount: imgs.filter((i) => i.src.includes('deal1-hero')).length,
    allLoaded: imgs.every((i) => i.complete && i.naturalWidth > 0),
    webpCount: imgs.filter((i) => i.src.endsWith('.webp')).length,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  };
});

// Deals renders card images (webp)
await page.goto('http://localhost:5173/deals', { waitUntil: 'networkidle' });
out.deals = await page.evaluate(() => {
  const imgs = [...document.querySelectorAll('img')];
  return {
    cardImages: imgs.length,
    allLoaded: imgs.every((i) => i.complete && i.naturalWidth > 0),
  };
});

// Discord renders webp screenshots
await page.goto('http://localhost:5173/discord', { waitUntil: 'networkidle' });
out.discord = await page.evaluate(() => {
  const imgs = [...document.querySelectorAll('img')];
  return {
    screens: imgs.filter((i) => i.src.includes('discord')).length,
    allLoaded: imgs.every((i) => i.complete && i.naturalWidth > 0),
  };
});

out.consoleErrors = consoleErrors;
console.log(JSON.stringify(out, null, 2));
await browser.close();