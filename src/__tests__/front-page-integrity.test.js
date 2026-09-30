// Three defects visible on the rendered home page, each found by measuring the
// live site rather than by reading the source.
//
// 1. A section headed "LIVE FINDS" whose cards each said "Archived example" and
//    "EXAMPLE — NO LIVE LISTING". The header contradicted its own content, three
//    screens below a hero that had just been fixed for the same reason.
//
// 2. Every full-bleed band used `width: 100vw`, which is the viewport INCLUDING
//    the scrollbar, laid out inside a box that EXCLUDES it. Each band was 8px
//    too wide, pushing the right edge under the scrollbar — which is exactly
//    where the hero's "93% OFF" badge sits.
//
// 3. Ten-pixel support text in zinc-500 and zinc-600. Measured against the
//    surface it actually sits on, those are 3.76:1 and 2.35:1. Ten-pixel text
//    needs the full 4.5:1; the 3:1 large-text allowance only starts at 18.66px
//    bold or 24px regular.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const home = readFileSync(resolve(root, 'src/routes/Home.jsx'), 'utf8');
const hero = readFileSync(resolve(root, 'src/components/LiveHeroFeed.jsx'), 'utf8');
const finds = readFileSync(resolve(root, 'src/components/LatestFinds.jsx'), 'utf8');
const css = readFileSync(resolve(root, 'src/index.css'), 'utf8');

// The WCAG relative-luminance formula, so the numbers are derived rather than
// copied from a table that could drift out of date.
const luminance = (hex) => {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

// Tailwind's zinc steps, and the surfaces this page actually uses.
const INK = { 400: '#a1a1aa', 500: '#71717a', 600: '#52525b' };
const SURFACE = { night: '#050507', charcoal: '#0d0d11', 'charcoal-2': '#15151d' };

describe('the finds band does not claim to be live while showing examples', () => {
  it('Home renders the live component, not a hard-coded array', () => {
    expect(home).toMatch(/<LatestFinds \/>/);
    // The archived pair was baked in at module scope and rendered directly.
    expect(home).not.toMatch(/HOME_FINDS/);
  });

  it('the live label is conditional on the feed being live', () => {
    expect(finds).toMatch(/\{live \? 'Live finds' : 'Examples'\}/);
    expect(finds).toMatch(/\{live \? 'Latest finds' : 'What a find looks like'\}/);
  });

  it('says so plainly when the feed is unavailable', () => {
    // The reason this regressed: a fallback that looks the same as the real
    // thing. A silent one puts examples back under a "live" heading.
    expect(finds).toMatch(/Live feed unavailable right now/);
  });

  it('pulls from the same endpoint the hero uses', () => {
    expect(finds).toContain("const ENDPOINT = '/api/deals'");
  });

  it('guards on the binding, not a ref property', () => {
    // The hero shipped with `if (!alive.current)` on a plain `let`, which
    // returned early on every run and silently fell back to the examples.
    expect(finds).toMatch(/let alive = true;/);
    expect(finds).toMatch(/if \(!alive\) return;/);
    expect(finds).not.toMatch(/alive\.current/);
  });
});

describe('full-bleed bands are not wider than the document', () => {
  const bleed = css.match(/\.band-bleed\s*\{([\s\S]*?)\n\s*\}/)?.[1] ?? '';

  it('never names a viewport width', () => {
    // 100vw includes the scrollbar; the layout box does not. Any vw here makes
    // the band overshoot by the scrollbar width on every scrollbar-bearing
    // viewport, and clip anything near the right edge.
    expect(bleed, 'band-bleed uses vw units').not.toMatch(/vw\b/);
  });

  it('bleeds by the same padding the containers apply', () => {
    // px-4 sm:px-6 lg:px-8, so the negative margin mirrors that at each stop.
    expect(bleed).toMatch(/margin-inline/);
    expect(css).toMatch(/@media \(min-width: 640px\)[\s\S]{0,160}?\.band-bleed[\s\S]{0,80}?-1\.5rem/);
    expect(css).toMatch(/@media \(min-width: 1024px\)[\s\S]{0,160}?\.band-bleed[\s\S]{0,80}?-2rem/);
  });

  it('still clips so the negative margins cannot produce a scrollbar', () => {
    expect(css).toMatch(/body\s*\{[\s\S]*?overflow-x:\s*clip/);
  });
});

describe('small text is readable', () => {
  it('the trust row does not use sub-12px zinc-500', () => {
    // "67% median off, measured" — a claim about us, at 3.76:1 in 10px.
    expect(home).not.toMatch(/text-\[10px\][^"]*text-zinc-500/);
    expect(home).not.toMatch(/text-\[10px\][^"]*text-zinc-600/);
  });

  it('the hero provenance line is legible', () => {
    // This is the line that tells the reader whether the feed is real, and it
    // was zinc-600 at 10px — 2.35:1 on the card behind it.
    expect(hero).not.toMatch(/text-zinc-600/);
  });

  it('zinc-400 clears 4.5:1 on every surface the home page uses', () => {
    for (const [name, hex] of Object.entries(SURFACE)) {
      const r = contrast(INK[400], hex);
      expect(r, `zinc-400 on ${name} is ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('documents why zinc-500 could not be used', () => {
    // If this ever clears 4.5:1 the constraint can go, and the comment
    // explaining the choice should go with it.
    const r = contrast(INK[500], SURFACE['charcoal-2']);
    expect(r, 'zinc-500 now passes; this rule and its comment can be revisited')
      .toBeLessThan(4.5);
  });
});
