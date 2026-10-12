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
    // THIS GUARD HAS BEEN WRONG THREE TIMES. Worth recording.
    //
    // v1 matched four literal hexes and `244,63,94`, and only read index.css.
    //   -> 12 components kept pink shadows.
    // v2 walked every source file but still matched literals.
    //   -> motion.js CTA pulse kept a rose box-shadow.
    // v3 added pink #f43f8e.
    //   -> the primary Button kept rgba(224,45,74) and hover:bg-[#c92640],
    //      so the site's main call to action turned RED on hover.
    //
    // The bug was never the pattern. Enumerating values cannot work: there are
    // infinitely many ways to write a rose, and every one of them that gets
    // written is a value nobody remembered to add to the list.
    //
    // So this matches on HUE BAND instead. Rose and pink sit in the magenta
    // arc, roughly hue 320-359. Pure red is hue 0-20 and is deliberately still
    // allowed — `destructive` and error states are legitimately red, and a
    // guard that banned red would force those to be wrong. The two bands do
    // not overlap, so the ban is precise rather than a blunt "no warm colours".
    const hexes = [];
    const rgbs = [];
    const HEAT = (hex) => {
      const n = parseInt(hex, 16);
      const r = ((n >> 16) & 255) / 255;
      const g = ((n >> 8) & 255) / 255;
      const b = (n & 255) / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const d = max - min;
      if (d < 0.12) return null; // greys and near-neutrals carry no hue opinion
      let h;
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h = Math.round(h * 60);
      if (h < 0) h += 360;
      // The magenta/rose arc only.
      return h >= 320 && h <= 359 ? { h, rgb: `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})` } : null;
    };

    const offenders = [];
    for (const file of walkSourceFiles()) {
      const text = fs.readFileSync(file, 'utf8');
      const lines = text.split('\n');

      lines.forEach((line, i) => {
        // This file quotes the banned hues as patterns; skip its own source.
        if (file.endsWith('design-tokens.test.js')) return;
        // Skip comment lines so the explanation above is not self-flagging.
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;

        for (const m of line.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)) {
          const hit = HEAT(m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1]);
          if (hit) offenders.push(`${file}:${i + 1}  #${m[1]}  hue ${hit.h}`);
        }
        for (const m of line.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)/g)) {
          const [, r, g, b] = m.map(Number);
          const hit = HEAT(
            [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
          );
          if (hit) offenders.push(`${file}:${i + 1}  rgba(${r},${g},${b})  hue ${hit.h}`);
        }
      });
    }

    expect(
      offenders,
      `retired rose/pink hues still present (hue 320-359):\n  ${offenders.join('\n  ')}`
    ).toEqual([]);
  });
});
