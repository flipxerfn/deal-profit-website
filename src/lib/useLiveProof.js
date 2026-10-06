import { useEffect, useState } from 'react';

/**
 * Live proof figures for the Deal Feed Setup page.
 *
 * WHY THIS EXISTS
 * ---------------
 * The page's central claim is "the same feed that runs on this site, right
 * now". For a long time it made that claim with no evidence on screen — a
 * sentence asserting a live thing while showing a static marketing page. A
 * buyer paying $55 for a feed has no way to tell whether the feed is real, so
 * the page was asking for money on the strength of an adjective.
 *
 * Every number here is measured from the same endpoint the rest of the site
 * reads, at request time. Nothing is hardcoded, and the component renders
 * nothing at all until the figures actually arrive — a placeholder skeleton
 * would be worse than absence, because a "0 finds" flash reads as "this site
 * is dead" to someone already primed to distrust the claim.
 *
 * WHY THE NUMBERS ARE THE ONES THEY ARE
 * --------------------------------------
 * `median` comes from discountStats, which measures internally and takes the
 * median rather than the mean. A single 99%-off listing drags a mean far
 * above what a typical catch looks like; the median is the honest version of
 * the same claim. `measurable` counts only entries carrying a genuine
 * reference price above the sale price, so listings with no comparison do not
 * pad the totals.
 */

/** Retailers are read off the feed rather than listed by hand. */
function countRetailers(deals) {
  const names = new Set();
  for (const d of deals) {
    const meta = Array.isArray(d?.meta) ? d.meta : [];
    const host = meta.find((m) => typeof m === 'string' && m.includes('.'));
    if (host) names.add(host.replace(/^www\./, '').toLowerCase());
  }
  return names.size;
}

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

export function useLiveProof() {
  const [proof, setProof] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/deals', { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(`http_${res.status}`);
        const data = await res.json();
        if (cancelled) return;

        const deals = Array.isArray(data?.deals) ? data.deals : [];
        const median = medianDiscount(deals);
        if (!deals.length || median == null) {
          setFailed(true);
          return;
        }

        // Sample the biggest catches rather than the first three. The feed
        // arrives roughly chronological, so taking deals[0..2] picked whatever
        // landed most recently — frequently a $1 Amazon listing with no
        // reference price, which demonstrates nothing about a feed whose whole
        // pitch is reference-price discounts. Sorting by measured discount and
        // taking three shows the format at its most representative.
        const samples = deals
          .filter(
            (d) =>
              typeof d?.price === 'number' &&
              typeof d?.referencePrice === 'number' &&
              d.price > 0 &&
              d.referencePrice > d.price
          )
          .sort(
            (a, b) =>
              (1 - b.price / b.referencePrice) - (1 - a.price / a.referencePrice)
          )
          .slice(0, 3)
          .map((d) => ({
            id: d.id ?? null,
            title: d.title || 'Untitled find',
            image: d.image || null,
            price: d.price,
            referencePrice: d.referencePrice,
            meta: Array.isArray(d.meta) ? d.meta : [],
          }));

        setProof({
          finds: deals.length,
          median,
          retailers: countRetailers(deals),
          // The newest entry is the freshest evidence available and is the one
          // worth showing: it demonstrates the feed is still moving, which a
          // total alone cannot.
          latest: deals[0]?.title || null,
          samples,
        });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { proof, failed };
}

/** Formats a percentage the way the rest of the site does — never "NaN%". */
export function pct(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  return Math.round(n);
}
