// Verify live Whop link swap: new URL present, old URLs absent, no page errors.
import { chromium } from 'playwright';

const NEW_URL = 'https://whop.com/deal-profit-6dcc/price-error-66';
const OLD_1 = 'whop.com/deal-profit/deal-profit-01';
const OLD_2 = 'whop.com/deals-profit/deal-profit-price-errors-deals';

const browser = await chromium.launch();
const results = [];
let failures = 0;

for (const route of ['/', '/deals', '/reviews', '/upgrade', '/trial', '/discord']) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
  await page.goto(`https://goosiev.com${route}`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(600);

  const r = await page.evaluate(([newUrl, old1, old2]) => {
    const html = document.body.innerHTML;
    const anchors = [...document.querySelectorAll('a')].map((a) => a.href);
    const newCount = anchors.filter((h) => h.startsWith(newUrl)).length;
    return {
      hasNew: html.includes(newUrl),
      newHrefs: newCount,
      hasOld1: html.includes(old1),
      hasOld2: html.includes(old2),
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  }, [NEW_URL, OLD_1, OLD_2]);

  const pass = r.hasNew && !r.hasOld1 && !r.hasOld2 && errors.length === 0;
  if (!pass) failures++;
  results.push({ route, ...r, pass, errors });
  await ctx.close();
}

for (const r of results) {
  console.log(
    `  ${r.pass ? 'PASS' : 'FAIL'} ${r.route.padEnd(9)} newLink=${r.hasNew} newHrefs=${r.newHrefs} ` +
    `oldLink1=${r.hasOld1} oldLink2=${r.hasOld2} overflow=${r.overflowX} pageErrors=${r.errors.length}`
  );
}
console.log(`\n${failures === 0 ? 'LIVE WHOP LINK SWAP: ALL PASS' : `FAILURES: ${failures}`}`);
await browser.close();
process.exit(failures === 0 ? 0 : 1);