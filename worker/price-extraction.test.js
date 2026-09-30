// Price extraction picks the LOWEST dollar figure on a listing page.
//
// A coupon box says "$10 off at checkout" next to a $269.99 monitor, and the
// lowest-number rule reads that as the price. The result is a 98%-off claim on
// a deal that is really 46% off. That is not a cosmetic bug — it is a false
// price, and a false price in an advertisement is a different kind of problem
// from a wrong number in a feed.
//
// Confirmed against the live feed on 30 September 2026:
//
//   "SAMSUNG 43" M70F ... FOR $269.99"      -> price 10,    actual 269.99
//   "AXE BODY SPRAY 15-PACK FOR $40.99"     -> price 2.73,  actual 40.99
//   "NUTELLA & GO 12-PACK FOR $12.96"       -> price 1.08,  actual 12.96
//
// All three of those are the "FOR $X" construction, which names the real price
// explicitly. So the fix is not to guess better — it is to read the phrase that
// the deal posters themselves use.
import { describe, it, expect } from 'vitest';
import { extractPrices } from './parseDeals.js';

// Each of these is a real post shape from the live feed, with the true price
// written into the expectation.
describe('a coupon box is not a price', () => {
  it('reads $269.99, not the $10 coupon beside it', () => {
    const raw = '$499.99 SAMSUNG 43" M70F SMART MONITOR FOR $269.99 44% off Reference Price $10 off at checkout, limit 1';
    const { price, referencePrice } = extractPrices(raw);
    expect(price).toBe(269.99);
    expect(referencePrice).toBe(499.99);
  });

  it('reads $40.99, not $2.73', () => {
    const raw = '$149.99 AXE BODY SPRAY 15-PACK FOR $40.99 is 73% off at Woot, limit 1';
    const { price } = extractPrices(raw);
    expect(price).toBe(40.99);
  });

  it('reads $12.96, not $1.08', () => {
    const raw = '$23 NUTELLA & GO 12-PACK FOR $12.96 drop to $12.96 with the subscription';
    const { price } = extractPrices(raw);
    expect(price).toBe(12.96);
  });

  it('never reports a price lower than the "FOR $" figure it found', () => {
    // The invariant, which is what actually matters: whatever else the page
    // contains, the price cannot be below a price the post names outright.
    const raws = [
      '$499.99 SAMSUNG M70F FOR $269.99 $10 off at checkout',
      '$149.99 AXE SPRAY FOR $40.99 $2.73 shipping',
      '$23 NUTELLA FOR $12.96 $1.08 with subscription',
      '$120.99 SKILLET FOR $29.99 $5 off',
      '$699 APPLE WATCH $609 $90 off',
    ];
    for (const raw of raws) {
      const named = Number(/\bFOR \$([\d,.]+)/i.exec(raw)?.[1].replace(/,/g, ''));
      const { price } = extractPrices(raw);
      expect(price, `under-reported for: ${raw}`).not.toBeLessThan(named);
    }
  });
});

describe('the "FOR $X" phrase is read as the price', () => {
  it.each([
    ['$499.99 SAMSUNG M70F FOR $269.99', 269.99],
    ['SHOVEL FOR $19.99 at Woot', 19.99],
    ['WOMANS JACKET FOR $7.50', 7.5],
  ])('%j -> %f', (raw, want) => {
    expect(extractPrices(raw).price).toBe(want);
  });

  it('does not fire on a reference-price mention', () => {
    // "was $40" is the struck price, not the deal. A "FOR" that follows a
    // reference marker is the wrong signal.
    const raw = 'Retail $40. Retail was $40. FOR $7 available now';
    const { price, referencePrice } = extractPrices(raw);
    expect(price).toBe(7);
    expect(referencePrice).toBe(40);
  });
});

describe('existing behaviour is not regressed', () => {
  it('still reads a plain price with no FOR phrase', () => {
    expect(extractPrices('NVIDIA RTX 5090 $1,999.99 now 40% off').price).toBe(1999.99);
  });

  it('still reads a struck reference price', () => {
    const { referencePrice } = extractPrices('~~$299.99~~ now $39.99');
    expect(referencePrice).toBe(299.99);
  });

  it('still reads an explicit current-price tag', () => {
    expect(extractPrices('now: $12.49 was $49.99').price).toBe(12.49);
  });

  it('still drops the post when there is no price at all', () => {
    expect(extractPrices('no numbers here').price).toBeNull();
  });

  it('a FOR price is not mistaken for the reference price', () => {
    // "$499.99 ... FOR $269.99" must leave the reference at 499.99. Promoting
    // the FOR figure to the reference would make every deal look like no
    // discount at all.
    const { referencePrice, price } = extractPrices('$499.99 SAMSUNG FOR $269.99');
    expect(price).toBe(269.99);
    expect(referencePrice).toBe(499.99);
  });
});
