// Production verification for the premium evolution.
// Fresh session (no storage) against the live Cloudflare deploy.
// Usage: node playwright/verify-prod-premium.mjs   (exit 0 on success)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const PROD = 'https://goosiev.com';
const POLL_MS = 20_000;
const POLL_LIMIT = 15; // up to 5 minutes
const MARKERS = ['Get Premium', 'Deals are not guaranteed'];

mkdirSync(new URL('./.qa', import.meta.url), { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); // fresh — no storage
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));

const failures = [];
const screenshots = [];

// ---- 1. Poll for the new build ----
let deployed = false;
for (let i = 0; i < POLL_LIMIT; i++) {
  try {
    await page.goto(`${PROD}/`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2500); // let fonts + JS paint
    const hit = await page.evaluate((mk) => {
      const text = document.body.textContent.replace(/\s+/g, ' ');
      const fonts = [...document.fonts].map((f) => `${f.family} ${f.weight}`).join(',');
      return {
        markers: mk.filter((m) => text.includes(m)),
        fonts: document.fonts.size,
        spaceGrotesk: /Space Grotesk/.test(fonts),
        hasH1: !!document.querySelector('h1'),
        bodySnippet: text.slice(0, 120),
      };
    }, MARKERS);
    if (hit.hasH1 && hit.markers.length === MARKERS.length && hit.spaceGrotesk) {
      deployed = true;
      console.log(`[deploy] new build live after ${(i + 1) * (POLL_MS / 1000)}s`);
      break;
    }
    console.log(`[poll ${i + 1}] waiting for new build… (markers ${hit.markers.length}/${MARKERS.length}, fonts ${hit.fonts})`);
  } catch (e) {
    console.log(`[poll ${i + 1}] ${e.message.split('\n')[0]}`);
  }
  await page.waitForTimeout(POLL_MS);
}

if (!deployed) {
  failures.push('new build marker not found on goosiev.com within 5 minutes');
} else {
  // ---- 2. Home ----
  const home = await page.evaluate(() => ({
    h1: document.querySelector('h1')?.textContent.trim().slice(0, 60),
    hero: document.body.textContent.replace(/\s+/g, ' ').includes('Catch the deals'),
    getPremium: document.body.textContent.includes('Get Premium'),
    disclaimer: document.body.textContent.includes('Deals are not guaranteed'),
    whop: [...document.querySelectorAll('a[href*="whop.com/deal-profit-6dcc?a=phillipkuz9"]')].length,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));
  await page.screenshot({ path: new URL('./.qa/prod-home.png', import.meta.url).pathname, fullPage: true });
  screenshots.push('prod-home.png');
  if (!home.h1 || !home.hero) failures.push('home: expected hero content missing');
  if (!home.getPremium || !home.disclaimer) failures.push('home: new-build markers missing');
  if (home.whop < 1) failures.push('home: no Whop CTA found');
  if (home.overflow) failures.push('home: horizontal scroll on prod');
  console.log('[home]', JSON.stringify(home));

  // ---- 3. /deals ----
  await page.goto(`${PROD}/deals`, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForTimeout(800);
  const deals = await page.evaluate(() => ({
    h1: document.querySelector('h1')?.textContent.trim().slice(0, 60) || '(no h1)',
    feedText: document.body.textContent.includes('Showing'),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));
  await page.screenshot({ path: new URL('./.qa/prod-deals.png', import.meta.url).pathname, fullPage: true });
  screenshots.push('prod-deals.png');
  if (!deals.h1 || deals.h1 === '(no h1)') failures.push('deals: no h1 rendered');
  if (deals.overflow) failures.push('deals: horizontal scroll on prod');
  console.log('[deals]', JSON.stringify(deals));

  // ---- 4. /reviews ----
  await page.goto(`${PROD}/reviews`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForTimeout(2500); // let the /api/reviews fetch resolve
  const reviews = await page.evaluate(() => ({
    h1: document.querySelector('h1')?.textContent.trim().slice(0, 60) || '(no h1)',
    leaveReview: document.body.textContent.includes('Leave a review'),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));
  await page.screenshot({ path: new URL('./.qa/prod-reviews.png', import.meta.url).pathname, fullPage: true });
  screenshots.push('prod-reviews.png');
  if (!reviews.h1 || reviews.h1 === '(no h1)') failures.push('reviews: no h1 rendered');
  if (!reviews.leaveReview) failures.push('reviews: submit form section missing');
  if (reviews.overflow) failures.push('reviews: horizontal scroll on prod');
  console.log('[reviews]', JSON.stringify(reviews));
}

await ctx.close();
await browser.close();

const report = { url: PROD, deployed, screenshots, failures, passed: failures.length === 0 };
console.log(JSON.stringify(report, null, 2));
process.exit(failures.length ? 1 : 0);