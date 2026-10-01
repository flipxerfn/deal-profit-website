// Turning a feed of deals into evidence.
//
// Every function here is pure and takes its data as an argument. That is
// deliberate: the point of this module is that the numbers are computed rather
// than written, so a hardcoded "67% median" can never survive a change in the
// feed and quietly become a claim instead of a measurement.
//
// The rule that shapes all of it: a catch counts only if BOTH prices are
// present and the price is genuinely lower. A missing reference price is not a
// discount, and neither is a price equal to its reference.

/**
 * Deals that carry a real, measurable discount.
 *
 * @param {Array<object>} deals raw feed entries
 * @returns {Array<object>} new objects, each with `discountPct`; input untouched
 */
export function measurableCatches(deals) {
  if (!Array.isArray(deals)) return [];

  const out = [];
  for (const d of deals) {
    const price = d?.price;
    const reference = d?.referencePrice;
    if (typeof price !== 'number' || typeof reference !== 'number') continue;
    if (!Number.isFinite(price) || !Number.isFinite(reference)) continue;
    if (price <= 0 || reference <= price) continue;

    out.push({
      ...d,
      discountPct: (1 - price / reference) * 100,
    });
  }
  return out;
}

/**
 * Headline numbers for the band.
 *
 * Takes RAW feed entries, not the output of measurableCatches. That is
 * deliberate: an earlier version took pre-processed objects carrying
 * `discountPct`, and passing raw deals to it silently produced
 * `{median: undefined}` rather than an error — a stat line reading "NaN%" on a
 * live page. Measuring inside means there is exactly one way to call it.
 *
 * Median rather than mean: a single 98%-off listing drags a mean far above what
 * a typical catch looks like, and quoting that would be the kind of number that
 * is technically true and practically misleading.
 *
 * @param {Array<object>} deals raw feed entries
 * @returns {{total:number, median:number, atLeast50:number, atLeast70:number, best:number}|null}
 *          null when there is nothing measurable — the caller renders nothing
 */
export function discountStats(deals) {
  const measured = measurableCatches(deals);
  if (measured.length === 0) return null;

  const pcts = measured.map((c) => c.discountPct).sort((a, b) => a - b);
  const mid = Math.floor(pcts.length / 2);
  const median = pcts.length % 2 === 0 ? (pcts[mid - 1] + pcts[mid]) / 2 : pcts[mid];

  return {
    total: pcts.length,
    median,
    atLeast50: pcts.filter((p) => p >= 50).length,
    atLeast70: pcts.filter((p) => p >= 70).length,
    best: pcts[pcts.length - 1],
  };
}

/**
 * The biggest catches, best discount first.
 *
 * Sorted DESCENDING. The first version sorted ascending and then took the
 * first N, which is the worst possible set of rows for this component: the
 * band shipped heading with 10%-off listings under the title "What a catch
 * actually looks like", directly below a stat line reading a 67% median. The
 * page contradicted itself inside one card.
 *
 * @param {Array<object>} deals raw feed entries
 * @param {number} howMany
 */
export function topCatches(deals, howMany = 6) {
  const measured = measurableCatches(deals);
  if (!Number.isFinite(howMany) || howMany <= 0) return [];
  return [...measured]
    .sort((a, b) => b.discountPct - a.discountPct)
    .slice(0, howMany);
}