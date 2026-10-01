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
// The cause
// ---------
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

const home = readFileSync(resolve(import.meta.dirname, '../routes/Home.jsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('the hero fits a phone', () => {
  it('trust indicators may shrink inside the two-column grid', () => {
    // The exact defect. `shrink-0` pinned each item at 239px, two of them
    // plus the gap made 494px, and the whole hero column took that width.
    const grid = home.match(/TRUST_ITEMS\([^)]*\)\.map\(([\s\S]*?)\)\)\}/);
    expect(grid?.[0], 'trust item markup not found').toBeTruthy();

    // The OUTER item only. The icon span inside keeps shrink-0 and should —
    // an icon that squashes looks broken. The first div after the map callback
    // is the item wrapper, which is the one that was pinned.
    const item = grid[0].match(/<div key=\{item\.label\} className="([^"]*)"/);
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