const { test, expect } = require('playwright');
const path = require('path');

test('verify production serves new build', async () => {
  // Use chromium launched by Playwright
  const browser = await test.playwright.chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // 1. Open https://goosiev.com with cache disabled
  await page.goto('https://goosiev.com', { waitUntil: 'networkidle' });
  
  // 2. Take screenshot
  await page.screenshot({ path: 'qa-desktop-home.png', fullPage: true });
  
  // 3. Print page title and visible navbar text
  const title = page.title();
  console.log('Page title:', title);
  
  // Find navbar text
  const navbarText = page.locator('text=Deal Profit').first();
  await expect(navbarText).toBeVisible();
  console.log('Navbar visible');
  
  // 4. Navigate to /reviews
  await page.goto('https://goosiev.com/reviews', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'qa-desktop-reviews.png', fullPage: true });
  console.log('/reviews title:', page.title());
  
  // 5. Navigate to /upgrade
  await page.goto('https://goosiev.com/upgrade', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'qa-desktop-upgrade.png', fullPage: true });
  console.log('/upgrade title:', page.title());
  
  // 6. Search loaded page for new Whop URL
  const pageContent = page.content();
  const hasNewWhop = pageContent.includes('whop.com/deal-profit-6dcc/price-error-66');
  const hasOldWhop = pageContent.includes('whop.com/deals-profit/deal-profit-price-errors-deals') || pageContent.includes('whop.com/deal-profit/deal-profit-01/');
  const hasReviews = page.locator('text=Reviews').count() > 0;
  const hasUpgrade = page.locator('text=Upgrade').count() > 0;
  
  console.log('Has new Whop URL:', hasNewWhop);
  console.log('Has old Whop URL:', hasOldWhop);
  console.log('Has /reviews link/content:', hasReviews);
  console.log('Has /upgrade link/content:', hasUpgrade);
  
  // 7. Check for /reviews and /upgrade navigation
  const navLinks = page.locator('text=Reviews, text=Upgrade');
  await expect(navLinks).toBeVisible();
  
  // 8. Fail if new Whop URL not found
  if (!hasNewWhop) {
    console.error('FAIL: New Whop URL NOT found in production page!');
    process.exit(1);
  }
  if (hasOldWhop) {
    console.error('FAIL: OLD Whop URL still present in production page!');
    process.exit(1);
  }
  
  console.log('PASS: Production serves new build correctly');
  
  await browser.close();
});