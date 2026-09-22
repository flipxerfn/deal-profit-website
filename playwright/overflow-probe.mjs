import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

const report = await page.evaluate(() => {
  const doc = document.documentElement;
  const overflowers = [];
  const cw = doc.clientWidth;
  document.querySelectorAll('body *').forEach((el) => {
    const r = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    const isDecor = style.position === 'absolute' && (style.pointerEvents === 'none' || el.closest('[aria-hidden="true"]'));
    if (r.width > 0 && (r.right > cw + 0.5 || r.left < -0.5)) {
      overflowers.push({
        tag: el.tagName,
        cls: String(el.className).slice(0, 70),
        right: Math.round(r.right),
        left: Math.round(r.left),
        decor: isDecor,
        ariaHidden: !!el.closest('[aria-hidden="true"]'),
        text: el.textContent.trim().slice(0, 30),
      });
    }
  });

  // True button-wrap detection: measure the rendered text height vs line-height
  const wraps = [];
  document.querySelectorAll('a.btn, button.btn, a.btn-outline, a.btn-primary').forEach((b) => {
    const range = document.createRange();
    let textHeight = 0;
    const walker = document.createTreeWalker(b, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) });
    const rects = [];
    let node;
    while ((node = walker.nextNode())) {
      range.selectNodeContents(node);
      const r = range.getBoundingClientRect();
      if (r.height > 0) rects.push(r);
    }
    if (rects.length) {
      textHeight = Math.max(...rects.map((r) => r.height));
    }
    const lh = parseFloat(getComputedStyle(b).lineHeight) || 16;
    if (textHeight > lh * 1.4) {
      wraps.push({ text: b.textContent.trim().slice(0, 40), textHeight: Math.round(textHeight), lh: Math.round(lh) });
    }
  });

  return { cw, overflowers, wraps };
});

console.log(JSON.stringify(report, null, 2));
await browser.close();