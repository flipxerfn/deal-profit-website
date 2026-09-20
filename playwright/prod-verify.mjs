import { chromium } from 'playwright';

const ROUTES = [
  { path: '/', name: 'home' },
  { path: '/reviews', name: 'reviews' },
  { path: '/upgrade', name: 'upgrade' },
];

const VIEWPORTS = [
  { width: 1440, height: 900, name: 'desktop' },
  { width: 390, height: 844, name: 'mobile' },
];

const BASE_URL = 'https://goosiev.com';

async function checkRoute(page, route, viewport) {
  const url = `${BASE_URL}${route.path}`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);
  
  const screenshotPath = `qa-prod-${route.name}-${viewport.name}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });
  
  // Check for key visual elements
  const title = await page.title();
  const hasNewWhop = await page.evaluate(() => 
    document.body.innerHTML.includes('whop.com/deal-profit/deal-profit-01/')
  );
  const hasOldWhop = await page.evaluate(() => 
    document.body.innerHTML.includes('whop.com/deals-profit/deal-profit-price-errors-deals')
  );
  const hasHero = await page.$('h1') !== null;
  const hasButtons = await page.$('a.btn, button.btn') !== null;
  const hasCards = await page.$('.card, .card-hover') !== null;
  const hasNavbar = await page.$('nav') !== null;
  const noOverflow = await page.evaluate(() => document.body.scrollWidth <= window.innerWidth);
  
  // Check for specific content on each route
  let hasRouteContent = false;
  if (route.name === 'reviews') {
    hasRouteContent = await page.$('text=Reviews') !== null || await page.$('text=Review') !== null;
  } else if (route.name === 'upgrade') {
    hasRouteContent = await page.$('text=Premium') !== null || await page.$('text=Upgrade') !== null;
  }
  
  console.log(`✓ ${route.name} (${viewport.name}): "${title}" | New Whop: ${hasNewWhop} | Old Whop: ${hasOldWhop} | Hero: ${hasHero} | Buttons: ${hasButtons} | Cards: ${hasCards} | Navbar: ${hasNavbar} | Content: ${hasRouteContent} | NoOverflow: ${noOverflow}`);
  
  return { title, hasNewWhop, hasOldWhop, hasHero, hasButtons, hasCards, hasNavbar, hasRouteContent, noOverflow };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  
  for (const viewport of VIEWPORTS) {
    console.log(`\n=== ${viewport.name.toUpperCase()} (${viewport.width}x${viewport.height}) ===`);
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    
    for (const route of ROUTES) {
      try {
        await checkRoute(page, route, viewport);
      } catch (e) {
        console.error(`✗ ${route.name} (${viewport.name}): ${e.message}`);
      }
    }
    
    await context.close();
  }
  
  await browser.close();
  console.log('\n=== PRODUCTION VERIFICATION COMPLETE ===');
}

main().catch(console.error);