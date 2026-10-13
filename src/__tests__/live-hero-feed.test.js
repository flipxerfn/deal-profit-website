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
    // The cleanup sets two pieces of state, so it is a block. The old gate
    // required the single-statement form `if (alive) setDeals(null);` and
    // failed on a refactor that widened the guard rather than weakening it.
    expect(src).toMatch(/if \(alive\)\s*\{/);
    expect(src).toMatch(/setDeals\(null\)/);
    expect(src).toMatch(/setLive\(false\)/);
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
    // That was fixed by putting the live feed first inside the card. The feed
    // has since been reworked again: the archived example is no longer a
    // separate element in Home.jsx at all — it is the FALLBACK inside
    // LiveHeroFeed, rendered only when the live fetch produced nothing. That is
    // a stronger arrangement than source ordering, because an example can no
    // longer be shown alongside live finds even by accident.
    //
    // So the assertion moves onto the component's precedence rule rather than
    // onto line order in Home. `current` is the live set and it is preferred;
    // `fallback` is used only when there is no live data.
    expect(home, 'Home no longer renders the live feed in the hero').toMatch(/<LiveHeroFeed \/>/);
    expect(home, 'the archived image crept back into Home').not.toMatch(/src=\{rtpcImg\}/);

    const currentLine = src.match(/const current = [^;]+;/)?.[0];
    expect(currentLine, 'no live-vs-fallback precedence in LiveHeroFeed').toBeTruthy();
    expect(currentLine, 'the fallback is not gated on `live`').toMatch(/live &&/);

    // And the fallback rows are explicitly stripped of a URL and a timestamp,
    // so an archived example cannot present itself as an openable live find
    // that was "caught" at a time.
    expect(src).toMatch(/FALLBACK\.map\(\(deal\) => \(\{ \.\.\.deal, url: null, postedAt: null \}\)\)/);
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
    // The one place an archived example can still appear is LiveHeroFeed's
    // fallback, and it must say so wherever it shows.
    //
    // This used to check Home.jsx, which no longer contains the example. It
    // looked in the wrong file, so it now checks the component that actually
    // renders it, and it requires the label in BOTH places a reader sees the
    // example: the status badge and the age line.
    expect(src, 'no archived-example label in the hero card').toMatch(/Archived example/);
    expect(src, 'the example badge does not say it is an example').toMatch(/Worked example/);
    // The live counterpart, so the two states cannot collapse into one label.
    expect(src).toMatch(/Live find/);
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
    //
    // The exact sentences were rewritten when the card was reworked; the
    // promise is unchanged and is asserted on the meaning, in both places a
    // reader would look: the provenance line beside the CTA, and the
    // role="status" banner under the card.
    expect(src, 'no "unavailable" provenance line').toMatch(/Live feed temporarily unavailable/);
    expect(src, 'no live provenance line for the healthy state').toMatch(/Posted by the community/);
    expect(src, 'no announced offline notice').toMatch(/role="status"/);
    expect(src).toMatch(/Showing an archived example while the live feed reconnects/);
  });

  it('shows a real timestamp when a find carries one', () => {
    // The age must come from the deal's own postedAt and be a real <time>
    // element, so the machine-readable value matches the visible one.
    expect(src).toMatch(/<time dateTime=\{primary\.postedAt\}>\{age\}<\/time>/);
    expect(src).toMatch(/const age = primary\.postedAt \? timeAgo\(primary\.postedAt\) : null;/);
    // And the fallback branch is labelled archived, not given a fake age.
    expect(src).toMatch(/Archived example · no current offer/);
  });
});
