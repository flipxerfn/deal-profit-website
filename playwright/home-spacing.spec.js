import { test, expect } from '@playwright/test';

const origin = process.env.SPACING_BASE_URL || 'https://goosiev.com';

for (const width of [390, 768, 1440]) {
  test(`homepage stays readable at ${width}px`, async ({ page }) => {
    // This machine renders well under 1fps (measured elsewhere in this repo),
    // so a full-viewport screenshot can take longer than the default 45s test
    // budget. The assertions below are unchanged — this only gives a slow
    // environment room to produce the pixels they inspect.
    test.slow();
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    // Exercise the real offline state deterministically, without relying on Discord uptime.
    await page.route('**/api/deals', (route) => route.fulfill({
      json: { deals: [] },
    }));
    await page.route('**/api/reviews', (route) => route.fulfill({
      json: { ok: true, reviews: [] },
    }));
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#hero-title')).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Showing an archived example' })).toBeVisible();

    const pillars = page.locator('.home-pillar-card');
    await expect(pillars).toHaveCount(4);
    await pillars.first().scrollIntoViewIfNeeded();
    for (const card of await pillars.all()) {
      const box = await card.boundingBox();
      expect(box.width, 'benefit card is squeezed into a nested grid').toBeGreaterThan(240);
      const textBox = await card.locator('h3').boundingBox();
      expect(textBox.width).toBeGreaterThan(170);
      expect(await card.locator('h3').evaluate((el) => getComputedStyle(el).fontSize)).toBe('20px');
      expect(await card.evaluate((el) => getComputedStyle(el).paddingTop)).toBe('32px');
      expect(await card.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    }

    for (const id of ['how-title', 'hunt-title', 'social-title']) {
      const heading = page.locator(`#${id}`);
      await heading.scrollIntoViewIfNeeded();
      const box = await heading.boundingBox();
      expect(Math.abs(box.x + box.width / 2 - width / 2), `${id} is off-center`).toBeLessThan(2);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.locator('#hunt-title').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `.qa/spacing/after-hunt-${width}.jpg`, quality: 70 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `.qa/spacing/after-hero-${width}.jpg`, quality: 70 });

    const explore = page.getByRole('link', { name: 'Explore Deals', exact: true });
    await explore.focus();
    await expect(explore).toBeFocused();
    expect(await explore.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe('none');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/deals$/);
    await expect(page.locator('main h1')).toBeVisible();
    expect(errors).toEqual([]);
  });
}
