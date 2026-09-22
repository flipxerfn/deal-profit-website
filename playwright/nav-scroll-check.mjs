import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));

// Scroll down on home, then navigate — scroll must reset to 0
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.evaluate(() => window.scrollTo(0, 600));
await page.waitForTimeout(300);
const scrolledBefore = await page.evaluate(() => window.scrollY);
await page.click('a[href="/deals"]');
await page.waitForTimeout(600);
const scrolledAfter = await page.evaluate(() => window.scrollY);

// Navbar checks
const nav = await page.evaluate(() => {
  const cta = [...document.querySelectorAll('header nav a')].find((a) => a.textContent.includes('Get Premium'));
  const links = [...document.querySelectorAll('header nav a')].filter((a) => a.closest('nav.lg\\:flex, nav') && a.textContent.trim());
  return {
    ctaText: cta?.textContent.trim(),
    ctaHref: cta?.getAttribute('href'),
    hasHairline: !!document.querySelector('header .hairline-gradient'),
    linkCount: links.length,
  };
});

// Mobile menu check
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mpage = await mctx.newPage();
await mpage.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await mpage.click('header button[aria-label="Open menu"]');
await mpage.waitForTimeout(400);
const mobile = await mpage.evaluate(() => ({
  menuVisible: !!document.querySelector('header nav a[href="/deals"]'),
  ctaText: [...document.querySelectorAll('header a')].find((a) => a.textContent.includes('Get Premium'))?.textContent.trim(),
}));

console.log(JSON.stringify({ scrolledBefore, scrolledAfter, nav, mobile, errors }, null, 2));
await browser.close();