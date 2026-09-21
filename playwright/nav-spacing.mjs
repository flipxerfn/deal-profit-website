// Precise nav spacing at each width — supports the lg desktop-nav breakpoint.
import { chromium } from 'playwright';
const browser = await chromium.launch();

for (const w of [1280, 1024, 990, 900, 820, 768, 767, 640, 639, 390]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 800 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const r = await page.evaluate(() => {
    const navEl = document.querySelector('nav');
    const brand = navEl.querySelector('a[aria-label="Deal Profit home"]');
    const br = brand.getBoundingClientRect();
    const links = [...navEl.querySelectorAll('.nav-link')].filter((l) => l.offsetParent !== null);
    const lrs = links.map((l) => l.getBoundingClientRect());
    const trial = [...navEl.querySelectorAll('a')].find((a) => a.textContent.trim() === 'Start Free Trial' && a.offsetParent !== null);
    const tr = trial ? trial.getBoundingClientRect() : null;
    const ham = navEl.querySelector('button[aria-label="Open menu"], button[aria-label="Close menu"]');
    const hr = ham && ham.offsetParent !== null ? ham.getBoundingClientRect() : null;
    const overflowX = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    const lastLink = lrs[lrs.length - 1];
    const gaps = { brandToLinks: null, linksToTrial: null, brandToRight: null, trialToHam: null };
    if (lastLink) {
      gaps.brandToLinks = Math.round(lrs[0].left - br.right);
      gaps.linksToTrial = tr ? Math.round(tr.left - lastLink.right) : null;
    } else if (tr && hr) {
      gaps.trialToHam = Math.round(hr.left - tr.right);
      gaps.brandToRight = Math.round((tr.left) - br.right); // everything to the right of brand
      gaps.brandToTrial = Math.round(tr.left - br.right);
    }
    return {
      width: innerWidth,
      linksVisible: lrs.length,
      trial, hamVisible: !!hr, overflowX,
      gaps,
    };
  });
  console.log(r);
  await ctx.close();
}
await browser.close();