// Inspect actual deal cards + review cards markup/metrics on live.
import { chromium } from 'playwright';
const browser = await chromium.launch();

// DEALS
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('https://goosiev.com/deals', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2600);
  const out = await page.evaluate(() => {
    const result = {};
    // collect every link/div candidate with meaningful width in main region
    const mains = document.querySelectorAll('main a, main article, main .card, main [class*="rounded"]');
    const cards = [...mains].filter((c) => {
      const r = c.getBoundingClientRect();
      return r.width >= 200 && r.width <= 500 && r.height >= 150 && r.top > 150;
    });
    result.cardCount = cards.length;
    result.firstThree = cards.slice(0, 3).map((c) => {
      const r = c.getBoundingClientRect();
      return {
        tag: c.tagName,
        cls: (c.className || '').toString().slice(0, 90),
        w: Math.round(r.width), h: Math.round(r.height),
        text: c.textContent.trim().replace(/\s+/g, ' ').slice(0, 160),
      };
    });
    // price hierarchy: find price-like elements
    result.prices = [...document.querySelectorAll('p,span,h3')]
      .filter((el) => /\$[\d.,]+/.test(el.textContent) && el.offsetParent !== null)
      .slice(0, 10)
      .map((el) => ({ txt: el.textContent.trim().slice(0, 20), fs: getComputedStyle(el).fontSize, wt: getComputedStyle(el).fontWeight, color: getComputedStyle(el).color }));
    // images in the grid area
    result.images = [...document.querySelectorAll('main img')].filter((im) => im.offsetParent !== null).slice(0, 6).map((im) => {
      const r = im.getBoundingClientRect();
      const p = im.parentElement?.getBoundingClientRect();
      return { src: (im.src || '').split('/').pop().slice(0, 24), w: Math.round(r.width), h: Math.round(r.height), objFit: getComputedStyle(im).objectFit, ratio: Math.round(r.width / (r.height || 1) * 10) / 10, parentH: p ? Math.round(p.height) : null };
    });
    result.overflowX = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    return result;
  });
  console.log('=== DEALS CARDS ===');
  console.log(JSON.stringify(out, null, 1));
  await ctx.close();
}

// REVIEWS cards
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('https://goosiev.com/reviews', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200);
  const out = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.card')].filter((c) => c.offsetParent !== null).map((c) => {
      const r = c.getBoundingClientRect();
      return {
        w: Math.round(r.width), h: Math.round(r.height),
        top: Math.round(r.top),
        text: c.textContent.trim().replace(/\s+/g, ' ').slice(0, 130),
        stars: c.querySelectorAll('svg').length,
      };
    });
    const grid = document.querySelector('main .grid, section .grid');
    return { cards, gridCls: grid ? (grid.className || '').toString().slice(0, 80) : null };
  });
  console.log('\n=== REVIEW CARDS ===');
  console.log(JSON.stringify(out, null, 1));
  await ctx.close();
}
await browser.close();