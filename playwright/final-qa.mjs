import { chromium } from 'playwright';

const ROUTES = [
  { path: '/', name: 'home' },
  { path: '/deals', name: 'deals' },
  { path: '/reviews', name: 'reviews' },
  { path: '/trial', name: 'trial' },
  { path: '/discord', name: 'discord' },
  { path: '/upgrade', name: 'upgrade' },
];

const VIEWPORTS = [
  { width: 1440, height: 900, name: 'desktop' },
  { width: 390, height: 844, name: 'mobile' },
];

const BASE_URL = 'http://localhost:4173';

async function checkRoute(page, route, viewport) {
  const url = `${BASE_URL}${route.path}`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);
  
  const screenshotPath = `qa-final-${route.name}-${viewport.name}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });
  
  // Check for key visual elements
  const checks = {
    hasHero: await page.$('h1') !== null,
    hasButtons: await page.$('a.btn, button.btn') !== null,
    hasCards: await page.$('.card') !== null,
    hasNavbar: await page.$('nav') !== null,
    noOverflow: await page.evaluate(() => document.body.scrollWidth <= window.innerWidth),
  };
  
  console.log(`✓ ${route.name} (${viewport.name}): Hero: ${checks.hasHero} | Buttons: ${checks.hasButtons} | Cards: ${checks.hasCards} | Navbar: ${checks.hasNavbar} | NoOverflow: ${checks.noOverflow}`);
  
  return checks;
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
  console.log('\n=== FINAL QA COMPLETE ===');
}

main().catch(console.error);