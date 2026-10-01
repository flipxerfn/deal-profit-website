// Marketing claims must be measurements, not aspirations.
//
// The site previously said "10,000+ deal hunters", "93% average savings",
// "50+ deals posted daily" and "every deal manually reviewed" while the account
// had a handful of members. Unverifiable claims are the same category of problem
// as showing an archived deal as live: they make a legitimate site look like a
// scam, and they are exactly what gets a storefront reviewed.
//
// These gates fail if an invented number reappears in rendered copy.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { COMMUNITY_STATS } from '../data/deals';
import { isSourceLink } from '../lib/dealSource';
import { FEED_STATS, pctFindsHalfOff, MEMBER_COUNT } from '../data/siteFacts';

const honestClaimsSrc = readFileSync(resolve(import.meta.dirname, '../data/siteFacts.js'), 'utf8');
const root = resolve(import.meta.dirname, '../..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const walk = (dir) =>
  readdirSync(resolve(root, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]
  );
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('the numbers are measurements', () => {
  it('are internally consistent', () => {
    expect(FEED_STATS.dealsWithReferencePrice).toBeLessThanOrEqual(FEED_STATS.dealsInFeed);
    expect(FEED_STATS.findsHalfOffOrMore).toBeLessThanOrEqual(FEED_STATS.dealsWithReferencePrice);
    expect(FEED_STATS.postsWithSourceLink).toBeLessThanOrEqual(FEED_STATS.dealsInFeed);
  });

  it('are plausible for a real deal feed', () => {
    // If the median saving is 5% the feed is broken, not honest.
    expect(FEED_STATS.medianSavingPct).toBeGreaterThan(20);
    expect(FEED_STATS.medianSavingPct).toBeLessThan(100);
    // The exported constant is gone — it is measured live now. Assert against
    // the corrected figure on the record, and against the rule itself.
    expect(FEED_STATS.postsWithSourceLink).toBeGreaterThan(50);
  });

  it('derives the percentages rather than hard-coding them', () => {
    // pctPostsLinkable is gone — it is measured live in lib/useLinkability.js
    // now, because the derived constant counted 9 Discord channel links as
    // links to a listing. Asserting it stays removed is the point.
    expect(honestClaimsSrc).not.toMatch(/pctPostsLinkable/);
    expect(pctFindsHalfOff).toBe(
      Math.round((FEED_STATS.findsHalfOffOrMore / FEED_STATS.dealsWithReferencePrice) * 100)
    );
  });

  it('leaves the member count unset rather than guessing it', () => {
    // We genuinely do not know it, and an absent stat is honest where an
    // invented one is not. Set it to a real number when you have one.
    expect(MEMBER_COUNT).toBeNull();
  });
});

describe('no invented numbers in the rendered copy', () => {
  it('finds no member-count, average-savings, volume or review claims', () => {
    const offenders = [];
  for (const file of walk('src/routes')) {
    if (!/\.jsx$/.test(file)) continue;
    const src = stripComments(read(file));
    src.split('\n').forEach((line, i) => {
      if (/^\s*(?:\/\/|\*)/.test(line)) return;
      // A claim about US, not about an example post. "10,000+" / "10K+" /
      // "thousands of deal hunters" / "93% average savings" / "50+ a day".
      if (/\b10,?000\+|10K\+|thousands of deal hunters|Trusted by thousands/.test(line)) {
        offenders.push(`${file}:${i + 1} member-count claim — ${line.trim().slice(0, 90)}`);
      }
      if (/average savings/i.test(line)) {
        offenders.push(`${file}:${i + 1} unverifiable average — ${line.trim().slice(0, 90)}`);
      }
      if (/every deal (?:is )?manually reviewed/i.test(line)) {
        offenders.push(`${file}:${i + 1} review claim — ${line.trim().slice(0, 90)}`);
      }
      if (/\b50\+ (?:deals|posts|new)/i.test(line)) {
        offenders.push(`${file}:${i + 1} volume claim — ${line.trim().slice(0, 90)}`);
      }
    });
    }
    expect(offenders).toEqual([]);
  });
});

describe('community stats describe the feed, not our size', () => {
  it('every stat says what it measures', () => {
    for (const stat of COMMUNITY_STATS(96)) {
      // "Median saving on a posted find" is verifiable. "Average savings" is
      // a claim about members that nothing here can support.
      expect(stat.label).not.toMatch(/average savings/i);
      expect(stat.label.length).toBeGreaterThan(0);
    }
  });

  it('leads with a number we can actually produce', () => {
    const values = COMMUNITY_STATS(96).map((s) => s.value);
    expect(values).toContain(String(FEED_STATS.dealsInFeed));
    expect(values).toContain(`${FEED_STATS.medianSavingPct}%`);
  });
});
