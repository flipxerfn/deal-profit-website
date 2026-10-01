// Visual refresh: design tokens + shared utilities must exist in the stylesheet.
// (Tasks 2/4 consume these exact names.)
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const css = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'index.css'),
  'utf8'
);

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

  it('keeps the existing brand tokens untouched', () => {
    expect(css).toContain('--color-brand: #f43f5e');
    expect(css).toContain('--color-glow: #8b5cf6');
  });
});
