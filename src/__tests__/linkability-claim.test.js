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
import { readFileSync, readdirSync } from 'node:fs';
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

describe('every consumer actually calls the factory', () => {
  // The failure this exists for: TRUST_ITEMS was converted from an array into a
  // function of the measured value, and the call site was left as
  // TRUST_ITTS.map(...). That is syntactically valid, so `vite build` passed and
  // 442 tests passed — and the home page would have thrown on first render,
  // because Array.prototype.map does not exist on a function.
  //
  // Nothing in the suite caught it because every gate read files rather than
  // rendering. This one checks the call sites directly.
  const pages = ['Home', 'Upgrade', 'Discord'];
  for (const page of pages) {
    it(`${page}.jsx passes the measured value and declares the hook`, () => {
      const src = readFileSync(
        resolve(import.meta.dirname, `../routes/${page}.jsx`),
        'utf8'
      );
      // Declared in the component body.
      expect(src, `${page} does not call useLinkability()`).toMatch(
        /const linkability = useLinkability\(/
      );
      // And passed where the factory is consumed.
      expect(src, `${page} does not pass linkability into the factory`).toMatch(
        /\(linkability\?\.pct\)\.map\(/
      );
      // No remaining call of a factory without arguments.
      expect(src).not.toMatch(/^\s*\{?(TRUST_ITEMS|STATS)\.map\(/m);
    });
  }

  it('no factory anywhere in src is still called as an array', () => {
    // This is the bug that took the home page down.
    //
    // The constant removal was checked by grepping for the constant's NAME.
    // Three of the four consumers were found that way. The fourth,
    // COMMUNITY_STATS, was imported by Home.jsx on a line the grep had not
    // matched, and it crashed the home page with "Yg.map is not a function"
    // — minified, so the error named nothing recognisable.
    //
    // `vite build` passed. All 446 tests passed. Nothing in the suite rendered
    // a page. The failure was only visible in a browser.
    //
    // So this walks the whole source tree rather than a hand-picked list, and
    // looks for the calling shape rather than the imported name.
    const root = resolve(import.meta.dirname, '../..');
    const offenders = [];
    const walk = (dir) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const p = `${dir}/${entry.name}`;
        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules' && entry.name !== 'dist' && !entry.name.startsWith('.')) {
            walk(p);
          }
        } else if (/\.(jsx?|mjs)$/.test(entry.name) && !/\.test\.[jt]sx?$/.test(entry.name)) {
          const body = readFileSync(p, 'utf8');
          const m = body.match(/\b(TRUST_ITEMS|STATS|COMMUNITY_STATS)\.map\(/);
          if (m) offenders.push(`${p.replace(`${root}/`, '')}: ${m[1]}`);
        }
      }
    };
    walk(`${root}/src`);
    expect(
      offenders,
      `factories called as arrays (crashes the page at render): ${offenders.join(', ')}`
    ).toEqual([]);
  });

  it('no route still imports the removed constant', () => {
    // Removing an export with consumers still importing it fails the build
    // loudly, which is good. What is not loud is a consumer that keeps working
    // from a stale copy of the number.
    // Explicit paths. The first version built them by concatenating
    // '../routes/' onto an already-relative '../data/deals.js', which resolved
    // to a file that does not exist — so the read threw and the assertion
    // reported the wrong thing entirely.
    const files = [
      '../routes/Home.jsx',
      '../routes/Upgrade.jsx',
      '../routes/Discord.jsx',
      '../data/deals.js',
    ];
    for (const f of files) {
      const src = readFileSync(resolve(import.meta.dirname, f), 'utf8');
      expect(src, `${f} still references pctPostsLinkable`).not.toMatch(/pctPostsLinkable/);
    }
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