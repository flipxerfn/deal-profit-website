// The hero live feed.
//
// This shipped broken once. `let alive = true` is a plain binding, but the
// guard was written `if (!alive.current) return;` — so `alive.current` is
// always `undefined`, the early return fired on every single run, and the feed
// never populated. The component silently fell back to the archived examples it
// was built to replace. Build passed, unit tests passed, and it was live and
// wrong on goosiev.com until someone read the network log.
//
// These gates exist because the failure was silent in every automated sense.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const raw = readFileSync(resolve(root, 'src/components/LiveHeroFeed.jsx'), 'utf8');
// Comments explain the bug, and would otherwise trip the gate looking for it.
const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const home = readFileSync(resolve(root, 'src/routes/Home.jsx'), 'utf8');

describe('the hero actually populates', () => {
  it('guards on the binding, not a ref property', () => {
    // `alive` is declared as `let`, so `alive.current` is always undefined and
    // `!undefined` is true — the return happened every time.
    expect(src).toMatch(/let alive = true;/);
    expect(src).toMatch(/if \(!alive\) return;/);
    expect(src, 'a plain binding has no .current — this returns early always').not.toMatch(
      /alive\.current/
    );
  });

  it('still guards against setting state after unmount', () => {
    expect(src).toMatch(/return \(\) => \{\s*alive = false;/);
    expect(src).toMatch(/if \(alive\) setDeals\(null\);/);
  });

  it('reaches the network', () => {
    expect(src).toMatch(/await fetch\(ENDPOINT/);
    expect(src).toContain("const ENDPOINT = '/api/deals'");
  });
});

describe('the hero is the live feed, not the archived set', () => {
  it('is what Home renders in the hero card', () => {
    expect(home).toContain('import LiveHeroFeed');
    expect(home).toMatch(/<LiveHeroFeed \/>/);
  });

  it('does not build a feed from the archived data', () => {
    // The archived "Recent finds — examples" ticker was the whole problem: the
    // biggest element on the page was captioned as a demo, and it was rendered
    // from a hard-coded array rather than from the API.
    //
    // This used to assert `not.toMatch(/<LiveTicker/)` — a check on a
    // component NAME. That is the wrong shape: it fires on any component
    // called LiveTicker, including one that fetches /api/deals and is exactly
    // what the page should have. It went off the first time a live strip was
    // added. Asserted on the data source instead, which is the actual defect.
    expect(home).not.toMatch(/const TICKER\s*=/);
    expect(home).not.toMatch(/<CaughtFeed/);
  });

  it('leads the hero card, ahead of the archived example', () => {
    // The card used to open with a large image of an RTX 5060 listed at
    // $39.99 — a deal that never existed — captioned "the live feed is below".
    // So the largest element and the first words a visitor read on the front
    // page were a fabricated find, on a page whose entire pitch is that the
    // finds are real.
    //
    // Asserted on source ORDER, because that is the actual defect: the example
    // is allowed to exist, and it is allowed to be visible, it just must not
    // be what the eye lands on first.
    // `src={rtpcImg}`, not `rtpcImg` — the identifier first appears on the
    // import line, near the top of the file, so matching the bare name
    // compares the live feed against an import statement and reports an
    // ordering failure that does not exist.
    const feedAt = home.indexOf('<LiveHeroFeed />');
    const exampleImgAt = home.indexOf('src={rtpcImg}');
    expect(feedAt, 'LiveHeroFeed not found in Home').toBeGreaterThan(-1);
    expect(exampleImgAt, 'archived example image not found in Home').toBeGreaterThan(-1);
    expect(feedAt, 'the archived example is still ahead of the live feed').toBeLessThan(exampleImgAt);
  });

  it('does not float a fabricated discount figure over the live feed', () => {
    // A badge anchored top-right said "Example find / 93% OFF". Once the live
    // feed moved to the top of the card that badge labelled real finds as an
    // example, and it put a fabricated statistic in the most prominent
    // position on the page. The example is labelled inline instead, attached
    // to the thing it labels.
    expect(home).not.toMatch(/93% OFF<\/p>/);
    // Whatever discount figures remain must say they are archived.
    const claims = home.match(/93% off/gi) ?? [];
    for (const c of claims) {
      const at = home.toLowerCase().indexOf(c.toLowerCase());
      const window = home.slice(Math.max(0, at - 120), at + 40);
      expect(window, `an unlabelled "${c}" near: ${window.slice(-90)}`).toMatch(
        /example/i
      );
    }
  });

  it('labels an archived example as archived', () => {
    // One archived card is still on the page, for the "93% off" hero visual.
    // That is fine — as long as it says so. The failure is a reader being
    // unable to tell an example from a live find, not the example itself.
    if (!/example/i.test(home)) return;
    expect(home).toMatch(/[Aa]rchived example/);
  });

  it('no strip on the page is built from a hard-coded array', () => {
    // The specific regression this guards: a scrolling strip of made-up
    // findings presented as current. Checked on the DATA the front page's
    // strips render, not on what they are called — a live component can have
    // any name at all.
    const strips = readFileSync(resolve(root, 'src/components/LiveTicker.jsx'), 'utf8');
    expect(strips).toMatch(/await fetch\(/);
    expect(strips).toMatch(/const ENDPOINT = '\/api\/deals'/);
  });

  it('says so when the feed is unreachable instead of silently showing examples', () => {
    // A silent fallback puts the fake rows back with no indication.
    expect(src).toContain('Live feed unreachable');
    expect(src).toContain('Pulled live from Discord');
  });

  it('shows a real timestamp when a find carries one', () => {
    expect(src).toMatch(/caught \{timeAgo\(deal\.postedAt\)\}/);
    expect(src).toContain('archived example');
  });
});
