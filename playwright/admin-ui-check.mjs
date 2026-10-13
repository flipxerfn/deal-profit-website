// Admin UI: sign in through the form, open the Reviews tab, verify pending reviews render.
import { chromium } from 'playwright';

// Credentials come from the environment, never from this file.
//
// The password used to be written in here in plain text, which put a live admin
// credential in the repository and in its history. Any script that signs in must
// read it from the environment instead:
//
//   ADMIN_PASSWORD='...' node playwright/admin-ui-check.mjs
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
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('401')) errors.push(m.text().slice(0, 300));
});
await page.goto('http://localhost:8787/admin', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(600);

// sign in
await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
const userInput = page.locator('input[type="text"], input:not([type="password"])').first();
const lbl = await userInput.getAttribute('aria-label').catch(() => null);
if (lbl) await userInput.fill(ADMIN_USERNAME);
else await userInput.fill(ADMIN_USERNAME);
await page.locator('button', { hasText: 'Sign in' }).first().click();
await page.waitForTimeout(1500);

const bodyText = await page.evaluate(() => document.body.innerText);
const hasDashboard = bodyText.includes('Dashboard') || bodyText.includes('Reviews') || bodyText.includes('Sign out');
console.log('after login hasDashboard-ish:', hasDashboard);

// click Reviews tab if present
const revTab = page.locator('[role="tab"], button', { hasText: /^\s*Reviews\s*$/i }).first();
if (await revTab.count()) {
  await revTab.click();
  await page.waitForTimeout(1200);
}
const revText = await page.evaluate(() => document.body.innerText.slice(0, 1500));
const showsPendingQA = /QA desktop|QA mobile|Valid Tester|Test User/.test(revText);
console.log(JSON.stringify({ hasDashboard, showsPendingQA, bodyHead: bodyText.slice(0, 140), pageErrors: errors, reviewsSectionSample: revText.slice(0, 500) }, null, 2));
await browser.close();