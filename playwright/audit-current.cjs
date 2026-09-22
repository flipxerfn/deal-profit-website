const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROUTES = [
  { path: '/', name: 'home' },
  { path: '/deals', name: 'deals' },
  { path: '/reviews', name: 'reviews' },
  { path: '/trial', name: 'trial' },
  { path: '/discord', name: 'discord' },
  { path: '/upgrade', name: 'upgrade' },
  { path: '/admin', name: 'admin' },
];

const VIEWPORTS = [
  { width: 1440, height: 900, name: 'desktop' },
  { width: 390, height: 844, name: 'mobile' },
];

const BASE_URL = 'http://localhost:4173';

async function captureRoute(page, route, viewport) {
  const url = `${BASE_URL}${route.path}`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  
  // Wait for content to render
  await page.waitForTimeout(1000);
  
  const screenshotPath = `qa-baseline-${route.name}-${viewport.name}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });
  
  // Get title and check for key elements
  const title = await page.title();
  const hasWhopNew = await page.evaluate(() => 
    document.body.innerHTML.includes('whop.com/deal-profit-6dcc?a=phillipkuz9')
  );
  const hasWhopOld = await page.evaluate(() => 
    document.body.innerHTML.includes('whop.com/deals-profit/deal-profit-price-errors-deals') || document.body.innerHTML.includes('whop.com/deal-profit/deal-profit-01/')
  );
  
  // Check for horizontal overflow
  const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
  
  // Check navbar links
  const navLinks = await page.$$eval('nav a, nav button', els => 
    els.map(el => el.textContent?.trim()).filter(Boolean)
  );
  
  console.log(`✓ ${route.name} (${viewport.name}): "${title}" | New Whop: ${hasWhopNew} | Old Whop: ${hasWhopOld} | Overflow: ${overflow}`);
  console.log(`  Nav: ${navLinks.join(' | ')}`);
  
  return { title, hasWhopNew, hasWhopOld, overflow, navLinks };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  
  for (const viewport of VIEWPORTS) {
    console.log(`\n=== ${viewport.name.toUpperCase()} (${viewport.width}x${viewport.height}) ===`);
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    
    for (const route of ROUTES) {
      try {
        await captureRoute(page, route, viewport);
      } catch (e) {
        console.error(`✗ ${route.name} (${viewport.name}): ${e.message}`);
      }
    }
    
    await context.close();
  }
  
  await browser.close();
  console.log('\n=== BASELINE CAPTURE COMPLETE ===');
}

main().catch(console.error);