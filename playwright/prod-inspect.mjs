import { chromium } from 'playwright';

const BASE_URL = 'https://goosiev.com';
const routes = ['/', '/reviews', '/upgrade'];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log(`[PAGEERR ${route}]`, e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log(`[CONSOLE ${route}]`, m.text()); });

for (const route of routes) {
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(4000);
  const info = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    const bodyText = document.body.innerText.slice(0, 500);
    const html = document.documentElement.outerHTML;
    return {
      hasRoot: !!document.getElementById('root'),
      h1: h1 ? h1.textContent.slice(0, 80) : null,
      hasExploreDeals: bodyText.includes('Explore Deals'),
      hasStartFreeTrial: html.includes('Start Free Trial'),
      hasCardClass: html.includes('card-hover') || html.includes('class="card'),
      hasNav: !!document.querySelector('nav'),
      styledCtas: [...document.querySelectorAll('a,button')].filter(el => {
        const c = el.className || '';
        return c.includes('inline-flex') && c.includes('bg-brand');
      }).length,
      bodyStart: bodyText.slice(0, 300),
      bundle: [...document.querySelectorAll('script[src]')].map(s => s.src.split('/').pop()).filter(s => s.includes('index')),
    };
  });
  console.log(`\n=== ${route} ===`);
  console.log(JSON.stringify(info, null, 2));
}
await browser.close();