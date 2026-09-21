// Continuous nav/overflow sweep + find elements poking outside the viewport.
import { chromium } from 'playwright';

const BASE = 'http://localhost:4173';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
const out = [];

for (let width = 1440; width >= 320; width -= 12) {
  await page.setViewportSize({ width, height: 900 });
  await page.waitForTimeout(200);
  const r = await page.evaluate(() => {
    const de = document.documentElement;
    const overflowX = de.scrollWidth - de.clientWidth;
    if (overflowX <= 0) return { width: de.clientWidth, overflowX: 0 };
    // find elements poking outside
    const vw = de.clientWidth;
    const culprits = [...document.querySelectorAll('body *')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 1 && (r.right > vw + 0.5 || r.left < -0.5);
      })
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          cls: (el.className || '').toString().slice(0, 70),
          left: Math.round(r.left * 10) / 10,
          right: Math.round(r.right * 10) / 10,
          w: Math.round(r.width * 10) / 10,
        };
      })
      .slice(0, 6);
    const trial = [...document.querySelectorAll('a')].find(
      (a) => a.textContent.trim() === 'Start Free Trial' && a.offsetParent !== null
    );
    const tr = trial?.getBoundingClientRect();
    return {
      width: vw,
      overflowX,
      culprits,
      trialInNav: tr ? tr.right <= vw + 0.5 && tr.left >= -0.5 : null,
    };
  });
  out.push(r);
}

const issues = out.filter((o) => o.overflowX > 0 || o.trialInNav === false);
console.log(`Widths with overflow or clipped trial: ${issues.length}`);
for (const i of issues) {
  console.log(`\n${JSON.stringify(i, null, 2)}`);
}
if (issues.length === 0) console.log('None found in 320-1440px sweep.');
await browser.close();