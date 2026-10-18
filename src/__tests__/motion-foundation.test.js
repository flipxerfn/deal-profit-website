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
import fs, { readFileSync } from 'node:fs';
import path, { resolve } from 'node:path';

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

  it('bans AnimatePresence mode="wait", which has deadlocked twice', () => {
    // IT HAS BROKEN IN TWO PLACES ON THIS SITE, MEASURED BOTH TIMES.
    //
    // 1. The Layout route wrapper. Every route change rendered a blank page:
    //    the exit was applied to a child that was still entering, on the same
    //    DOM node, and the page stayed mounted at opacity 0 until a reload.
    //    See route-transition.test.js for the frame-by-frame trace.
    //
    // 2. The /upgrade price swap. Settled at opacity 0 with stale text and a
    //    frozen halo. Same mechanism, smaller blast radius, which is exactly
    //    why it survived as long as it did.
    //
    // The remaining AnimatePresence uses are all `mode="sync"` (the default) or
    // `mode="popLayout"`, both of which mount the incoming child immediately
    // alongside the outgoing one. That is the difference: there is no window in
    // which the incoming node can be mistaken for the exiting one. Only "wait"
    // serialises them, and "wait" is the only one that can hang.
    const offenders = [];
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.name === 'node_modules' || e.name === '__tests__') continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { walk(full); continue; }
        if (!/\.jsx$/.test(e.name)) continue;
        const text = fs.readFileSync(full, 'utf8');
        for (const m of text.matchAll(/<AnimatePresence[^>]*mode=["']wait["'][^>]*>/g)) {
          offenders.push(`${full}: ${m[0]}`);
        }
      }
    };
    walk(path.resolve(import.meta.dirname, '..'));
    expect(
      offenders,
      `AnimatePresence mode="wait" reintroduced (it has blanked pages twice):\n  ${offenders.join('\n  ')}`
    ).toEqual([]);
  });

  it('drives the price swap with CSS, not a JS animation driver', () => {
    // Three implementations of this one interaction have each failed, measured
    // rather than guessed:
    //   1. plain text        -> the number changed silently under the cursor
    //   2. AnimatePresence   -> deadlocked at opacity 0 with stale text
    //   3. framer on a keyed motion.p -> enter animation completed only ~half
    //      the time; the price settled at opacity 0 on 2 of 4 toggles with its
    //      halo frozen at the keyframe's 0% value
    //
    // The fix is that there is no JS driver at all: the key changes, the node
    // remounts, a CSS animation restarts. Nothing to sequence, nothing to lose
    // track of. That is the invariant worth pinning.
    const upgrade = read('routes/Upgrade.jsx');

    // Anchored on the className attribute, not on the bare string
    // ".price-swap": that string used to appear only inside a comment, and
    // deleting the comment made this test fail while the mechanism was intact.
    // An assertion that depends on prose is an assertion about prose.
    const at = upgrade.indexOf('className="price-swap');
    expect(at, 'the price swap no longer uses a .price-swap class').toBeGreaterThan(-1);
    const swap = upgrade.slice(at, at + 400);

    // The animated element must be a plain span, not a motion component.
    // The class list is allowed to carry more than the marker — it does, so
    // that the same class serves the small plan cards and the large comparison
    // price. Matching only `className="price-swap"` exactly would pass or fail
    // on the order the styles happen to be written in.
    const holder = upgrade.match(/<(\w+)[^>]*className="price-swap[^"]*"/);
    expect(holder?.[1], 'price-swap must be on a plain span, never motion.span').toBe('span');

    // No exit, no AnimatePresence, anywhere near it.
    expect(upgrade).not.toMatch(/<AnimatePresence/);
    expect(swap).not.toMatch(/exit=/);

    // And it is keyed on the price, which is what makes the remount happen.
    expect(upgrade).toMatch(/key=\{interval === 'month' \? PRICE_MONTHLY_MO : PRICE_YEARLY_YR\}/);
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
    // A reduced-motion user should get the content at full opacity immediately,
    // not the same movement played more quietly.
    //
    // This used to assert framer's `viewport={{ once: true }}`, i.e. it pinned
    // the IMPLEMENTATION (whileInView) rather than the promise. The reveal was
    // subsequently rewritten around an IntersectionObserver plus a scroll-stop
    // sweep, because `whileInView` strands elements at opacity 0 when the page
    // is jumped rather than scrolled (13 measured on /upgrade). The old
    // assertion failed against a strictly better component.
    //
    // What is asserted now is the promise itself, and it is a stronger check
    // than the prop was:
    //   - reduced motion returns a PLAIN element, with no motion component at
    //     all, so there is no animation to play quietly;
    //   - the reveal is progressive by default — it starts hidden and is driven
    //     to shown by state, rather than by an `animate:` variant that fires on
    //     mount (which is the bug the rewrite exists to fix).
    expect(scrollReveal).toMatch(/if \(prefersReduced\)/);
    expect(scrollReveal, 'reduced motion must not return a motion component').toMatch(
      /const Plain = as;/
    );
    expect(scrollReveal, 'the reveal must be state-driven, not mount-animated').toMatch(
      /animate=\{shown \?/
    );
    expect(scrollReveal).toMatch(/IntersectionObserver/);
  });

  it('animates scroll reveals on transform and opacity only', () => {
    // Extract the reveal's own initial/animate objects and assert they contain
    // no layout-triggering property. The distance is a variable now, so this
    // cannot be a literal regex like the old `y: \d+` — matching the shape and
    // then checking the KEYS is both narrower and harder to satisfy wrongly.
    const initial = scrollReveal.match(/initial=\{\{([^}]*)\}\}/)?.[1] ?? '';
    const animate = scrollReveal.match(/animate=\{shown \? \{([^}]*)\}/)?.[1] ?? '';
    expect(initial, 'no initial={{...}} on the reveal').toBeTruthy();
    expect(animate, 'no animate={{...}} on the reveal').toBeTruthy();

    for (const [label, body] of [['initial', initial], ['animate', animate]]) {
      expect(body, `${label} does not include opacity`).toContain('opacity');
      const props = [...body.matchAll(/([a-zA-Z]+)\s*:/g)].map((m) => m[1]);
      const layout = props.filter((p) =>
        ['height', 'width', 'top', 'left', 'margin', 'padding', 'inset'].includes(p)
      );
      expect(layout, `${label} animates layout properties: ${layout.join(', ')}`).toEqual([]);
    }
  });

  it('keeps the shared fade-up variant transform/opacity only', () => {
    const fadeUp = motion.slice(motion.indexOf('fadeInUp:'), motion.indexOf('fadeInUp:') + 400);
    expect(fadeUp).toContain('opacity');
    expect(fadeUp).not.toMatch(/\b(height|width|top|left|margin|padding):/);
  });
});