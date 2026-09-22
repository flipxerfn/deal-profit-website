import { chromium } from 'playwright';

const browser = await chromium.launch();
const out = {};
const ctx = await browser.newContext();
const page = await ctx.newPage();
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push(`PAGEERROR: ${e.message}`));

for (const [route, checks] of [
  ['/trial', [
    ['trialCopy', (t) => t.includes('Free to start') && t.includes('$25/month after')],
    ['includedItems', (t) => t.includes('Instant access to member deal channels') && t.includes('Cancel anytime during the trial')],
    ['whopCta', (t) => t.includes('Start Free Trial')],
  ]],
  ['/discord', [
    ['stats', (t) => t.includes('Members') && t.includes('Deals/Day')],
    ['avatarStack', (t) => t.includes('10,000+ deal hunters already in the')],
    ['blurple', (t) => t.includes('Join the Deal Profit Discord')],
  ]],
]) {
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(vp);
    await page.goto(`http://localhost:5173${route}`, { waitUntil: 'networkidle' });
    const text = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        body: document.body.textContent.replace(/\s+/g, ' '),
        overflow: doc.scrollWidth > doc.clientWidth,
        wrapped: [...document.querySelectorAll('a.btn')].some((b) => {
          const range = document.createRange();
          const walker = document.createTreeWalker(b, NodeFilter.SHOW_TEXT, { acceptNode: (n) => n.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
          let h = 0; let node;
          while ((node = walker.nextNode())) { range.selectNodeContents(node); h = Math.max(h, range.getBoundingClientRect().height); }
          const lh = parseFloat(getComputedStyle(b).lineHeight) || 16;
          return h > lh * 1.4;
        }),
      };
    });
    const result = {};
    for (const [name, fn] of checks) result[name] = fn(text.body);
    out[`${route}@${vp.width}`] = { ...result, overflow: text.overflow, wrapped: text.wrapped };
  }
}
out.consoleErrors = consoleErrors;
console.log(JSON.stringify(out, null, 2));
await browser.close();