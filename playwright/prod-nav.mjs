import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('https://goosiev.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(4000);
const nav = await page.evaluate(() => {
  const nav = document.querySelector('header nav, nav');
  const links = nav ? [...nav.querySelectorAll('a')].map(a => a.textContent.trim() + '->' + a.getAttribute('href')) : [];
  return links;
});
console.log('NAV LINKS:', JSON.stringify(nav, null, 2));
const bodyText = await page.evaluate(() => document.body.innerText);
console.log('FULL BODY (first 2500):\n', bodyText.slice(0, 2500));
await browser.close();