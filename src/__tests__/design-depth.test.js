// Why the site read as flat, and what now holds it together.
//
// Three measurable problems were found by reading the tokens rather than the
// design:
//
//   1. Only three surface levels, eight values apart per channel. #0d0d11 ->
//      #15151d -> #1d1d27. A step that small is below what the eye resolves as
//      a different plane, so every surface sat at the same depth and the page
//      had no elevation at all. "Flat" was not a vague impression, it was an
//      arithmetic property of the palette.
//
//   2. Twenty-two glow shadows across nine files. Glow scattered this widely
//      stops being an accent and becomes wallpaper — it stops carrying meaning
//      because everything is shouting.
//
//   3. --color-muted (#71717a) on --color-charcoal-2 (#15151d) is a contrast
//      ratio of 3.8:1, which fails WCAG AA 4.5:1 for body text. Secondary text
//      was not merely quiet, it was below the accessibility floor.
//
// The elevation ladder is the core fix. A dark interface has no light source, so
// depth has to be stated rather than implied: a visible value step between
// planes, plus a one-pixel inset highlight along the top edge of a raised
// surface, which reads as light catching the lip. That is what glow was faking,
// and unlike glow it does not cost a repaint.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (rel) =>
  readFileSync(resolve(import.meta.dirname, rel), 'utf8')
    // Strip comments: this file explains the rules it asserts, and the CSS
    // explains the tokens. A raw scan matches the prose and passes with the
    // bug in place.
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const css = read('../index.css');
const card = read('../components/DealCard.jsx');
const nav = read('../components/Navbar.jsx');
const home = read('../routes/Home.jsx');

// --- colour maths ------------------------------------------------------------

const hexToRgb = (h) => {
  const s = h.replace('#', '');
  const full = s.length === 3 ? s.split('').map((c) => c + c).join('') : s;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};

// WCAG relative luminance. Used rather than a raw channel diff because "is this
// step visible" is a luminance question, not an arithmetic one.
const luminance = (hex) => {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const token = (name) => {
  const m = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{3,8})`));
  return m?.[1] ?? null;
};

// --- the ladder --------------------------------------------------------------

describe('surfaces are separated enough to read as different planes', () => {
  const LADDER = ['night', 'charcoal', 'charcoal-2', 'charcoal-3'];

  it('defines a full ladder of surfaces', () => {
    for (const name of LADDER) {
      expect(token(name), `--color-${name} is missing`).toBeTruthy();
    }
  });

  it.each([
    ['night', 'charcoal'],
    ['charcoal', 'charcoal-2'],
    ['charcoal-2', 'charcoal-3'],
  ])('%s -> %s is a visible step, not an invisible one', (a, b) => {
    const ratio = contrast(token(a), token(b));
    // 1.0 would be identical surfaces. The old ladder measured 1.05, 1.07 and
    // 1.09 — which is the entire reason nothing read as elevated. 1.25 is the
    // floor for a step the eye resolves as a different plane rather than as
    // noise, while leaving the top of the ladder dark enough that this stays
    // a dark theme. The ladder above is solved to 1.26 for exactly that reason.
    expect(
      ratio,
      `${a} ${token(a)} -> ${b} ${token(b)} is only ${ratio.toFixed(2)}:1 — too close to read as depth`
    ).toBeGreaterThanOrEqual(1.25);
  });

  it('keeps the page base dark rather than drifting to grey', () => {
    // A ladder that walks all the way up to mid-grey stops being a dark theme.
    expect(luminance(token('night'))).toBeLessThan(0.01);
    expect(luminance(token('charcoal-3'))).toBeLessThan(0.06);
  });
});

describe('text passes contrast on the surface it sits on', () => {
  it.each([
    ['muted', 4.5],
    ['muted-2', 4.5],
  ])('--color-%s clears WCAG AA on the card surface', (name, min) => {
    const ratio = contrast(token(name), token('charcoal-2'));
    expect(
      ratio,
      `${name} ${token(name)} on charcoal-2 ${token('charcoal-2')} is ${ratio.toFixed(2)}:1, needs ${min}:1`
    ).toBeGreaterThanOrEqual(min);
  });

  it('keeps muted text quieter than primary text', () => {
    // The point of a muted tone is to recede. Clearing AA is necessary but not
    // sufficient — if it matches the primary tone there is no hierarchy left.
    expect(luminance(token('muted'))).toBeLessThan(luminance(token('muted-2')));
    expect(luminance(token('muted-2'))).toBeLessThan(0.45);
  });
});

describe('depth is stated, not faked with glow', () => {
  it('has a raised-surface utility with an inset top-edge highlight', () => {
    // The one-pixel lit lip. In a dark UI with no light source this is what
    // makes a plane read as raised, and unlike a glow it costs no repaint.
    const util = css.match(/\.surface-raised\s*\{[\s\S]*?\}/);
    expect(util?.[0], '.surface-raised is missing').toBeTruthy();
    expect(util[0]).toMatch(/inset/);
    // The highlight must be a LIGHT line (positive rgb at the top of the
    // gradient), not a dark one — a dark inner shadow reads as a bevel.
    expect(util[0]).toMatch(/rgba\(255,\s*255,\s*255/);
  });

  it('cards and nav do not use glow', () => {
    // Twenty-two glow shadows across nine files turned an accent into
    // wallpaper. The hero keeps its glow because there it is the one thing on
    // the page asking to be looked at; cards and nav are not that place.
    expect(card).not.toMatch(/shadow-\[0_0_/);
    expect(nav).not.toMatch(/shadow-\[0_0_/);
  });

  it('keeps the glow budget small', () => {
    const glows = (css + card + nav + home).match(/shadow-\[0_0_/g)?.length ?? 0;
    expect(glows, `${glows} glow shadows — an accent spread this wide is wallpaper`).toBeLessThanOrEqual(8);
  });
});