// Visual refresh: design tokens + shared utilities must exist in the stylesheet.
// (Tasks 2/4 consume these exact names.)
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

const css = fs.readFileSync(path.join(here, 'index.css'), 'utf8');

/**
 * Every source file a rose literal could hide in. `walkSourceFiles` exists so
 * the recolour guard below can check components as well as the stylesheet —
 * the first version of that test read only index.css and passed while 12
 * components still carried pink shadows.
 */
function walkSourceFiles() {
  const out = [];
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // node_modules and test fixtures are not shipped source.
        if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
        visit(full);
      } else if (/\.(jsx?|css)$/.test(entry.name)) {
        // Skip this file: it contains the rose pattern as a literal string, so
        // the guard would otherwise match its own source and fail forever.
        if (path.resolve(full) === path.resolve(here + '/design-tokens.test.js')) continue;
        out.push(full);
      }
    }
  };
  visit(here);
  return out;
}

describe('visual refresh design system', () => {
  it('keeps the ice token, the one cold accent still earning its place', () => {
    expect(css).toContain('--color-ice: #22d3ee');
  });

  // Ember and lime were retired deliberately. Measured on the deployed hero,
  // four hue families were competing with the brand accent, and neither of these
  // two ever carried meaning — they were defined, reachable, and unused as an
  // accent. A token in @theme is an invitation, and two of those invitations
  // were being declined on every page.
  //
  // Retiring them broke two utilities on the way out — card-lift's
  // `hover:border-ember/40` and text-shine's `via-ember` — which is the proof
  // they were load-bearing after all, just load-bearing on nothing.
  //
  // This asserts they stay gone rather than being quietly reintroduced.
  it.each(['--color-ember', '--color-lime'])('has retired token %s', (token) => {
    expect(css, `${token} is retired; a defined token is an invitation`).not.toMatch(
      new RegExp(`${token}:`)
    );
  });

  it('uses no ember or lime utility anywhere in the stylesheet', () => {
    expect(css).not.toMatch(/\b(bg|text|border|from|via|to|ring)-(ember|lime)/);
  });

  it.each(['.band-full', '.card-lift', '.text-shine', '.ring-conic'])(
    'defines shared utility %s',
    (utility) => {
      expect(css).toContain(utility);
    }
  );

  it('defines the violet brand ramp', () => {
    // The rose ramp (#f43f5e / #e02d4a) was replaced with violet in Oct 2026.
    // The old assertion pinned the rose hex, which made this test fail on a
    // deliberate recolour rather than on an accidental drift — a test that
    // fails whenever you change the thing it names is not protecting anything.
    //
    // What actually matters is that brand and brand-3 are DIFFERENT values.
    // One accent cannot serve both a button fill and small text: bright enough
    // to fill is never dark enough to read. That relationship is the
    // invariant, so it is what gets asserted.
    expect(css).toMatch(/--color-brand:\s*#a78bfa/);
    expect(css).toMatch(/--color-brand-3:\s*#6d28d9/);
    expect(css).toMatch(/--color-brand-2:\s*#c4b5fd/);
    expect(css).toMatch(/--color-glow:\s*#8b5cf6/);

    const brand = css.match(/--color-brand:\s*(#[0-9a-f]{6})/i)?.[1];
    const brand3 = css.match(/--color-brand-3:\s*(#[0-9a-f]{6})/i)?.[1];
    expect(brand).not.toBe(brand3);
  });

  it('no longer references the retired rose anywhere', () => {
    // Rose survived in 22 ambient glow literals in index.css that the token
    // swap did not reach, leaving pink halos under violet text.
    //
    // It then survived AGAIN in 12 components, because this assertion only
    // ever read index.css — and the component literals were written without
    // spaces (`244,63,94`), which a `\s*` pattern would still match but a
    // whole-file scope never would. The scope was the bug, not the pattern.
    // So this now walks every source file.
    expect(css).not.toMatch(/#f43f5e/i);
    expect(css).not.toMatch(/#ff6b8a/i);
    expect(css).not.toMatch(/#e02d4a/i);
    expect(css).not.toMatch(/#f43f8e/i);

    // Pink #f43f8e belongs here too: it survived because the pattern only
    // knew rose (244,63,94). It was painting the hero wash on every page.
    const rose = /244,\s*63,\s*94|244,\s*63,\s*142|#f43f5e|#f43f8e|#ff6b8a|#e02d4a/i;
    const offenders = [];
    for (const file of walkSourceFiles()) {
      if (rose.test(fs.readFileSync(file, 'utf8'))) {
        offenders.push(file);
      }
    }
    expect(
      offenders,
      `retired rose literals still present in:\n  ${offenders.join('\n  ')}`
    ).toEqual([]);
  });
});
