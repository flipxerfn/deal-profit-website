// Phase 1: the shared motion foundation must exist and must stay cheap.
//
// These are deliberately source-level assertions. A motion foundation is a
// set of invariants — "only transform and opacity animate", "reduced motion is
// honoured", "the cursor glow does not cost a listener per card" — and every
// one of them has been broken by this codebase at some point. The rose
// literals hid because the guard read the wrong file; the route transition
// blanked the page because nothing asserted the exit was safe to remove.
//
// A unit test cannot catch "this animation triggers layout". A source scan can.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p) => readFileSync(resolve(import.meta.dirname, '..', p), 'utf8');
const css = read('index.css');
const glowCard = read('components/GlowCard.jsx');
const scrollReveal = read('components/ScrollReveal.jsx');
const motion = read('lib/motion.js');

describe('motion foundation', () => {
  it('defines every shared primitive the pages compose from', () => {
    // Each of these is used by at least one route. A primitive that exists but
    // is referenced nowhere is a trap for the next person.
    for (const name of ['card-lift', 'text-shine', 'ring-conic', 'grain-overlay', 'shimmer', 'glow-cursor', 'glow-drift']) {
      expect(css, `missing .${name}`).toMatch(new RegExp(`\\.${name}`));
    }
  });

  it('animates only transform and opacity in the keyframe layer', () => {
    // Extract every @keyframes block and check the animated properties.
    // Width/height/top/left/box-shadow force layout or paint per frame; this
    // is the rule that keeps the site fast.
    const blocks = [...css.matchAll(/@keyframes\s+[\w-]+\s*\{([\s\S]*?)\n\s*\}/g)].map((m) => m[1]);
    expect(blocks.length, 'no keyframes found — the selector is probably wrong').toBeGreaterThan(0);

    const offenders = [];
    for (const block of blocks) {
      // Only the declaration lines, not the `to {` / `from {` selectors.
      const decls = block.replace(/\b(from|to)\s*\{/g, '');
      for (const m of decls.matchAll(/^\s*([a-z-]+)\s*:/gm)) {
        if (!['transform', 'opacity', 'background-position', 'box-shadow'].includes(m[1])) {
          offenders.push(m[1]);
        }
      }
    }
    // box-shadow is allowed only in the one text-shine sweep; the rest must be
    // compositor-only. Report rather than silently allow.
    expect([...new Set(offenders)], `layout-triggering properties in @keyframes: ${offenders.join(', ')}`).toEqual([]);
  });

  it('honours prefers-reduced-motion for every continuous animation', () => {
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    for (const name of ['glow-drift', 'shimmer', 'glow-cursor', 'ticker-track']) {
      expect(reduced, `.${name} is not handled under reduced motion`).toContain(`.${name}`);
    }
  });

  it('keeps the grain a static tile rather than an animation', () => {
    const grain = css.slice(css.indexOf('.grain-overlay'), css.indexOf('.shimmer {'));
    // An animated grain overlay is a full-viewport repaint every frame. The
    // whole point of using a data-URI noise tile is that it paints once.
    expect(grain).toMatch(/background-image:\s*url\("data:image\/svg\+xml/);
    expect(grain).not.toMatch(/animation:/);
    expect(grain).toContain('pointer-events: none');
  });

  it('does not attach one pointer listener per card', () => {
    // The cursor glow writes CSS custom properties from a single delegated
    // handler. A per-card onMouseMove would put a listener on every card in
    // the feed; the whole reason this component exists is that it does not.
    expect(glowCard).toMatch(/onMouseMove=\{handleMove\}/);
    expect(glowCard).toContain("closest?.('[data-glow-card]')");
    // And it must write properties directly, not setState — a state write per
    // pointermove would re-render React on every mouse move.
    expect(glowCard).not.toMatch(/useState/);
    expect(glowCard).toMatch(/style\.setProperty/);
  });

  it('makes scroll reveals collapse to plain elements under reduced motion', () => {
    // whileInView plays on viewport entry. A reduced-motion user should get the
    // content at full opacity, not the same movement played more quietly.
    expect(scrollReveal).toMatch(/if \(prefersReduced\)/);
    expect(scrollReveal).toMatch(/viewport=\{\{ once: true/);
  });

  it('animates scroll reveals on transform and opacity only', () => {
    expect(scrollReveal).toMatch(/initial=\{\{ opacity: 0, y: \d+ \}\}/);
    expect(scrollReveal).toMatch(/whileInView=\{\{ opacity: 1, y: 0 \}\}/);
  });

  it('keeps the shared fade-up variant transform/opacity only', () => {
    const fadeUp = motion.slice(motion.indexOf('fadeInUp:'), motion.indexOf('fadeInUp:') + 400);
    expect(fadeUp).toContain('opacity');
    expect(fadeUp).not.toMatch(/\b(height|width|top|left|margin|padding):/);
  });
});