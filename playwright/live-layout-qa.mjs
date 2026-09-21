// Live layout QA: fresh contexts against the deployed site (goosiev.com).
// Verifies the homepage fixes survived the GitHub -> Cloudflare Workers Builds deploy.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'https://goosiev.com';
const VIEWPORTS = [
  { width: 1440, height: 900, name: '1440x900' },
  { width: 1280, height: 800, name: '1280x800' },
  { width: 390, height: 844, name: '390x844' },
];
const ROUTES = ['/', '/deals', '/reviews', '/upgrade'];

mkdirSync('/tmp/opencode/live-qa', { recursive: true });
const browser = await chromium.launch();
const report = [];
let failures = 0;

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 160)));

  for (const route of ROUTES) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(900);
    const slug = route === '/' ? 'home' : route.slice(1);
    await page.screenshot({ path: `/tmp/opencode/live-qa/${vp.name}-${slug}.png` });

    const m = await page.evaluate((route) => {
      const de = document.documentElement;
      const overflowX = de.scrollWidth - de.clientWidth;
      const vw = de.clientWidth;
      const hero = route === '/' ? document.querySelector('section') : null;
      let heroBottom = null;
      if (hero) heroBottom = Math.round(hero.getBoundingClientRect().bottom);
      const trial = [...document.querySelectorAll('a')]
        .find((a) => a.textContent.trim() === 'Start Free Trial' && a.offsetParent !== null);
      const tr = trial ? trial.getBoundingClientRect() : null;
      const navLinks = [...document.querySelectorAll('.nav-link')].filter((l) => l.offsetParent !== null);
      return {
        overflowX,
        heroBottom,
        trialInViewport: tr ? tr.right <= vw + 1 && tr.left >= -1 : false,
        trialVisible: !!tr,
        desktopLinksVisible: navLinks.length,
        navTop: document.querySelector('nav') ? Math.round(document.querySelector('nav').getBoundingClientRect().top) : null,
      };
    }, route);

    const vw = m.heroBottom !== null && m.overflowX === 0 ? vp.width : null;
    const heroFits = m.heroBottom !== null && vw >= 1280 ? m.heroBottom <= vp.height : true;
    const pass = m.overflowX === 0 && heroFits && (!m.trialVisible || m.trialInViewport);
    if (!pass) failures++;
    report.push({ route, viewport: vp.name, ...m, heroFits, pass, pageErrors });
  }
  await context.close();
}

for (const r of report) {
  console.log(
    `  ${r.pass ? 'PASS' : 'FAIL'} ${r.route.padEnd(8)} @ ${r.viewport.padEnd(8)} overflow=${r.overflowX} ` +
    `heroBottom=${r.heroBottom ?? '-'} trialVisible=${r.trialVisible} trialFits=${r.trialInViewport} ` +
    `desktopLinks=${r.desktopLinksVisible} pageErrors=${r.pageErrors.length}`
  );
}
console.log(`\n${failures === 0 ? 'LIVE QA: ALL PASS' : `LIVE QA: ${failures} FAILURES`}`);
await browser.close();
process.exit(failures === 0 ? 0 : 1);