// Full visual QA: all routes x viewports. Screenshots + console/network errors + layout metrics.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.QA_BASE || 'http://localhost:4173';
const ROUTES = ['/', '/deals', '/reviews', '/upgrade', '/trial', '/discord', '/admin'];
const VIEWPORTS = [
  { width: 1440, height: 900, name: '1440x900' },
  { width: 1280, height: 800, name: '1280x800' },
  { width: 1024, height: 768, name: '1024x768' },
  { width: 390, height: 844, name: '390x844' },
];

mkdirSync('/tmp/opencode/visual-qa', { recursive: true });
const browser = await chromium.launch();
const report = [];

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();
  const consoleErrs = [];
  const pageErrors = [];
  const httpErrs = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrs.push(m.text().slice(0, 160)); });
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));
  page.on('response', (r) => { if (r.status() >= 400) httpErrs.push(`${r.status()} ${r.url().slice(0, 100)}`); });
  page.on('requestfailed', (r) => httpErrs.push(`FAILED ${r.url().slice(0, 100)}`));

  for (const route of ROUTES) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1800);
    const slug = route === '/' ? 'home' : route.slice(1);
    await page.screenshot({ path: `/tmp/opencode/visual-qa/${vp.name}-${slug}.png` });
    await page.screenshot({ path: `/tmp/opencode/visual-qa/${vp.name}-${slug}-full.png`, fullPage: true });

    const m = await page.evaluate(() => {
      const de = document.documentElement;
      const overflowX = de.scrollWidth - de.clientWidth;
      const vw = de.clientWidth, vh = de.clientHeight;

      // 1. any element poking outside viewport horizontally or above the top
      const escapes = [...document.querySelectorAll('body *')]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 1 && (r.right > vw + 1 || r.left < -1);
        })
        .slice(0, 10)
        .map((el) => {
          const r = el.getBoundingClientRect();
          return { tag: el.tagName, cls: (el.className || '').toString().slice(0, 55), l: Math.round(r.left), r: Math.round(r.right) };
        });

      // 2. boxes where content overflows the box (text clipping / button wrap)
      const textOverflow = [...document.querySelectorAll('h1,h2,h3,p,a,button,span,li')]
        .filter((el) => {
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || el.offsetParent === null) return false;
          if (cs.overflow === 'hidden' || cs.overflowX === 'hidden' || cs.overflowX === 'clip') {
            return el.scrollWidth > el.clientWidth + 2 && el.scrollHeight > el.clientHeight + 2;
          }
          return false;
        })
        .slice(0, 10)
        .map((el) => ({
          tag: el.tagName,
          txt: el.textContent.trim().slice(0, 40),
          cls: (el.className || '').toString().slice(0, 50),
          cw: el.clientWidth, sw: el.scrollWidth, ch: el.clientHeight, sh: el.scrollHeight,
        }));

      // 3. buttons that may look like plain text (no bg + no border + no underline)
      const plainButtons = [...document.querySelectorAll('a,button')]
        .filter((el) => {
          if (el.offsetParent === null) return false;
          const cs = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          if (r.width < 40 || r.height < 24) return false; // link text, skip
          const hasBg = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.backgroundImage !== 'none';
          const hasBorder = cs.borderTopWidth !== '0px';
          const hasShadow = cs.boxShadow !== 'none';
          return !hasBg && !hasBorder && !hasShadow && /^(a|button)$/.test(el.tagName);
        })
        .slice(0, 8)
        .map((el) => ({ tag: el.tagName, txt: el.textContent.trim().slice(0, 30), cls: (el.className || '').toString().slice(0, 60) }));

      // 4. images escaping containers / distorted aspect
      const images = [...document.querySelectorAll('img')]
        .filter((im) => im.offsetParent !== null)
        .map((im) => {
          const r = im.getBoundingClientRect();
          const parent = im.parentElement?.getBoundingClientRect();
          return {
            src: (im.src || '').split('/').pop().slice(0, 30),
            w: Math.round(r.width), h: Math.round(r.height),
            escaped: parent ? r.right > parent.right + 2 || r.left < parent.left - 2 : false,
          };
        })
        .filter((x) => x.escaped);

      // 5. successive inline/block overlapping (crude: fixed-position elements inside normal flow)
      const dims = { vw, vh };
      return { overflowX, escapes, textOverflow, plainButtons, images, dims };
    });

    report.push({
      route, viewport: vp.name,
      consoleErrs: consoleErrs.splice(0), pageErrors: pageErrors.splice(0),
      httpErrs: httpErrs.splice(0), ...m,
    });
  }
  await context.close();
}

let fails = 0;
for (const r of report) {
  const problems =
    (r.overflowX !== 0 ? 1 : 0) + r.escapes.length + r.textOverflow.length +
    r.plainButtons.length + r.images.length + r.pageErrors.length + r.httpErrs.length;
  const ok = problems === 0;
  if (!ok) fails++;
  if (ok) {
    console.log(`  OK   ${r.route.padEnd(8)} ${r.viewport.padEnd(8)}`);
  } else {
    console.log(`  ISSUE ${r.route.padEnd(8)} ${r.viewport.padEnd(8)} overflow=${r.overflowX} escapes=${r.escapes.length} textClip=${r.textOverflow.length} plainBtns=${r.plainButtons.length} imgEsc=${r.images.length} pageErrs=${r.pageErrors.length} httpErrs=${r.httpErrs.length}`);
    for (const e of r.escapes) console.log(`       escape: ${e.tag} "${(e.cls || e.tag)}" l=${e.l} r=${e.r}`);
    for (const e of r.textOverflow) console.log(`       clip: ${e.tag} "${e.txt}" ${e.cls ? '[' + e.cls + ']' : ''} cw=${e.cw} sw=${e.sw} ch=${e.ch} sh=${e.sh}`);
    for (const e of r.plainButtons) console.log(`       plainBtn: ${e.tag} "${e.txt}"`);
    for (const e of r.pageErrors) console.log(`       pageError: ${e}`);
    for (const e of r.httpErrs) console.log(`       httpError: ${e}`);
  }
}
console.log(`\n${fails === 0 ? 'VISUAL QA: ALL 28 COMBOS CLEAN' : `VISUAL QA: ${fails} COMBO(S) WITH ISSUES`}`);
await browser.close();
process.exit(fails === 0 ? 0 : 1);