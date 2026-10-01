// Numbers this site is allowed to claim.
//
// Every figure here is measured from the live feed at /api/deals, not
// estimated. The previous copy claimed "10,000+ deal hunters", "93% average
// savings" and "50+ deals daily" while the account had a handful of members —
// which is the kind of unverifiable claim that gets a storefront reviewed, and
// it is the same category of problem as showing an archived deal as live.
//
// Rules for this file:
//   - Only claim a number you can produce on request.
//   - Say what the number measures. "Median saving on posted finds" is honest;
//     "average savings" implies something about members that we cannot know.
//   - MEMBER_COUNT is deliberately left as null. Fill it in with the real
//     number or it renders as nothing — an absent stat is fine, an invented one
//     is not.

/**
 * Measured from the live feed on September 29, 2026:
 *   200 deals, 122 with a genuine reference price to compare against,
 *   197 carrying a direct link to the listing.
 */
export const FEED_STATS = {
  dealsInFeed: 200,
  dealsWithReferencePrice: 122,
  medianSavingPct: 67,
  findsHalfOffOrMore: 108,
  // SUPERSEDED. This counted 9 Discord channel links as links to a listing,
  // which overstated the claim by three points. Nothing renders it — the
  // figure is now measured live in lib/useLinkability.js. Kept only so the
  // correction is on the record rather than silently edited.
  postsWithSourceLink: 191,
};

// Your real member count. null = the stat is hidden rather than guessed.
export const MEMBER_COUNT = null;

// Derived, so the two cannot disagree with each other.
export const pctFindsHalfOff = Math.round(
  (FEED_STATS.findsHalfOffOrMore / FEED_STATS.dealsWithReferencePrice) * 100
);
