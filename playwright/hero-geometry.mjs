import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1800);
const g = await page.evaluate(() => {
  const out = { hero: null, textCol: null, cardWrap: null, img: null, ctas: [], nav: null };
  const hs = document.querySelector('header')?.getBoundingClientRect();
  out.nav = hs ? { h: Math.round(hs.height), y: Math.round(hs.y) } : null;
  // find hero: first main section
  const sec = document.querySelector('main section') || document.querySelector('main div[class*="relative"]');
  if (sec) {
    const r = sec.getBoundingClientRect();
    out.hero = { cls: (sec.className||'').toString().slice(0,120), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), pt: getComputedStyle(sec).paddingTop, pb: getComputedStyle(sec).paddingBottom };
  }
  // the grid inside hero
  const grid = sec ? sec.querySelector('[class*="grid"]') : null;
  if (grid) {
    const r = grid.getBoundingClientRect();
    const cs = getComputedStyle(grid);
    out.grid = {
      cls: (grid.className||'').toString().slice(0,120),
      x: Math.round(r.x), w: Math.round(r.width), y: Math.round(r.y),
      cols: cs.gridTemplateColumns, gap: cs.gap, align: cs.alignItems,
    };
    // left and right children rects
    const kids = [...grid.children].map((c) => {
      const cr = c.getBoundingClientRect();
      return { cls: (c.className||'').toString().slice(0,80), x: Math.round(cr.x), w: Math.round(cr.width), y: Math.round(cr.y), h: Math.round(cr.height) };
    });
    out.gridKids = kids;
  }
  // the hero image & its container
  const img = document.querySelector('main img');
  if (img) {
    const r = img.getBoundingClientRect();
    const c = img.parentElement;
    const cr = c.getBoundingClientRect();
    out.img = {
      src: img.src.slice(0, 110),
      natW: img.naturalWidth, natH: img.naturalHeight,
      dispW: Math.round(r.width), dispH: Math.round(r.height),
      objFit: getComputedStyle(img).objectFit, objPos: getComputedStyle(img).objectPosition,
      container: { cls: (c.className||'').toString().slice(0,80), w: Math.round(cr.width), h: Math.round(cr.height) },
      cropRatio: Math.round((img.naturalWidth/img.naturalHeight) / (r.width/r.height) * 100),
    };
  }
  return out;
});
console.log(JSON.stringify(g, null, 1));
await browser.close();
