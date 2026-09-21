// Deep layout audit: hero internals, CTA inline alignment, nav fit sweep.
import { chromium } from 'playwright';

const BASE = 'http://localhost:4173';
const browser = await chromium.launch();
const report = { hero: {}, ctas: {}, navSweep: [] };

// ---- 1. HERO INTERNALS (home) at 1440x900 and 390x844
for (const [label, w, h] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);

  const hero = await page.evaluate(() => {
    const section = document.querySelector('section');
    const sr = section.getBoundingClientRect();
    const out = {
      heroTop: Math.round(sr.top), heroBottom: Math.round(sr.bottom),
      items: [], clips: [], negMargins: [],
    };
    // walk first-level children for key visual groups
    const selectors = {
      badges: 'section .badge',
      h1: 'section h1',
      heroP: 'section p:nth-of-type(1)',
      ctas: 'section a[class*="inline-flex"]',
      trust: 'section .mt-10',
      imageCard: 'section img',
    };
    for (const [name, sel] of Object.entries(selectors)) {
      const el = document.querySelector(sel);
      if (!el) { out.items.push({ name, missing: true }); continue; }
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      out.items.push({
        name,
        x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
        right: Math.round(r.right), bottom: Math.round(r.bottom),
        overflow: cs.overflow, pos: cs.position, ml: cs.marginLeft, mr: cs.marginRight,
        lineHeight: cs.lineHeight, fontSize: cs.fontSize,
      });
    }
    // any absolutely positioned elements inside hero that leave the hero box
    for (const el of section.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      if (cs.position === 'absolute') {
        const r = el.getBoundingClientRect();
        const cls = (el.className || '').toString().slice(0, 50);
        if (r.right > window.innerWidth + 1 || r.left < -1 || r.bottom < sr.top - 1 || r.top > sr.bottom + 1) {
          out.clips.push({ cls, tag: el.tagName, left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom) });
        }
      }
      if (cs.marginLeft.startsWith('-') || cs.marginRight.startsWith('-') || cs.marginTop.startsWith('-')) {
        out.negMargins.push({ cls: (el.className || '').toString().slice(0, 40), ml: cs.marginLeft, mt: cs.marginTop });
      }
    }
    return out;
  });
  report.hero[label] = hero;
  await ctx.close();
}

// ---- 2. CTA internals: icon/text alignment + padding
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  report.ctas = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('section a[class*="inline-flex"]')].slice(0, 2);
    return btns.map((btn) => {
      const r = btn.getBoundingClientRect();
      const cs = getComputedStyle(btn);
      const kids = [...btn.children].map((k) => {
        const kr = k.getBoundingClientRect();
        return {
          tag: k.tagName,
          isSvg: k.tagName === 'svg',
          x: Math.round(kr.x), y: Math.round(kr.y), w: Math.round(kr.width), h: Math.round(kr.height),
          cy: Math.round(kr.y + kr.height / 2),
        };
      });
      return {
        text: btn.textContent.trim(),
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        display: cs.display, alignItems: cs.alignItems, gap: cs.gap,
        padding: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
        radius: cs.borderRadius, shadow: cs.boxShadow.slice(0, 60),
        innerCenterY: Math.round(r.y + r.height / 2),
        kids,
      };
    });
  });
  await ctx.close();
}

// ---- 3. NAV sweep across widths
for (const width of [1440, 1280, 1152, 1024, 900, 820, 768, 767, 700, 640, 639, 560, 500, 390, 360]) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  const r = await page.evaluate((width) => {
    const de = document.documentElement;
    const nav = document.querySelector('nav');
    const nr = nav.getBoundingClientRect();
    const links = [...nav.querySelectorAll('a')];
    const trial = links.find((a) => a.textContent.trim() === 'Start Free Trial');
    const hamburger = [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Open menu');
    const linksVisible = [...nav.querySelectorAll('.nav-link')].filter((l) => l.offsetParent !== null).length;
    const trialVisible = !!trial && trial.offsetParent !== null;
    const hamVisible = !!hamburger && hamburger.offsetParent !== null;
    const tr = trial && trialVisible ? trial.getBoundingClientRect() : null;
    const trialClipped = tr ? (tr.right > width + 1 || tr.left < -1 || tr.width < 40) : null;
    // do link rects overlap the trial rect (cramming)?
    const linkRects = [...nav.querySelectorAll('.nav-link')].filter((l) => l.offsetParent !== null)
      .map((l) => l.getBoundingClientRect());
    const overlaps = tr ? linkRects.filter((lr) => lr.right > tr.left - 4 && lr.left < tr.right + 4).length : 0;
    return {
      width,
      overflowX: de.scrollWidth - de.clientWidth,
      navH: Math.round(nr.height),
      linksVisible, trialVisible, hamVisible,
      trialBtn: tr ? { l: Math.round(tr.left), r: Math.round(tr.right), w: Math.round(tr.width) } : null,
      trialClipped, overlaps,
    };
  }, width);
  report.navSweep.push(r);
  await ctx.close();
}

console.log(JSON.stringify(report, null, 2));
await browser.close();