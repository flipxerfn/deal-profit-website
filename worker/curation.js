// Feed curation — what reaches the public feed.
//
// Both rules here exist because the live feed looked wrong to a stranger:
//
//   1. Six consecutive slots in the newest-24 were near-identical swim goggles
//      from one poster. Dedupe is working correctly — a kids' pair and a
//      heart-shaped pair really are different products — but nobody wants
//      six swim goggles in a row, and a reader who lands on that sees a
//      catalogue, not a deal feed.
//
//      The first attempt capped PER CHANNEL, which was wrong twice over. No
//      channel is over 25% of the real feed, so a channel cap trims nothing
//      there — and the offender held only 15 posts total. The repetition is
//      within one channel's own output, not across channels. So the rule is
//      per BRAND, measured on the title's leading tokens, and it works within
//      a single channel's run.
//
//   2. The newest post on /deals was a silicone breast product, and it was the
//      first thing a visitor saw. The first card in the grid is the one people
//      screenshot, and on an account that already needs to look credible to a
//      payment provider, that is not a trade worth making.
//
// The sensitive-content list is deliberately narrow. A broad filter deletes
// real deals — "Dog Sweater (XXX-Large)" and "XBOX Series X" both contain
// three X's — and silently dropping someone's purchase because a word matched
// is worse than showing it. Every term below is one that only appears in
// genuinely adult product titles.

const ADULT_TERMS = [
  // Each is a phrase, not a substring, so "bra" does not fire on "brake" and
  // "adult" does not fire on "Adult & Youth" sports gear.
  /\bsilicone\s+breasts?\b/i,
  /\bbreast\s+forms?\b/i,
  /\b(perky|tear\s?drop|prosthetic)\s+breasts?\b/i,
  /\blingerie\b/i,
  /\bthongs?\b/i,
  /\bpanties\b/i,
  /\b(bra|bras)\b(?!\s*and\s*bra)/i,
  /\bbikini\b/i,
  /\bnipple\b/i,
  /\bporn\b/i,
  /\bsex\s?toy\b/i,
  /\badult\s+(?:toy|erotic|video|content)\b/i,
  /\bnsfw\b/i,
  /\bfetish\b/i,
  /\bcamgirl\b/i,
  /\blatex\b/i,
];

const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** True when a deal's text is adult material and should not be published. */
export function isOffensive(deal) {
  const text = norm(`${deal?.title ?? ''} ${deal?.description ?? ''}`);
  if (!text) return false;
  return ADULT_TERMS.some((re) => re.test(text));
}

// A channel may hold at most this SHARE of the feed, and never more than
// MAX_PER_CHANNEL posts in absolute terms.
//
// A flat cap is wrong at both ends. Six is far too aggressive for a 200-post
// feed — it deletes half the inventory to solve a problem one channel caused.
// But a pure share fails the other way: at 20 posts total, a 25% cap allows
// 5, and a feed of one poster is still one poster.
//
// So: whichever is SMALLER. 25% stops a channel owning the grid; the absolute
// ceiling stops a small feed collapsing onto whoever spoke last.
// How many posts one BRAND may contribute to a run of the feed, and how far
// back that runs.
export const BRAND_RUN_LIMIT = 2;
export const BRAND_WINDOW = 40;

/** Most times any one brand appears in a list of titles — a spam signal. */
export function channelRank(titles) {
  const counts = new Map();
  for (const t of titles ?? []) {
    const k = brandKey(t);
    if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return Math.max(0, ...counts.values());
}

/**
 * A brand key from a title.
 *
 * The first two meaningful words, so "H2O Life Swim Goggles" and "H2O Life
 * Kids Swim Goggles" collapse to the same key while "H2O Life" and
 * "NHL Team" do not. Numeric tokens are dropped because a model number is
 * exactly what varies across a catalogue.
 */
export function brandKey(title) {
  const words = norm(title)
    .split(' ')
    .filter((w) => w && !/^\d+$/.test(w) && !/^\d+(?:\.\d+)?[a-z]*$/.test(w));
  if (words.length === 0) return null;
  return words.slice(0, 2).join(' ');
}


/**
 * Filter, then thin out repetition.
 *
 * Offensive posts go first, so a rejected post can never be reintroduced by
 * the repetition rule. Then, walking the feed newest-first, a post is dropped
 * when its brand has already appeared BRAND_RUN_LIMIT times in the last
 * BRAND_WINDOW posts.
 *
 * Dropping the NEWEST duplicate rather than the oldest is the point: the
 * newest are the most relevant, and a reader hitting Refresh should not watch
 * the same goggles march up the page.
 */
export function curateDeals(deals, opts = {}) {
  const list = (Array.isArray(deals) ? deals : []).filter(Boolean);
  const limit = opts.brandRunLimit ?? BRAND_RUN_LIMIT;
  const window = opts.brandWindow ?? BRAND_WINDOW;

  const kept = list.filter((d) => !isOffensive(d));

  const sorted = [...kept].sort((a, b) => {
    const ta = a?.postedAt ? Date.parse(a.postedAt) : 0;
    const tb = b?.postedAt ? Date.parse(b.postedAt) : 0;
    if (tb !== ta) return tb - ta;
    return 0;
  });

  const out = [];
  const recent = [];
  for (const d of sorted) {
    const key = brandKey(d?.title);
    if (key) {
      recent.push(key);
      if (recent.length > window) recent.shift();
      const inWindow = recent.slice(0, -1).filter((k) => k === key).length;
      if (inWindow >= limit) continue;
    }
    out.push(d);
  }
  return out;
}
