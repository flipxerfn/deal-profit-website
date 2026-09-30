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

  it('no longer renders the archived ticker', () => {
    // The archived "Recent finds — examples" ticker was the whole problem: the
    // biggest element on the page was captioned as a demo.
    expect(home).not.toMatch(/<LiveTicker/);
    expect(home).not.toMatch(/<CaughtFeed/);
    expect(home).not.toMatch(/const TICKER = DEALS/);
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
