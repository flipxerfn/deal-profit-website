// Regression: navigating between routes rendered a completely blank page.
//
// Measured on a single DOM node during a /deals -> /upgrade navigation:
//
//    314ms  new route mounts, opacity 1
//    559ms  enter tween running, y heading +18 -> 0
//    612ms  y has passed 0 and reached -2.45px
//    989ms  opacity slams to 0
//   1001ms  transform lands on y:-10 scale:0.996
//
// That final pair is the Layout route wrapper's `exit` target verbatim. The
// exit was firing on a child that was still entering, on the same node, and
// nothing restored the opacity — so the page stayed mounted, in the document,
// at zero opacity, until a hard reload.
//
// This was not a fade that was "too slow to notice". It was a permanent,
// total loss of the page. The guard is therefore structural: the wrapper must
// not declare an exit and must not sit inside an AnimatePresence at all.
//
// A source-level guard is the right instrument here because the failure is a
// library sequencing interaction that no unit test can mount cheaply, and the
// invariant is simple: one half of the transition, not two.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const layout = readFileSync(
  resolve(import.meta.dirname, '../components/Layout.jsx'),
  'utf8'
);

// The route wrapper is the motion.div keyed by pathname.
const routeWrapper = layout.match(
  /<motion\.div\s+key=\{pathname\}[\s\S]*?<\/motion\.div>/
);

describe('route transition wrapper', () => {
  it('is present so this guard is actually guarding something', () => {
    expect(routeWrapper, 'keyed route wrapper not found in Layout.jsx').toBeTruthy();
  });

  it('declares no exit animation', () => {
    // This is the assertion that would have caught the bug. An `exit` prop on
    // the keyed wrapper is what blanked the page.
    expect(routeWrapper[0]).not.toMatch(/\bexit=/);
  });

  it('is not wrapped in AnimatePresence', () => {
    // Even with no exit prop, AnimatePresence was re-triggering the exiting
    // state on the entering child. mode="wait" only delayed it — it broke the
    // first nav; without it, the first two. The exit had to go entirely.
    expect(layout).not.toMatch(/<AnimatePresence/);
    expect(layout).not.toMatch(/<\/AnimatePresence>/);
  });

  it('keeps the entrance, which is the half the reader perceives', () => {
    expect(routeWrapper[0]).toMatch(/\binitial=/);
    expect(routeWrapper[0]).toMatch(/\banimate=/);
  });

  it('animates only transform and opacity', () => {
    // A layout-animating route wrapper forces reflow on every navigation.
    const props = [...routeWrapper[0].matchAll(/\b(\w+)=/g)].map((m) => m[1]);
    const forbidden = props.filter((p) => !['key', 'initial', 'animate', 'transition', 'className'].includes(p));
    expect(forbidden, `route wrapper animates layout properties: ${forbidden.join(', ')}`).toEqual([]);
  });

  it('honours prefers-reduced-motion on both initial and transition', () => {
    expect(routeWrapper[0]).toMatch(/initial=\{prefersReduced \? false :/);
    expect(routeWrapper[0]).toMatch(/prefersReduced\s*\?\s*\{\s*duration:\s*0\s*\}/);
  });
});