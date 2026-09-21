// Homepage layout diagnosis: hero clipping, button overflow, navbar fit.
// Captures screenshots + numeric geometry at the 4 required viewports.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173';
const VIEWPORTS = [
  { width: 1440, height: 900, name: '1440x900' },
  { width: 1280, height: 800, name: '1280x800' },
  { width: 390, height: 844, name: '390x844' },
];
// 390 already covers mobile; keep the four asked (1440,1280,390) + explicit 1024 not requested here
const ROUTES = ['/', '/deals', '/reviews', '/upgrade'];

mkdirSync('/tmp/opencode/home-diag', { recursive: true });
const browser = await chromium.launch();
const report = [];

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));

  for (const route of ROUTES) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(900); // let framer-motion settle

    const slug = route === '/' ? 'home' : route.slice(1);
    await page.screenshot({ path: `/tmp/opencode/home-diag/${vp.name}-${slug}.png` });

    const metrics = await page.evaluate((route) => {
      const de = document.documentElement;
      const overflowX = de.scrollWidth - de.clientWidth;
      const vw = de.clientWidth;
      const vh = de.clientHeight;

      const rect = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          x: Math.round(r.x), y: Math.round(r.y),
          w: Math.round(r.width), h: Math.round(r.height),
          right: Math.round(r.right), bottom: Math.round(r.bottom),
          scrollW: el.scrollWidth, scrollH: el.scrollHeight,
          textOverflowing: el.scrollWidth > el.clientWidth + 1,
        };
      };

      // Hero section = first <section> on home
      const hero = route === '/' ? document.querySelector('section') : null;
      const h1 = document.querySelector('h1');
      // CTA buttons: any element with .btn or buttonClass output
      const ctas = [...document.querySelectorAll('a.btn, button.btn, a[class*="inline-flex"], a[class*="rounded-lg"]')]
        .filter((el) => /Explore Deals|Start Free Trial|Upgrade to Premium|Browse Deals|Join/.test(el.textContent))
        .slice(0, 4)
        .map((el) => ({ tag: el.tagName, text: el.textContent.trim().slice(0, 30), ...rect(el) }));

      // Does the whole hero fit on load? (last element inside hero bottom vs viewport)
      let heroBottom = null;
      if (hero) {
        const last = hero.lastElementChild?.getBoundingClientRect();
        heroBottom = Math.round(last ? last.bottom : hero.getBoundingClientRect().bottom);
      }

      // Navbar
      const nav = document.querySelector('nav');
      const trial = [...document.querySelectorAll('a')].find((a) => a.textContent.trim() === 'Start Free Trial' && a.offsetParent !== null);
      const navRect = nav ? rect(nav) : null;

      // Elements sticking out of viewport on the right
      const overflowEls = [...document.querySelectorAll('body *')]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && (r.right > vw + 1 || r.left < -1);
        })
        .slice(0, 8)
        .map((el) => ({
          cls: (el.className || '').toString().slice(0, 60),
          tag: el.tagName,
          left: Math.round(el.getBoundingClientRect().left),
          right: Math.round(el.getBoundingClientRect().right),
        }));

      return {
        overflowX,
        viewport: { vw, vh },
        h1: rect(h1),
        heroBottom,
        ctas,
        nav: navRect,
        trialBtn: rect(trial),
        overflowEls,
      };
    }, route);

    report.push({ route, viewport: vp.name, pageErrors, ...metrics });
  }
  await context.close();
}

console.log(JSON.stringify(report, null, 2));
await browser.close();