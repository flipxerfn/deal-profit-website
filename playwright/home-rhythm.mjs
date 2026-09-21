// Home page section/rhythm audit: exact boundaries, gaps, and per-section spacing.
import { chromium } from 'playwright';
const BASE = 'http://localhost:4173';
const browser = await chromium.launch();

for (const [label, w, h] of [['1440x900', 1440, 900], ['1280x800', 1280, 800], ['390x844', 390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const data = await page.evaluate(() => {
    const sections = [...document.querySelectorAll('section')].map((s, i) => {
      const r = s.getBoundingClientRect();
      const h = s.querySelector('h1, h2')?.getBoundingClientRect();
      return {
        i,
        top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height),
        heading: h ? { top: Math.round(h.top), text: s.querySelector('h1, h2').textContent.trim().slice(0, 40) } : null,
      };
    });
    // gaps between consecutive sections
    for (let i = 1; i < sections.length; i++) {
      sections[i - 1].gapToNext = sections[i].top - sections[i - 1].bottom;
    }
    return { viewport: { w: innerWidth, h: innerHeight }, sections };
  });
  console.log(`\n===== HOME @ ${label} =====`);
  for (const s of data.sections) {
    console.log(
      `  sec ${s.i}: y=${s.top}-${s.bottom} h=${s.height}` +
      (s.gapToNext != null ? ` gap→next=${s.gapToNext}` : '') +
      (s.heading ? ` | heading@${s.heading.top} ${s.heading.text}` : '')
    );
  }
  await ctx.close();
}
await browser.close();