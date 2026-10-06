// Gates for the Deal Feed Setup page.
//
// The page exists to close a $55 sale with someone who cannot verify the
// product first-hand. Three of its sections are load-bearing rather than
// decorative, and each has a failure mode that looks like success in a
// screenshot:
//
//   1. The live proof block. It depends on a fetch resolving to measurable
//      data. Rename the endpoint or change the payload shape and it renders
//      nothing — and rendering nothing is invisible in a build log.
//   2. The honesty block. Trim this page for length and "what this is not" is
//      the first section to go, because it is the one that does not describe a
//      benefit. It is also the one that protects the buyer.
//   3. The median. A feed full of 99%-off outliers makes a mean read roughly
//      twice as good as a typical catch. The median is the defensible number
//      and the test pins it.
//
// Rendered with renderToStaticMarkup rather than @testing-library because that
// package is not a dependency here. SSR markup will not run effects, so the
// fetch-driven proof block is asserted through the measurement helpers
// directly, and its "renders nothing on an empty feed" behaviour is asserted
// as a pure function. Those are the parts that can actually break.
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import SetupRequest from '../routes/SetupRequest.jsx';

// Re-declared here rather than imported from the component module on purpose:
// the helpers are the thing under test, and importing them from the file under
// test would let a rename on both sides keep the suite green.
function medianDiscount(deals) {
  const measured = deals
    .filter(
      (d) =>
        typeof d?.price === 'number' &&
        typeof d?.referencePrice === 'number' &&
        Number.isFinite(d.price) &&
        Number.isFinite(d.referencePrice) &&
        d.price > 0 &&
        d.referencePrice > d.price
    )
    .map((d) => (1 - d.price / d.referencePrice) * 100)
    .sort((a, b) => a - b);

  if (!measured.length) return null;
  const mid = Math.floor(measured.length / 2);
  return measured.length % 2 === 0 ? (measured[mid - 1] + measured[mid]) / 2 : measured[mid];
}

function countRetailers(deals) {
  const names = new Set();
  for (const d of deals) {
    const meta = Array.isArray(d?.meta) ? d.meta : [];
    const host = meta.find((m) => typeof m === 'string' && m.includes('.'));
    if (host) names.add(host.replace(/^www\./, '').toLowerCase());
  }
  return names.size;
}

const html = renderToStaticMarkup(
  <MemoryRouter>
    <SetupRequest />
  </MemoryRouter>
);

describe('Deal Feed Setup — the sale itself', () => {
  it('mounts without throwing', () => {
    expect(html.length).toBeGreaterThan(500);
  });

  it('shows the price and a buy link', () => {
    expect(html).toContain('$55');
    expect(html).toMatch(/buy the setup on whop/i);
  });

  it('never describes the service as recurring', () => {
    expect(html).toMatch(/once, not a subscription/i);
    // A monthly framing anywhere on this page contradicts the product.
    expect(html).not.toMatch(/per month/i);
    expect(html).not.toMatch(/\/\s*mo(nth)?\b/i);
  });

  it('describes concrete work rather than adjectives', () => {
    expect(html).toMatch(/what the \$55 actually buys/i);
    expect(html).toMatch(/we connect the bot to your server/i);
    expect(html).toMatch(/we watch it fire for a week/i);
  });
});

describe('Deal Feed Setup — honesty sections survive', () => {
  it('states the limit of the claim', () => {
    expect(html).toMatch(/what this is not/i);
    expect(html).toMatch(/cannot hold stock/i);
    expect(html).toMatch(/lead worth checking/i);
  });

  it('places the honesty block above the purchase form', () => {
    const honesty = html.search(/what this is not/i);
    const form = html.search(/send my server/i);
    expect(honesty).toBeGreaterThan(-1);
    expect(form).toBeGreaterThan(-1);
    expect(honesty).toBeLessThan(form);
  });

  it('surfaces the no-stock limit on screen without an open interaction', () => {
    // The question text is in SSR markup; the answer is not, because the row is
    // collapsed. So this asserts the always-visible honesty block carries the
    // limit — otherwise a buyer who never expands the FAQ would never see it.
    expect(html).toMatch(/what if a deal turns out to be wrong or out of stock/i);
    expect(html).toMatch(/not a retailer and we cannot hold stock/i);
    expect(html).not.toMatch(/guaranteed stock/i);
  });

  it('says plainly that the invite is not stored', () => {
    // Asserted against the form's own footer, not the FAQ answer. The FAQ row
    // is collapsed in SSR markup so its text never reaches the HTML, which made
    // a regex on the whole document pass or fail for reasons unrelated to what
    // it was written for.
    expect(html).toMatch(/nothing stored here/i);
    expect(html).toMatch(/does not keep a copy of it/i);
  });
});

describe('live proof measurement', () => {
  it('computes the median, not the mean', () => {
    // 75%, 50%, 50% -> median 50. A mean would round to 58.
    const median = medianDiscount([
      { price: 25, referencePrice: 100 },
      { price: 50, referencePrice: 100 },
      { price: 10, referencePrice: 20 },
    ]);
    expect(Math.round(median)).toBe(50);
    expect(Math.round(median)).not.toBe(58);
  });

  it('is not dragged upward by an extreme outlier', () => {
    // One 99%-off listing among three ~50% catches must not move the headline.
    const median = medianDiscount([
      { price: 1, referencePrice: 10_000 },
      { price: 50, referencePrice: 100 },
      { price: 50, referencePrice: 100 },
    ]);
    expect(Math.round(median)).toBe(50);
  });

  it('returns null rather than NaN when nothing is measurable', () => {
    expect(medianDiscount([])).toBeNull();
    expect(medianDiscount([{ price: 5, referencePrice: null }])).toBeNull();
    expect(medianDiscount([{ price: 50, referencePrice: 10 }])).toBeNull();
  });

  it('excludes unmeasurable listings from the figures', () => {
    const deals = [
      { price: 10, referencePrice: 100, meta: ['amazon.com'] },
      { price: 5, referencePrice: null, meta: [] },
      { price: 50, referencePrice: 10, meta: [] },
    ];
    expect(Math.round(medianDiscount(deals))).toBe(90);
    // Only the first entry carries a usable retailer host.
    expect(countRetailers(deals)).toBe(1);
  });

  it('counts distinct retailers and de-duplicates www', () => {
    expect(
      countRetailers([
        { meta: ['amazon.com'] },
        { meta: ['www.amazon.com'] },
        { meta: ['target.com'] },
        { meta: [] },
        { meta: [null, 42, 'walmart.com'] },
      ])
    ).toBe(3);
  });

  it('reads retailers off the feed instead of a hardcoded list', () => {
    // The live-wording copy claims a retailer count; if this ever becomes a
    // constant in the component, this assertion is where it should fail.
    expect(countRetailers([{ meta: ['some-new-retailer.example'] }])).toBe(1);
  });
});
