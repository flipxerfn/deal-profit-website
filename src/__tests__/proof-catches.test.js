// Proof: what the feed actually catches, measured.
//
// The gap this closes
// ------------------
// A competitor's storefront is a wall of receipts. Every product he lists is a
// concrete catch with real numbers, so his credibility IS his catalogue. This
// site had 200 real deals and surfaced none of them as evidence — the
// storefront described the service instead of demonstrating it.
//
// A stranger deciding whether $25 is worth it cannot tell what they are buying
// from a description. They can tell instantly from six real catches with a
// price, a retail price and a working link.
//
// Why the numbers are computed, not asserted
// -------------------------------------------
// Every figure here is derived from the live feed at render time. Nothing is
// hardcoded, because a hardcoded "67% median" stops being true the moment the
// feed changes and becomes a claim rather than a measurement. If the feed is
// thin, the band shows fewer catches and a lower median, which is the honest
// outcome.
//
// On income
// ---------
// This deliberately claims nothing about anybody's earnings. "Profit per order"
// language appears in the source Discord bots' own post titles and must never
// be promoted into a claim on this site. The proof offered is the discount,
// which is measurable and involves no assertion about what anyone earned.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(import.meta.dirname, '../components/ProofCatches.jsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

// The library, so the maths is tested rather than reimplemented in the test.
import { measurableCatches, discountStats } from '../lib/proof.js';

const deal = (over = {}) => ({
  id: 'd1',
  title: 'Sony WH-1000XM5 Headphones',
  url: 'https://www.amazon.com/dp/B000000001',
  price: 229,
  referencePrice: 349,
  postedAt: '2026-09-30T10:00:00.000Z',
  ...over,
});

describe('a catch is only real if both prices are real', () => {
  it('keeps deals with both prices', () => {
    const out = measurableCatches([deal()]);
    expect(out).toHaveLength(1);
    expect(out[0].discountPct).toBeCloseTo((1 - 229 / 349) * 100, 1);
  });

  it.each([
    ['no reference price', { referencePrice: null }],
    ['no price', { price: null }],
    ['price is zero', { price: 0 }],
    ['reference is lower than price — not a discount', { price: 100, referencePrice: 50 }],
    ['negative price', { price: -10, referencePrice: 100 }],
    ['non-numeric', { price: 'cheap', referencePrice: '100' }],
  ])('rejects %s', (_label, over) => {
    expect(measurableCatches([deal(over)])).toHaveLength(0);
  });

  it('drops the noise discount where price equals reference', () => {
    // A "0% off" row is not a catch. Displaying it would pad the band.
    expect(measurableCatches([deal({ price: 100, referencePrice: 100 })])).toHaveLength(0);
  });

  it('does not mutate the input', () => {
    const input = [deal()];
    const copy = JSON.parse(JSON.stringify(input));
    measurableCatches(input);
    expect(input).toEqual(copy);
  });
});

describe('the headline numbers are measured from the feed', () => {
  it('computes the median discount, not the mean', () => {
    // A mean is dragged around by one 98%-off listing; a median is what a
    // typical catch looks like, which is the number worth quoting.
    const stats = discountStats([
      deal({ price: 10, referencePrice: 20 }),   // 50%
      deal({ price: 10, referencePrice: 20 }),   // 50%
      deal({ price: 1, referencePrice: 100 }),   // 99%
    ]);
    expect(stats.median).toBe(50);
    expect(stats.atLeast50).toBe(3);
  });

  it('counts how many clear the thresholds', () => {
    const stats = discountStats([
      deal({ price: 5, referencePrice: 10 }),    // 50%
      deal({ price: 3, referencePrice: 10 }),    // 70%
      deal({ price: 9, referencePrice: 10 }),    // 10%
    ]);
    expect(stats.atLeast50).toBe(2);
    expect(stats.atLeast70).toBe(1);
    expect(stats.total).toBe(3);
  });

  it('reports honestly when there is not enough data', () => {
    // An empty feed must not render "0% median off". It should render nothing,
    // because a band that says "we caught nothing" is worse than no band.
    expect(discountStats([])).toBeNull();
    expect(discountStats(null)).toBeNull();
  });
});

describe('the band cannot make a claim the data does not support', () => {
  it('reads its numbers from the live feed, never a hardcoded figure', () => {
    expect(src).toMatch(/fetch\(ENDPOINT/);
    expect(src).toMatch(/const ENDPOINT = '\/api\/deals'/);

    // A hardcoded figure is a claim frozen at build time. The first version of
    // this gate required a "%" sign after the number, so `const median = 67`
    // passed it — the exact substitution it was written to catch.
    expect(src, 'median is assigned a literal instead of read from the stats')
      .not.toMatch(/const median\s*=\s*\d/);
    // And it has to come from the computed stats, not be invented.
    expect(src).toMatch(/median[^\n]*=\s*state\.stats/);
  });

  it('never claims anybody earned anything', () => {
    // Income claims are on Whop's scam list and will get the account
    // suspended. The source bots post titles containing "Profit per order";
    // that language must not survive into this component.
    const banned = [
      'make money', 'earn money', 'income', 'profit per', 'monthly profit',
      'profit margin', 'turning a profit', 'guaranteed', 'passive income',
      'roi', 'per month', '/month',
    ];
    const copy = src.toLowerCase();
    for (const phrase of banned) {
      expect(copy.includes(phrase), `copy contains the claim "${phrase}"`).toBe(false);
    }
  });

  it('links every catch to the live listing', () => {
    // "99% link to the listing" is a claim this site makes. A proof band that
    // shows a catch the reader cannot open would undercut it.
    expect(src).toMatch(/href=\{[^}]*url|target="_blank"/);
  });

  it('renders nothing rather than an empty shell', () => {
    // Asserts the guard's intent, not one exact line. A regex pinned to a
    // literal here would fail on any harmless refactor and pass on any change
    // that kept the literal while breaking the behaviour.
    const guard = src.match(/if \([^)]*\.length[^)]*\)\s*return null;/);
    expect(guard?.[0], 'no return-null guard for an empty feed').toBeTruthy();
    expect(src).toMatch(/!state\.stats/);
  });

  it('shows the sample size next to the median, so the claim is bounded', () => {
    // "67% median" means nothing without knowing it is out of 115 listings
    // rather than 3.
    // Asserted on the RENDERED output, not on the identifier. The first
    // version matched /total|sample/i, which is satisfied by the destructured
    // variable even when nothing renders it — so deleting the sample size from
    // the markup passed. `/total}` only appears where it is actually printed.
    expect(src, 'the sample size is destructured but never rendered')
      .toMatch(/\/\{total\}/);
    expect(src, 'the caption does not explain what the number is out of')
      .toMatch(/Median catch|atLeast50/);
  });
});