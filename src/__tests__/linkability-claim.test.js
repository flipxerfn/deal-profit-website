// The "99% link to the listing" claim was a hardcoded snapshot that overstated.
//
// What is actually true
// ---------------------
// The site's most load-bearing claim is that almost every post links to a real
// listing. The number behind it was a constant in siteFacts.js, written once:
//
//   postsWithSourceLink: 197,  dealsInFeed: 200   ->   99%
//
// Probed against the live feed, 9 posts have no retailer URL at all. Their only
// link is a Discord channel, and their titles include "FREE SHACKBURGER AT
// SHAKE SHACK", "FREE $5 DUNKIN CARD FOR VERIZON CUSTOMER" and one titled
// literally "🚨 CHECK". The honest figure is 191 of 200, or 96%.
//
// Three separate problems with the old number, and only the first is the
// overstatement:
//
//   1. It counts a Discord channel as a link to a listing. isSourceLink
//      already knows the difference — the deal cards use it, and they fall back
//      to the correct label — but the headline claim did not.
//   2. It was a snapshot. It was written on a fixed date against a feed that
//      changes every five minutes, so it drifts from the truth continuously and
//      silently.
//   3. Nothing could contradict it. The number lived in a data file next to the
//      copy, so no test could compare the claim against the feed.
//
// This computes it instead, using the same rule the cards use, so the claim and
// the cards cannot disagree.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const facts = readFileSync(resolve(import.meta.dirname, '../data/siteFacts.js'), 'utf8');
const home = readFileSync(resolve(import.meta.dirname, '../routes/Home.jsx'), 'utf8');
// The measuring code lives in its own module. The first version of this gate
// only read the data file and the page, so it could never see the hook that
// actually computes the number, and failed for the wrong reason.
const hook = readFileSync(resolve(import.meta.dirname, '../lib/useLinkability.js'), 'utf8');
const all = facts + home + hook;

describe('the linkability claim is measured, not remembered', () => {
  it('is no longer derived from the hardcoded snapshot', () => {
    // This is the actual bug. As long as the figure is a constant in a data
    // file, it cannot be right and cannot be checked.
    expect(facts, 'pctPostsLinkable is still a constant off a stale snapshot')
      .not.toMatch(/pctPostsLinkable/);
  });

  it('counts a retailer listing using the same rule the cards use', () => {
    // One rule, two places. isSourceLink already excludes Discord hosts, and
    // the cards already rely on it; the claim has to agree with them or the
    // page contradicts itself.
    expect(all).toMatch(/isSourceLink/);
  });

  it('reads the live feed rather than a baked-in array', () => {
    // Scoped to the measuring module. The first version searched the whole set
    // of files and matched /api\/deals in Home.jsx, where it appears for
    // unrelated reasons — it passed even if the hook did not exist.
    expect(hook).toMatch(/ENDPOINT = '\/api\/deals'/);
    expect(hook).toMatch(/fetch\(ENDPOINT/);
  });
});

describe('it cannot be stated when there is nothing to measure', () => {
  it('shows nothing rather than a stale figure', () => {
    // Falling back to a cached number when the fetch fails is exactly how a
    // claim went stale in the first place. Every failure path has to land on
    // null rather than on the previous value.
    expect(hook).toMatch(/catch[\s\S]{0,120}setStats\(null\)/);
    // And a thin feed is not enough to make a claim either.
    expect(hook).toMatch(/total < \d+/);
  });
});

describe('no claim is stated without saying what it measures', () => {
  it('the label names what is being counted', () => {
    // Asserted where the label is actually built, not that the string appears
    // somewhere in the page. The previous version matched a literal that
    // Home.jsx contains independently of this claim.
    expect(home).toMatch(/label: 'Verifiable'[\s\S]{0,120}link to the listing/);
  });
});