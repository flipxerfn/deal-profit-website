// The hero column was 494px wide on a 375px screen, and body has overflow-x: clip.
//
// What it looked like
// -------------------
// On a 390px phone the front page silently truncated: "GLITCH FINDS" ran off
// the edge, the hero paragraph was cut mid-word, "Real savings / 67% median
// off, m…" was clipped. There was no horizontal scrollbar — body carries
// `overflow-x: clip` — so the content was simply gone with no way to reach it.
// That is worse than an overflow you can scroll to.
//
// Why it is easy to miss
// ---------------------
// `document.documentElement.scrollWidth` was 375, comfortably under the 390
// viewport, and `canScrollRight` was false. Every "does the page scroll
// sideways" check passes on a clipped layout. The measurement that finds it
// walks the tree and compares each element's right edge against
// clientWidth — which is how this was finally located: 220 elements overhanging
// on live, zero after the fix.
//
// The cause — and the wrong fix I shipped first
// --------------------------------------------
// The COLUMN, not the items. The hero grid's left child was a bare <div> with
// no min-w-0, and a grid item defaults to min-width: auto, so it resolves to
// its content's intrinsic width and refuses to shrink. Everything inside it
// inherited that width.
//
// The first attempt removed `shrink-0` from the trust indicators and shipped
// it. That made things WORSE — the column went from 494px to 627px, because
// without shrink-0 those items grew to max-content — and the gate I wrote for
// it passed while the actual bug was still live and deployed. A gate aimed at
// a plausible-looking cause is worse than no gate, because it reports success.
//
// The 220-overhanging count only dropped to zero once the column got min-w-0.
//
// An earlier tell
// ----------------
// Each trust indicator carried `shrink-0`. Inside a `grid-cols-2` that is
// meaningless — grid tracks size to content, and shrink has nothing to shrink
// against — but it still pins the item at its intrinsic width. Two items at
// 239px plus `gap-x-4` is 494px, which is exactly the width the whole hero
// column resolved to. The h1 and the paragraph are inside that column, so they
// inherited it and overflowed with it.
//
// `shrink-0` was clearly added for the `sm:flex` layout on the same row, where
// it does the right thing. The bug is that one class served two layouts, only
// one of which needed it.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const homeRaw = readFileSync(resolve(import.meta.dirname, '../routes/Home.jsx'), 'utf8');

// Comments are stripped before any structural match, as everywhere else in
// this suite. The first version of the column gate did not, and the gate
// PASSED with min-w-0 removed: the explanatory comment sits between the grid
// and its column, so a bounded regex skipped past both and matched something
// further down. A gate that cannot reach the thing it is checking is the
// failure mode this whole file exists to prevent, occurring inside it.
const home = homeRaw
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('the hero fits a phone', () => {
  it('the hero grid COLUMN can shrink', () => {
    // The actual defect. A grid item defaults to min-width: auto, so this bare
    // <div> sized to its content's intrinsic width (627px in a 375px
    // viewport) and every child inherited it.
    // The FIRST tag after the grid opening must be the column, carrying min-w-0.
    //
    // Two looser versions of this gate both passed with the defect in place.
    // One scanned forward for any <div className="..."> and found a DIFFERENT
    // element — the trust label's own min-w-0 wrapper — which made the gate
    // green while the column had no class at all. The other matched the column
    // only when it happened to have a class, so removing the class entirely
    // skipped past it rather than failing.
    const after = home.split('lg:grid-cols-[1fr_0.9fr]')[1];
    expect(after, 'hero grid not found').toBeTruthy();

    const firstTag = after.match(/<([a-z]+)(\s[^>]*?)?>/);
    expect(firstTag?.[0], 'no element found after the hero grid').toBeTruthy();
    expect(
      firstTag[0],
      `the first element inside the hero grid is "${firstTag[0]}" — the column itself needs min-w-0, not some later element`
    ).toContain('min-w-0');

    // BOTH children, not just the first.
    //
    // At mobile the grid is a single column, so both children share one track
    // and whichever is widest sets it for both. Fixing only the left column
    // therefore changed nothing: the hero card was 553px on a 375px screen and
    // the track followed it. This cost two rounds — the first commit fixed the
    // wrong child, the second fixed one of two.
    // Anchored on the card itself rather than on "the next motion.div" —
    // the first version scanned forward and matched the CTA row inside the
    // left column, which passed while the real grid child had no min-w-0.
    const card = home.match(/className="([^"]*)"\s*>\s*\n\s*<div className="surface-raised-strong/);
    expect(card?.[1], 'the motion.div wrapping the hero card was not found').toBeTruthy();
    expect(
      card[1],
      'the hero card is the widest grid child and needs min-w-0, or it sets the track for both columns'
    ).toMatch(/min-w-0/);
  });

  it('trust indicators may shrink inside the two-column grid', () => {
    // Necessary but NOT sufficient — this is what the first attempt fixed, and
    // the bug survived it. Kept because shrink-0 on a grid item is still
    // wrong, but the gate above is the one that matters.
    const grid = home.match(/TRUST_ITEMS\([^)]*\)\.map\(([\s\S]*?)\)\)\}/);
    expect(grid?.[0], 'trust item markup not found').toBeTruthy();

    // The OUTER item only. The icon span inside keeps shrink-0 and should —
    // an icon that squashes looks broken. The first div after the map callback
    // is the item wrapper, which is the one that was pinned.
    // The wrapper is a motion.div now — it became a child of the hero entrance
    // stagger so the four items arrive one after another. The props span
    // several lines, so match the element and then pull its className.
    const itemEl = grid[0].match(
      /<(?:motion\.)?div\s+key=\{item\.label\}[\s\S]*?className="([^"]*)"/
    );
    const item = itemEl ? [itemEl[0], itemEl[1]] : undefined;
    expect(item?.[1], 'trust item wrapper not found').toBeTruthy();
    expect(item[1], 'trust item wrapper carries shrink-0, which pins it in a grid')
      .not.toMatch(/shrink-0/);
    expect(item[1]).toMatch(/min-w-0/);
  });

  it('the label wrapper may shrink too', () => {
    // Without min-w-0 on the inner wrapper, the description text still sets the
    // floor for the track even once the outer item can shrink.
    const grid = home.match(/TRUST_ITEMS\([^)]*\)\.map\(([\s\S]*?)\)\)\}/);
    expect(grid[0]).toMatch(/<div className="min-w-0">/);
  });
});

describe('clipping cannot hide an overflow again', () => {
  it('body still clips horizontally, so this is not detectable by scrollWidth', () => {
    // Asserted deliberately. This is WHY the bug survived: every
    // scrollWidth-based check passes on a clipped overflow, so the layout
    // gate above has to exist rather than being replaced by a
    // "does it scroll" check that would always be green.
    const css = readFileSync(resolve(import.meta.dirname, '../index.css'), 'utf8');
    expect(css).toMatch(/overflow-x:\s*clip/);
  });
});