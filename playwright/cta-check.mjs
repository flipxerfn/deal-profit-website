import { chromium } from 'playwright';

const CHECKS = [
  { path: '/', name: 'home', ctas: ['Explore Deals', 'Start Free Trial'] },
  { path: '/upgrade', name: 'upgrade', ctas: ['Upgrade to Premium', 'Start Free Trial'] },
];

const VIEWPORTS = [
  { width: 1440, height: 900, name: 'desktop-1440' },
  { width: 1280, height: 800, name: 'desktop-1280' },
  { width: 1024, height: 768, name: 'desktop-1024' },
  { width: 390, height: 844, name: 'mobile-390' },
];

const BASE_URL = 'http://localhost:4173';

async function check(page, route, vp) {
  await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1200);

  const heroHeading = await page.evaluate(() => {
    const h = document.querySelector('h1');
    if (!h) return null;
    const r = h.getBoundingClientRect();
    return { text: h.textContent.slice(0, 60), top: Math.round(r.top), visible: r.width > 0 && r.height > 0 };
  });

  let allOk = true;
  const results = [];
  for (const label of route.ctas) {
    const info = await page.evaluate((txt) => {
      const els = [...document.querySelectorAll('a, button')].filter((el) =>
        el.textContent.trim().includes(txt)
      );
      return els.map((el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
          text: el.textContent.trim(),
          visible: r.width > 0 && r.height > 0,
          nowrap: cs.whiteSpace === 'nowrap' || (r.height <= 60 && !el.textContent.includes('\n')),
          hasBg: cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.borderColor !== 'rgba(0, 0, 0, 0)' || cs.backgroundImage !== 'none',
          href: el.href || '',
          width: Math.round(r.width),
          right: Math.round(r.right),
          viewportW: window.innerWidth,
          clipped: r.right > window.innerWidth + 1,
        };
      });
    }, label);
    const usable = info.filter((i) => i.visible);
    // Prefer the hero one (largest / first non-navbar instance). Check that at least one is fully visible & not clipped.
    const ok = usable.length > 0 && usable.some((i) => !i.clipped && i.nowrap);
    if (!ok) allOk = false;
    results.push({ label, instances: usable.length, ok, details: usable.slice(0, 3) });
  }

  const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
  console.log(`${route.name} @ ${vp.name}: heading=${heroHeading ? `top=${heroHeading.top} visible=${heroHeading.visible}` : 'MISSING'} overflow=${overflow}`);
  for (const r of results) {
    console.log(`  CTA "${r.label}": ok=${r.ok} instances=${r.instances}`);
    r.details.forEach((d, i) =>
      console.log(`    [${i}] visible=${d.visible} nowrap=${d.nowrap} hasBg=${d.hasBg} right=${d.right}/${d.viewportW} clipped=${d.clipped}`)
    );
  }
  return allOk && !overflow && heroHeading?.visible;
}

const browser = await chromium.launch({ headless: true });
let failures = 0;
for (const vp of VIEWPORTS) {
  console.log(`\n=== ${vp.name} (${vp.width}x${vp.height}) ===`);
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  for (const route of CHECKS) {
    try {
      const ok = await check(page, route, vp);
      if (!ok) failures++;
    } catch (e) {
      failures++;
      console.error(`✗ ${route.name} @ ${vp.name}: ${e.message}`);
    }
  }
  await ctx.close();
}
await browser.close();
console.log(failures === 0 ? '\nALL CTA CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);