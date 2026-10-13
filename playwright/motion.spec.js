import { test, expect } from '@playwright/test';

/**
 * SCROLL-TRIGGERED MOTION
 *
 * The defect this file exists for: sections on /deals, /upgrade,
 * /setup-request and /discord animated with framer-motion's `animate:` variant,
 * which fires ON MOUNT. A grid four screens down played its entire cascade
 * while the reader was still on the hero, so by the time they scrolled to it
 * the motion had already finished and the page read as static.
 *
 * Two things therefore have to be true, and both are asserted here:
 *
 *   1. There IS pending motion below the fold — elements sitting at partial
 *      opacity or an offset transform, waiting for the viewport. If a page
 *      animates everything on mount, that count is zero and the motion is
 *      invisible to the person it was written for.
 *   2. Nothing stays hidden. That is the real risk of scroll-revealed content:
 *      an element whose trigger never fires is invisible content, which is
 *      worse than no animation at all.
 *
 * WHY THESE ASSERTIONS WAIT INSTEAD OF SAMPLING
 * ---------------------------------------------
 * This machine renders well under 1fps (measured elsewhere in this repo), so a
 * fixed 1.2s sample caught correct animations mid-flight and reported them as
 * broken. Every check below therefore waits for a state with a generous
 * window. A page that never resolves still fails — on the thing that actually
 * matters, content that stays invisible — rather than on frame rate.
 *
 * NOTE ON THE SCAN: it looks only at elements framer-motion is driving, which
 * it marks with an INLINE opacity or transform. Decorative CSS animations (the
 * drifting hero field, the rotating premium ring, the film grain) never write
 * inline styles, so they are ignored — otherwise a permanently rotating
 * background would read as "an element that never settles".
 */

const origin = process.env.SPACING_BASE_URL || 'https://goosiev.com';
const ROUTES = ['/deals', '/upgrade', '/setup-request', '/discord'];

/** Reveal-managed elements (framer writes inline styles) that are not at rest. */
const collectPending = () => {
  const out = [];
  for (const el of document.querySelectorAll('main *')) {
    if (!el.style.opacity && !el.style.transform) continue;
    if (el.hasAttribute('data-motion-probe')) continue;
    const rect = el.getBoundingClientRect();
    if (rect.height < 40 || rect.width < 40) continue;
    const cs = getComputedStyle(el);
    const opacity = parseFloat(cs.opacity);
    let offset = 0;
    let scale = 1;
    if (cs.transform && cs.transform !== 'none') {
      try {
        const m = new DOMMatrixReadOnly(cs.transform);
        offset = Math.abs(m.m42);
        scale = Math.sqrt(m.m11 * m.m11 + m.m12 * m.m12);
      } catch {
        /* an unparseable transform is not a reveal state */
      }
    }
    if (opacity < 0.99 || offset > 1.5 || Math.abs(scale - 1) > 0.02) {
      out.push({
        tag: el.tagName,
        cls: (el.className || '').toString().slice(0, 60),
        opacity: Math.round(opacity * 100) / 100,
        offset: Math.round(offset),
        scale: Math.round(scale * 1000) / 1000,
        inView: rect.top < window.innerHeight && rect.bottom > 0,
        fullyVisible: rect.top >= -1 && rect.bottom <= window.innerHeight + 1,
      });
    }
  }
  return out;
};

/** How resolved is the element the test scrolled to: 1 means fully arrived. */
const probeScore = () => {
  const el = document.querySelector('[data-motion-probe]');
  if (!el) return 0;
  const cs = getComputedStyle(el);
  let offset = 0;
  try {
    offset = Math.abs(new DOMMatrixReadOnly(cs.transform || 'none').m42);
  } catch {
    offset = 0;
  }
  return Math.min(parseFloat(cs.opacity), 1 - Math.min(1, offset / 40));
};

for (const route of ROUTES) {
  test(`${route} reveals its content as it is scrolled`, async ({ page }) => {
    test.slow();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto(`${origin}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => (document.querySelector('main')?.innerText || '').trim().length > 200,
      null,
      { timeout: 20_000 }
    );

    // Everything on screen at load must resolve on its own, without any scroll.
    await expect
      .poll(
        async () =>
          (await page.evaluate(collectPending)).filter((el) => el.fullyVisible && el.opacity < 0.5)
            .length,
        {
          message: `${route} left content that is fully in view stuck at partial opacity`,
          timeout: 25_000,
        }
      )
      .toBe(0);

    // Proof the motion is scroll-linked: with the page at the top, reveals
    // below the fold have not played.
    const pendingBefore = await page.evaluate(collectPending);
    const pendingBelowFold = pendingBefore.filter((el) => !el.inView);
    expect(
      pendingBelowFold.length,
      `${route} animates everything on mount — nothing is waiting below the fold, so a reader scrolling down sees no motion`
    ).toBeGreaterThan(0);

    // Scroll the first pending element into view and wait for it to arrive.
    const targeted = await page.evaluate(() => {
      for (const el of document.querySelectorAll('main *')) {
        if (!el.style.opacity && !el.style.transform) continue;
        if (el.getBoundingClientRect().height < 40) continue;
        if (parseFloat(getComputedStyle(el).opacity) < 0.99) {
          el.scrollIntoView({ behavior: 'instant', block: 'center' });
          el.setAttribute('data-motion-probe', '');
          return { tag: el.tagName, cls: (el.className || '').toString().slice(0, 60) };
        }
      }
      return null;
    });

    expect(targeted, `${route} had no pending element to scroll to`).not.toBeNull();
    await expect
      .poll(() => page.evaluate(probeScore), {
        message: `${route}: "${targeted.tag}.${targeted.cls}" never became visible after being scrolled into view`,
        timeout: 20_000,
      })
      .toBeGreaterThan(0.9);

    // Walk the whole page, then require every element the reader has passed to
    // be resolved. Elements still entirely below the viewport may be pending —
    // they have not been asked to play.
    const height = await page.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < height; y += 500) {
      await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
      await page.waitForTimeout(150);
    }

    await expect
      .poll(
        async () =>
          (
            await page.evaluate(() => {
              const bad = [];
              for (const el of document.querySelectorAll('main *')) {
                if (!el.style.opacity && !el.style.transform) continue;
                const rect = el.getBoundingClientRect();
                if (rect.height < 40 || rect.width < 40) continue;
                if (rect.top > window.innerHeight) continue; // never shown to the reader
                const cs = getComputedStyle(el);
                const opacity = parseFloat(cs.opacity);
                let offset = 0;
                try {
                  offset = Math.abs(new DOMMatrixReadOnly(cs.transform).m42);
                } catch {
                  /* ignore */
                }
                if (opacity < 0.5 || offset > 40) {
                  bad.push({
                    tag: el.tagName,
                    cls: (el.className || '').toString().slice(0, 60),
                    opacity,
                    offset,
                  });
                }
              }
              return bad;
            })
          ).length,
        {
          message: `${route} left content permanently hidden after scrolling past it`,
          timeout: 25_000,
        }
      )
      .toBe(0);

    expect(errors, `uncaught page errors on ${route}: ${errors.join(' | ')}`).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `${route} has horizontal overflow`
    ).toBe(true);
  });
}

test('reduced motion shows every page immediately, with no pending reveals', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });

  for (const route of ROUTES) {
    await page.goto(`${origin}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => (document.querySelector('main')?.innerText || '').trim().length > 200,
      null,
      { timeout: 20_000 }
    );
    await page.waitForTimeout(900);

    const pending = (await page.evaluate(collectPending)) ?? [];
    expect(
      pending,
      `${route} withheld content from a reduced-motion reader: ${JSON.stringify(pending.slice(0, 4))}`
    ).toEqual([]);
  }
});
