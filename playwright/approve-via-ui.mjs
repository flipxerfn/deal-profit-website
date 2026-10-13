// Approve a pending review via the admin UI, then confirm it shows on /reviews.
import { chromium } from 'playwright';

// Credentials come from the environment, never from this file.
//
// The password used to be written in here in plain text, which put a live admin
// credential in the repository and in its history. Any script that signs in must
// read it from the environment instead:
//
//   ADMIN_PASSWORD='...' node playwright/approve-via-ui.mjs
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'goosievv';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  console.error('Set ADMIN_PASSWORD in the environment first — it is not stored in the repo.');
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));

await page.goto('http://localhost:8787/admin', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(600);
await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
const userInput = page.locator('input:not([type="password"])').first();
await userInput.fill(ADMIN_USERNAME);
await page.locator('button', { hasText: 'Sign in' }).first().click();
await page.waitForTimeout(1200);

// Reviews tab + approve the first QA review
await page.locator('[role="tab"], button', { hasText: /^\s*Reviews\s*$/i }).first().click();
await page.waitForTimeout(800);
const approveBtn = page.locator('button', { hasText: 'Approve' }).first();
const target = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('div')].filter((d) => /QA desktop|QA mobile/.test(d.textContent || ''));
  return cards.length ? (cards[0].textContent || '').slice(0, 60) : 'none';
});
await approveBtn.click();
await page.waitForTimeout(1200);

// go to /reviews and confirm an approved QA review is visible
await page.goto('http://localhost:8787/reviews', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(800);
const visible = await page.evaluate(() => /QA desktop|QA mobile/.test(document.body.innerText));
console.log(JSON.stringify({ approvedTarget: target, visiblePublicly: visible, pageErrors: errors }, null, 2));
await browser.close();
process.exit(visible && errors.length === 0 ? 0 : 1);