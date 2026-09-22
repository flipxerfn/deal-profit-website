import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
const r = await page.evaluate(() => {
  const im = document.querySelector('main section img');
  const cs = im ? getComputedStyle(im) : null;
  return {
    src: im ? im.src.slice(-40) : 'none',
    complete: im ? im.complete : null,
    naturalWH: im ? `${im.naturalWidth}x${im.naturalHeight}` : null,
    loaded: im ? im.currentSrc : null,
    brightness: cs ? cs.filter : null,
  };
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
