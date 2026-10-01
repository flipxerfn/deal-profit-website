// The corner badge was reporting the site's own weakness.
//
// It rendered "96 visitors · 2 online", fixed in the bottom-left of every
// page, on the pages that ask for $25. A visitor who sees that concludes
// nobody is here and nobody has ever been here — it is negative social proof
// in the exact place the reader is deciding.
//
// It was also reporting the wrong thing twice over:
//
//   - "96 visitors" is a lifetime count of distinct first-party identifiers.
//     On a site with roughly 75 unique visitors, the honest headline is
//     "small", so the number was accurate and useless.
//   - "2 online" is a live sample that is near-zero most of the time by
//     nature. It can only ever hurt.
//
// What belongs in that corner is evidence of the product working, not a
// census of traffic. The feed already measures 200 finds at a 67% median off,
// live. That is the thing worth showing.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(import.meta.dirname, '../components/SiteCounter.jsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('the badge stops reporting the site looking empty', () => {
  it('does not show a visitor count', () => {
    // An accurate low number is still a bad number here.
    expect(src).not.toMatch(/visitors/);
  });

  it('does not show a live online count', () => {
    // A near-zero live sample is noise that can only cost conversions.
    expect(src).not.toMatch(/\bonline\b/i);
  });

  it('shows the feed instead, and reads it live', () => {
    expect(src).toMatch(/fetch\(ENDPOINT/);
    expect(src).toMatch(/const ENDPOINT = '\/api\/deals'/);
  });

  it('does not import the stale snapshot', () => {
    // FEED_STATS holds figures measured on a fixed date and drifts from the
    // feed from the moment it is written. This badge must compute.
    expect(src).not.toMatch(/FEED_STATS/);
  });

  it('claims nothing about earnings', () => {
    for (const phrase of ['income', 'earn', 'profit per', 'guaranteed', '/month']) {
      expect(src.toLowerCase().includes(phrase), `badge contains "${phrase}"`).toBe(false);
    }
  });
});

describe('it renders nothing rather than a placeholder', () => {
  it('bails when there is no data', () => {
    // "0 finds" in the corner is the same self-own as "96 visitors".
    expect(src).toMatch(/if \(!stats\) return null;/);
  });

  it('refuses to quote a median off a handful of listings', () => {
    // Two deals is not a median. The old badge printed whatever the API said
    // at any sample size, which is how a 96-visitor number ended up framed as
    // a success metric. A median needs enough behind it to mean anything, so
    // the threshold is enforced where the number is produced.
    const thr = src.match(/measured\.total\s*<\s*(\d+)/);
    expect(thr?.[1], 'no sample-size threshold found').toBeTruthy();
    // A bare /<\d+/ match is satisfied by "< 1", which is the substitution this
    // gate exists to catch — so the number is read and bounded, not matched.
    expect(Number(thr[1]), `median allowed from only ${thr[1]} listings`).toBeGreaterThanOrEqual(5);
    expect(src).toMatch(/setStats\(null\)/);
  });

  it('keeps the badge non-interactive and out of the tab order', () => {
    // It is a status readout. Making it focusable adds a tab stop for
    // information nobody acts on.
    expect(src).toMatch(/pointer-events-none/);
    expect(src).not.toMatch(/<button/);
    expect(src).not.toMatch(/tabIndex/);
  });
});