// The live-stats badge used to be pinned to the bottom-left corner at z-40 and
// covered real content on EVERY route.
//
// Measured across all six routes at 1440 and 390, the `fixed` badge sat on top
// of: a deal card image on /deals, the amber trial-notice panel on /welcome, a
// section on /discord, the pricing body on /setup-request, the page container
// on /upgrade. It is `pointer-events-none` so it never blocked a click, but it
// is opaque — it permanently covered a 241x31px patch of whatever was beneath
// it, and on mobile it landed on the category filter pills so half a pill
// showed through and the row looked broken.
//
// It was also not live in the way a pinned badge implies: it fetches once on
// mount. "Always on screen" was buying nothing that "present on every page"
// does not.
//
// These assertions exist because the failure mode is invisible in review —
// a badge overlapping content looks intentional in a screenshot until you
// check what is underneath it.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { resolve } from 'node:path';

const read = (p) => fs.readFileSync(resolve(import.meta.dirname, '..', p), 'utf8');

const counter = read('components/SiteCounter.jsx');
const layout = read('components/Layout.jsx');

describe('the live-stats badge', () => {
  it('is in the document flow, not pinned over it', () => {
    // Strip comments first. The explanatory block above the component contains
    // the word "fixed" several times precisely because it is describing the
    // change, and a guard that trips on its own documentation is a guard that
    // gets deleted instead of read.
    const code = counter.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code, 'SiteCounter went back to position:fixed').not.toMatch(/\bfixed\b/);
    expect(code).not.toMatch(/z-40|z-\[?4\d/);
  });

  it('still appears on every page', () => {
    // Rendering it inline must not come at the cost of it disappearing. It is
    // rendered once from Layout, which wraps every route.
    expect(layout).toContain('<SiteCounter');
  });

  it('still shows the computed figures, not hardcoded ones', () => {
    // It renders whatever the live endpoint returned. Inlining it did not
    // change the source, and this is the property that actually matters on a
    // site whose claim is that its numbers are real.
    expect(counter).toContain('/api/deals');
    expect(counter).toMatch(/stats\.finds/);
    expect(counter).toMatch(/stats\.median/);
  });

  it('carries an accessible label for the figures it shows', () => {
    expect(counter).toMatch(/aria-label=\{`\$\{stats\.finds\} finds posted/);
  });

  it('leaves no other page-obscuring fixed overlay behind', () => {
    // Guard the class of problem rather than the one instance. A fixed element
    // with a real background, above main's stacking level, is what covered
    // content. Decorative backdrops are exempt: they are z-0, pointer-events
    // none, and sit BELOW the content they appear to intersect.
    const offenders = [];
    const dir = resolve(import.meta.dirname, '../components');
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, e.name);
        if (e.isDirectory()) { walk(full); continue; }
        if (!/\.jsx$/.test(e.name)) continue;
        const text = fs.readFileSync(full, 'utf8');
        // className strings containing both a fixed position and a high z-index
        for (const m of text.matchAll(/className="([^"]*\bfixed\b[^"]*)"/g)) {
          const cls = m[1];
          // A full-viewport scrim is a modal backdrop and is SUPPOSED to cover
          // what is behind it — those are `inset-0` with a dimming colour.
          // Flagging them would mean the guard can never be satisfied, and a
          // permanently-red test is a test nobody runs.
          const isScrim = /inset-0/.test(cls) && /(bg-black|bg-night|backdrop-blur)/.test(cls);
          if (/z-(\d\d|[2-9]\d)/.test(cls) && !/pointer-events-none/.test(cls) && !isScrim) {
            offenders.push(`${path.relative(dir, full)}: ${cls.slice(0, 70)}`);
          }
        }
      }
    };
    walk(dir);
    expect(
      offenders,
      `fixed overlays above content (these covered real UI):\n  ${offenders.join('\n  ')}`
    ).toEqual([]);
  });
});