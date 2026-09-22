// Measure deal card heights per grid row on local (demo data).
import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://localhost:4173/deals', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2200);
const rows = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('main .card,main [class*="rounded-xl"]')]
    .filter((c) => {
      const r = c.getBoundingClientRect();
      return r.width >= 300 && r.width <= 420 && r.height > 200 && r.top > 180 && c.textContent.trim().length > 20;
    })
    .map((c) => {
      const r = c.getBoundingClientRect();
      return { top: Math.round(r.top), h: Math.round(r.height), t: c.textContent.trim().slice(0, 45) };
    });
  // group by row (top within 40px)
  const byRow = {};
  for (const c of cards) {
    let found = null;
    for (const key of Object.keys(byRow)) {
      if (Math.abs(c.top - Number(key)) < 40) { found = key; break; }
    }
    const key = found ?? c.top;
    byRow[key] = byRow[key] || [];
    byRow[key].push(c);
  }
  return Object.values(byRow).map((row) => ({
    heights: row.map((c) => c.h),
    spread: Math.max(...row.map((c) => c.h)) - Math.min(...row.map((c) => c.h)),
    count: row.length,
  }));
});
console.log(JSON.stringify({ rows, overflowXCheck: await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) }, null, 1));
await browser.close();