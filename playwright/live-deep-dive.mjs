// Deep interactive QA on LIVE: deal cards, review form, upgrade sections, admin, discord.
import { chromium } from 'playwright';

const BASE = 'https://goosiev.com';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const pageErrors = [];
const consoleErrs = [];
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error') consoleErrs.push(m.text().slice(0, 200)); });

// ---------- DEALS ----------
await page.goto(`${BASE}/deals`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
const deals = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('a[href*="whop"], article, .card')]
    .filter((c) => c.offsetParent !== null && c.getBoundingClientRect().width > 200 && c.querySelector('img, h3, .text-lg'))
    .slice(0, 6)
    .map((c) => {
      const r = c.getBoundingClientRect();
      const title = c.querySelector('h3, .font-semibold, .font-bold, .line-clamp-2, p')?.textContent.trim().slice(0, 45) || '';
      const imgs = [...c.querySelectorAll('img')].map((im) => {
        const ir = im.getBoundingClientRect();
        return { w: Math.round(ir.width), h: Math.round(ir.height), objFit: getComputedStyle(im).objectFit, ratio: Math.round(ir.width / ir.height * 10) / 10 };
      });
      return { w: Math.round(r.width), h: Math.round(r.height), title, imgs };
    });
  const grid = document.querySelector('section .grid, main .grid');
  const gr = grid?.getBoundingClientRect();
  return { cardCount: cards.length, cards, gridW: gr ? Math.round(gr.width) : null, emptyState: document.body.innerText.includes('deal') && /no deal|unavailable|empty/i.test(document.body.innerText) };
});
console.log('DEALS:', JSON.stringify(deals, null, 1));

// ---------- REVIEWS form submit ----------
await page.goto(`${BASE}/reviews`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
const reviewBtns = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')].map((b) => ({
    txt: b.textContent.trim().slice(0, 25),
    w: Math.round(b.getBoundingClientRect().width),
    h: Math.round(b.getBoundingClientRect().height),
    bg: getComputedStyle(b).backgroundColor,
    border: getComputedStyle(b).borderTopWidth,
    visible: b.offsetParent !== null,
  }));
  return { buttons: btns.filter((b) => b.visible), cardCount: document.querySelectorAll('.card').length };
});
console.log('REVIEWS (init):', JSON.stringify(reviewBtns, null, 1));

// Open the form
const openBtns = page.locator('button', { hasText: /review/i });
const cnt = await openBtns.count();
if (cnt > 0) {
  await openBtns.first().click();
  await page.waitForTimeout(600);
  const form = await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('input, textarea, select')].map((i) => ({
      tag: i.tagName, name: i.name || i.placeholder, w: Math.round(i.getBoundingClientRect().width), visible: i.offsetParent !== null,
    }));
    const submit = [...document.querySelectorAll('button[type="submit"], button')].find((b) => b.offsetParent !== null && (b.textContent.includes('Submit') || b.textContent.includes('Post')));
    const sr = submit?.getBoundingClientRect();
    return {
      formVisible: !!document.querySelector('form'),
      inputs,
      submitBtn: submit ? { txt: submit.textContent.trim().slice(0, 20), w: Math.round(sr.width), h: Math.round(sr.height), bg: getComputedStyle(submit).backgroundColor, border: getComputedStyle(submit).borderTopWidth } : null,
    };
  });
  console.log('REVIEW FORM:', JSON.stringify(form, null, 1));
}

// ---------- UPGRADE ----------
await page.goto(`${BASE}/upgrade`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
const upgrade = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('.card')].filter((c) => c.offsetParent !== null).map((c) => {
    const r = c.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) };
  });
  const headings = [...document.querySelectorAll('h1,h2,h3')].map((h) => ({
    tag: h.tagName, txt: (h.textContent || '').trim().slice(0, 40),
    fs: getComputedStyle(h).fontSize, cls: (h.className || '').toString().slice(0, 50),
  }));
  const ctas = [...document.querySelectorAll('a[class*="inline-flex"], button[class*="inline-flex"]')].filter((a) => a.offsetParent !== null).map((a) => {
    const r = a.getBoundingClientRect();
    return { txt: a.textContent.trim().slice(0, 25), w: Math.round(r.width), h: Math.round(r.height), bg: getComputedStyle(a).backgroundColor, border: getComputedStyle(a).borderTopWidth };
  }).slice(0, 6);
  return { headings: headings.filter((h) => h.txt), ctas, cards };
});
console.log('UPGRADE:', JSON.stringify(upgrade, null, 1));

// ---------- DISCORD ----------
await page.goto(`${BASE}/discord`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1600);
const discord = await page.evaluate(() => ({
  headings: [...document.querySelectorAll('h1,h2')].map((h) => h.textContent.trim().slice(0, 50)),
  configSections: document.body.innerText.includes('Bot Token') || document.body.innerText.includes('Category ID'),
}));
console.log('DISCORD:', JSON.stringify(discord, null, 1));

console.log('\nPAGE ERRORS:', pageErrors.length ? pageErrors : 'none');
console.log('CONSOLE ERRORS:', consoleErrs.length ? consoleErrs : 'none');

// ---------- ADMIN login ----------
await page.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
const adminInit = await page.evaluate(() => ({
  heading: document.querySelector('h1')?.textContent.trim().slice(0, 40) || '',
  hasLoginForm: !!document.querySelector('input[type="password"], input[type="text"]'),
  overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
}));
console.log('ADMIN (init):', JSON.stringify(adminInit, null, 1));

await browser.close();