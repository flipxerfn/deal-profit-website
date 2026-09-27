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
  it.each([
    ['--color-ember', '#fb923c'],
    ['--color-ice', '#22d3ee'],
    ['--color-lime', '#a3e635'],
  ])('defines token %s as %s', (token, value) => {
    expect(css).toContain(`${token}: ${value}`);
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
