import { chromium } from 'playwright';

const OUT = [];
const log = (...a) => OUT.push(a.join(' '));

const browser = await chromium.launch();

const viewports = [
  { w: 1440, h: 900, n: 'd1440' },
  { w: 1024, h: 768, n: 't1024' },
  { w: 390, h: 844, n: 'm390' },
];
const routes = ['/', '/deals', '/reviews', '/upgrade', '/trial', '/discord'];

for (const vp of viewports) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
  const page = await ctx.newPage();
  for (const route of routes) {
    await page.goto(`http://localhost:5173${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // 1. Buttons that wrapped to multiple lines
    const wrappedButtons = await page.evaluate(() => {
      const issues = [];
      document.querySelectorAll('a.btn, button.btn, a[class*="rounded-lg"]').forEach((el) => {
        const r = el.getBoundingClientRect();
        const lines = Math.round(r.height / parseFloat(getComputedStyle(el).lineHeight || '16'));
        if (lines > 1.3) issues.push({ tag: el.tagName, text: (el.textContent || '').trim().slice(0, 40), h: r.height, lh: getComputedStyle(el).lineHeight });
      });
      return issues;
    });
    if (wrappedButtons.length) {
      log(`\n[${route} ${vp.n}] BUTTON WRAP ISSUES:`);
      wrappedButtons.forEach((b) => log(`   ${b.tag} "${b.text}" h=${b.h} lh=${b.lh}`));
    }

    // 2. Text elements out of recommended range
    const tinyText = await page.evaluate(() => {
      const issues = [];
      document.querySelectorAll('p, span, a, h1, h2, h3, h4, button').forEach((el) => {
        const st = getComputedStyle(el);
        const fs = parseFloat(st.fontSize);
        if (fs > 0 && fs < 11 && el.textContent.trim().length > 2) {
          issues.push(`${el.tagName} ${fs}px "${el.textContent.trim().slice(0, 30)}"`);
        }
      });
      return [...new Set(issues)].slice(0, 8);
    });
    if (tinyText.length) log(`\n[${route} ${vp.n}] TINY TEXT (<11px):`, tinyText.join(' | '));

    // 3. Any element sticking off viewport
    const offscreen = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const issues = [];
      document.querySelectorAll('body *').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && (r.right > vw + 1 || r.left < -1)) issues.push(`${el.tagName}.${[...el.classList].join('.')}`);
      });
      return [...new Set(issues)].slice(0, 10);
    });
    if (offscreen.length) log(`\n[${route} ${vp.n}] OFFSCREEN ELEMENTS:`, offscreen.join(' | '));

    // 4. Hero headline size
    if (route === '/') {
      const hero = await page.evaluate(() => {
        const h1 = document.querySelector('#hero-title');
        return h1 ? { fs: getComputedStyle(h1).fontSize, lh: getComputedStyle(h1).lineHeight, w: h1.clientWidth } : null;
      });
      log(`[hero ${vp.n}] h1 fs=${hero?.fs} lh=${hero?.lh} w=${hero?.w}`);
    }
  }
  await ctx.close();
}

// 5. Section vertical rhythm on home (desktop)
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const sections = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('section').forEach((s, i) => {
      const r = s.getBoundingClientRect();
      out.push({ i, top: Math.round(r.top), h: Math.round(r.height) });
    });
    return out;
  });
  log('\n[home d1440] section positions (relative to viewport):');
  sections.forEach((s) => log(`   section ${s.i}: top=${s.top} (y + h = ${s.top + s.h})`));
  await ctx.close();
}

// 6. Navbar: is CTA visible and not wrapped at lg; hamburger only below lg?
{
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  const nav = await page.evaluate(() => {
    const links = [...document.querySelectorAll('header nav a')].map((a) => ({ text: a.textContent.trim(), w: Math.round(a.getBoundingClientRect().width) }));
    const burger = document.querySelector('header button[aria-label*="menu"], header button[aria-label*="Menu"]');
    return { links, burgerVisible: burger ? burger.getBoundingClientRect().width > 0 : false };
  });
  log(`\n[navbar t1024] links:`, nav.links.map((l) => `${l.text}(${l.w}px)`).join(' '), `burger=${nav.burgerVisible}`);
  await ctx.close();
}

// 7. Home hero overlap check: deal card vs CTA section vs trust items
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  // scroll to hero card bottom
  const overlap = await page.evaluate(() => {
    const find = (sel) => {
      const el = document.querySelector(sel);
      return el ? el.getBoundingClientRect() : null;
    };
    return {
      heroCard: find('section[aria-labelledby="hero-title"] .rounded-2xl') && (() => { const r = find('section[aria-labelledby="hero-title"] .rounded-2xl > div.rounded-2xl') || find('section[aria-labelledby="hero-title"] .rounded-2xl'); return r; })(),
      huntSection: find('section[aria-labelledby="hunt-title"]'),
      ctaSectionLast: find('section[aria-labelledby="social-title"]'),
    };
  });
  log(`\n[home d1440] hero card bottom:`, overlap.heroCard ? Math.round(overlap.heroCard.bottom) : 'n/a', ` hunt top:`, overlap.huntSection ? Math.round(overlap.huntSection.top) : 'n/a');
  await ctx.close();
}

await browser.close();
console.log(OUT.join('\n'));
console.log('\nAUDIT COMPLETE');