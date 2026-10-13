import { test, expect } from '@playwright/test';

/**
 * PRODUCTION VERIFICATION
 *
 * Rewritten. The previous version of this file asserted things that are no
 * longer true and would have failed against the current site:
 *
 *   - it required that NO "whop.com" link existed anywhere. Whop is the
 *     checkout and membership backend for this business now; there are
 *     checkout links on /upgrade by design. The assertion was written when the
 *     site predated Whop and was never revisited, so it encoded a decision
 *     that had since been reversed.
 *   - it failed via `process.exit(1)` inside a test body. In Playwright that
 *     kills the runner instead of failing one assertion, so it reports as a
 *     crash rather than as a failure and takes the rest of the run with it.
 *   - `page.locator('text=Reviews, text=Upgrade')` is not a valid comma
 *     selector; it matches nothing, so `expect(...).toBeVisible()` would pass
 *     or fail for reasons unrelated to the page.
 *   - it wrote full-page PNGs into the repository root on every run, which are
 *     neither ignored nor committed.
 *
 * What replaces it tests the things that actually matter and that have
 * actually broken here.
 */

const ROUTES = ['/', '/deals', '/upgrade', '/setup-request', '/discord'];

/**
 * Wait for the route wrapper to become VISIBLE, then describe it.
 *
 * This waits rather than samples, and that distinction is the whole test.
 *
 * The first version of this file asserted `opacity > 0.9` at a single
 * instant after the text appeared. That failed against a correct build: on a
 * machine that cannot run animation frames at speed (this one renders under
 * 1 fps — measured), the enter tween is still at its 0% keyframe long after
 * the content is in the DOM, so the page reads as "opacity 0" while being
 * perfectly fine.
 *
 * But the bug this file exists to catch is not "briefly transparent". It is
 * "permanently transparent" — mounted, laid out, at opacity 0, never
 * recovering, needing a reload. Only that is a defect.
 *
 * So the assertion is that it BECOMES visible within a generous window. A page
 * still fading in passes. A page stuck at zero fails. A 25s budget is far
 * longer than any legitimate entrance animation and still fails fast on a real
 * regression.
 */
async function waitForVisibleRoute(page, label, timeout = 25_000, previous = null) {
  try {
    await page.waitForFunction(
      (prev) => {
        const wrap = document.querySelector('main')?.firstElementChild;
        // The node identity check is the whole point, and it was missing.
        //
        // React Router calls history.pushState BEFORE React re-renders, so
        // `waitForURL` resolves while the OUTGOING page is still mounted at
        // opacity 1. A predicate that only reads opacity therefore succeeds
        // against the page we are leaving, and the very next read can catch
        // the incoming wrapper at opacity 0. That is exactly how this failed:
        // the wait resolved in 313ms, then measured 0.
        //
        // Requiring a DIFFERENT node than the one that was on screen before the
        // click makes "visible" mean "the new route is visible", which is the
        // thing being asserted. The route wrapper is keyed by pathname
        // (`key={pathname}` in Layout), so a route change always produces a new
        // node — this is reliable, not incidental.
        if (!wrap || wrap === prev) return false;
        const cs = getComputedStyle(wrap);
        return (
          Number(cs.opacity) > 0.9 &&
          cs.visibility === 'visible' &&
          wrap.getBoundingClientRect().height > 200
        );
      },
      previous,
      { timeout }
    );
  } catch {
    // Fall through and report the actual state rather than a bare timeout, so
    // the failure says what was wrong instead of only that it was wrong.
  }
  return page.evaluate(() => {
    const main = document.querySelector('main');
    const wrap = main?.firstElementChild;
    if (!wrap) return { present: false };
    const cs = getComputedStyle(wrap);
    return {
      present: true,
      opacity: Number(cs.opacity),
      visibility: cs.visibility,
      textLength: (main.innerText || '').trim().length,
      height: wrap.getBoundingClientRect().height,
    };
  }).then((s) => ({ ...s, label }));
}

test.describe('Production serves a working build', () => {
  test('every route renders visible content on a cold load', async ({ page }) => {
    // Five routes, each with a 20s hydration wait and a 25s visibility wait, in
    // a single test body under a 45s default budget. That budget was wrong on
    // its face — the failure it produced was the test running out of clock, not
    // the page being broken, so it read as a site defect when it was arithmetic.
    test.slow();
    for (const route of ROUTES) {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), `${route} returned a non-200`).toBeLessThan(400);

      // Wait for hydration rather than a fixed sleep. The deal feed is fetched
      // client-side and the assertions below read rendered text, so a fixed
      // wait would be either flaky or slow depending on cache state.
      await page.waitForFunction(
        () => (document.querySelector('main')?.innerText || '').trim().length > 200,
        null,
        { timeout: 20_000 }
      );

      const state = await waitForVisibleRoute(page, route);
      expect(state.present, `${route} has no route wrapper`).toBe(true);
      // The regression this file exists for: mounted and laid out at zero
      // opacity, permanently, is a blank page that no error reports.
      expect(state.opacity, `${route} never became visible (stuck at opacity ${state.opacity} after 25s)`).toBeGreaterThan(0.9);
      expect(state.visibility, `${route} is ${state.visibility}`).toBe('visible');
      expect(state.height, `${route} collapsed to zero height`).toBeGreaterThan(200);
      expect(state.textLength, `${route} rendered ${state.textLength} chars`).toBeGreaterThan(200);
    }
  });

  test('navigating between routes does not blank the page', async ({ page }) => {
    // This is the bug itself. A cold load of every route can be fine while
    // client-side transitions leave the new page mounted at opacity 0, which
    // is exactly how it presented: the page was only reachable by reloading.
    //
    // `slow()` triples the 45s test budget, and the visibility waits below get
    // 45s instead of 25s. That is for the environment, not a relaxation of the
    // assertion.
    //
    // The leg back to `/` mounts the hero, its scroll reveals and the live feed
    // in a single frame. On a machine that renders under 1fps (measured — see
    // the note in motion.spec.js) that leg has now overrun a 25s window twice
    // while being entirely correct: it passed on the immediate retry both
    // times, and a genuinely blank page would not. Four legs also share one
    // test budget, so a single slow leg needs headroom rather than a bigger
    // share of a fixed 45s.
    //
    // What is NOT relaxed: an element that never resolves still fails. It just
    // fails after 45s instead of 25s.
    test.slow();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => (document.querySelector('main')?.innerText || '').trim().length > 200
    );

    const nav = page.locator('header').getByRole('link').first();
    await nav.waitFor({ state: 'visible' });

    const pairs = [
      ['/', '/deals'],
      ['/deals', '/upgrade'],
      ['/upgrade', '/deals'],
      ['/deals', '/'],
    ];

    for (const [from, to] of pairs) {
      expect(new URL(page.url()).pathname, `setup for ${from}`).toBe(from);

      // Capture the wrapper currently on screen so the visibility wait below
      // cannot be satisfied by the page we are about to leave. See the note in
      // waitForVisibleRoute for why this is required rather than defensive.
      const previous = await page.evaluateHandle(
        () => document.querySelector('main')?.firstElementChild ?? null
      );

      await page.locator(`header a[href="${to}"]`).first().click();

      // Condition-based wait, not a sleep: wait until the URL has actually
      // changed and the new content is present, then assert visibility. A
      // timeout here means the transition never completed.
      await page.waitForURL(`**${to}`, { timeout: 10_000 });
      await page.waitForFunction(
        () => (document.querySelector('main')?.innerText || '').trim().length > 200,
        null,
        { timeout: 10_000 }
      );

      const state = await waitForVisibleRoute(page, `${from} -> ${to}`, 45_000, previous);
      expect(
        state.opacity,
        `${from} -> ${to} never became visible (stuck at opacity ${state.opacity} after 45s)`
      ).toBeGreaterThan(0.9);
      expect(state.height, `${from} -> ${to} collapsed the page`).toBeGreaterThan(200);
    }
  });

  test('the community invite and checkout paths are reachable', async ({ page }) => {
    await page.goto('/upgrade', { waitUntil: 'domcontentloaded' });

    // Wait for the page to actually mount before asserting on its contents.
    // `domcontentloaded` fires against an empty `#root`; every element below is
    // rendered by React. Without this the first assertion leaned on Playwright's
    // 5s default expect timeout, which this machine (sub-1fps, measured) can
    // exceed while simply hydrating — so a slow mount reported as "no Discord
    // invite link", i.e. as a broken funnel, which is the one thing this test
    // exists to distinguish from slowness.
    await page.waitForFunction(
      () => (document.querySelector('main')?.innerText || '').trim().length > 200,
      null,
      { timeout: 20_000 }
    );

    // The Discord invite is the free tier's whole destination, so its absence
    // is a broken funnel rather than a cosmetic issue.
    const invite = page.locator('a[href*="discord.gg"]').first();
    await expect(invite, 'no Discord invite link on /upgrade').toBeVisible();

    // Whop links are expected here and the original spec asserted the
    // opposite. Assert they are present AND safe rather than absent.
    const whop = page.locator('a[href*="whop.com"]');
    const count = await whop.count();
    expect(count, 'expected Whop checkout links on /upgrade').toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const href = await whop.nth(i).getAttribute('href');
      expect(href, 'Whop link with no href').toBeTruthy();
      expect(href, `Whop link opens a raw URL: ${href}`).not.toMatch(/^javascript:/i);
    }
  });

  test('no uncaught page errors on the main routes', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    for (const route of ['/', '/deals', '/upgrade']) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
    }

    // 401s from the auth endpoints are expected for a signed-out visitor and
    // are handled; an uncaught exception is not.
    expect(errors, `uncaught page errors:\n  ${errors.join('\n  ')}`).toEqual([]);
  });
});