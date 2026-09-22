import { chromium } from 'playwright';

const browser = await chromium.launch();
const results = [];
const errors = [];

for (const viewport of [
  { width: 1440, height: 900, name: '1440' },
  { width: 1280, height: 800, name: '1280' },
  { width: 1024, height: 768, name: '1024' },
  { width: 390, height: 844, name: '390' },
]) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const h1 = document.querySelector('#hero-title');
    const hero = document.querySelector('[aria-labelledby="hero-title"]');
    const how = document.querySelector('[aria-labelledby="how-title"]');
    const heroCard = document.querySelector('[aria-labelledby="hero-title"] .rounded-2xl.border');
    // Hero card must not overlap the How-It-Works section
    let cardBottom = 0;
    let howTop = Infinity;
    let importedPresence = false;
    if (heroCard) cardBottom = heroCard.getBoundingClientRect().bottom + window.scrollY;
    if (how) howTop = how.getBoundingClientRect().top + window.scrollY;
    // check buttons not wrapped
    const wrapped = [];
    document.querySelectorAll('a.btn, button.btn').forEach((b) => {
      const r = b.getBoundingClientRect();
      const style = getComputedStyle(b);
      const lh = parseFloat(style.lineHeight) || 20;
      if (b.textContent.trim() && r.height > lh * 1.7) wrapped.push(b.textContent.trim().slice(0, 40));
    });
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      h1: h1?.textContent.trim().slice(0, 60),
      cardBottom: Math.round(cardBottom),
      howTop: Math.round(howTop),
      overflow: doc.scrollWidth > doc.clientWidth,
      wrappedButtons: wrapped,
      tickerCount: document.querySelectorAll('[aria-labelledby="hero-title"] .space-y-1\\.5 > div').length,
      howCards: document.querySelectorAll('[aria-labelledby="how-title"] .card').length,
      statCards: document.querySelectorAll('[aria-labelledby="social-title"] .card').length,
    };
  });

  metrics.wrappedButtonsReport = metrics.wrappedButtons;
  delete metrics.wrappedButtons;
  metrics.consoleErrors = consoleErrors.length;
  results.push({ viewport: viewport.name, ...metrics });
  await ctx.close();
}

console.log(JSON.stringify(results, null, 2));
await browser.close();