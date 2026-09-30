// The navbar search was unreachable at a whole band of screen widths.
//
// The navbar copy was `hidden xl:block` (needs 1280px+) and the drawer copy
// lived inside a panel that is `lg:hidden` (only exists below 1024px). Every
// width from 1024px to 1279px therefore had a search bar in the document with
// zero width — not in the header, not in the menu, nowhere. A 1366px laptop in
// an ordinary browser window sits right in the middle of that band, which is
// how it went unnoticed.
//
// These are source gates rather than rendered assertions because the failure is
// purely a Tailwind breakpoint interaction, and the repo has no jsdom to mount
// the navbar in. The live widths are verified in the browser separately.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const navbar = readFileSync(resolve(root, 'src/components/Navbar.jsx'), 'utf8');
const siteSearch = readFileSync(resolve(root, 'src/components/SiteSearch.jsx'), 'utf8');

/** Pull out each <SiteSearch ... /> invocation. */
function siteSearchUses(src) {
  return [...src.matchAll(/<SiteSearch\b[\s\S]*?\/>/g)].map((m) => m[0]);
}

describe('search is reachable at every width', () => {
  const uses = siteSearchUses(navbar);

  it('renders the navbar copy on at least as wide a band as the nav links', () => {
    const navCopy = uses.find((u) => /site-search-nav/.test(u));
    expect(navCopy, 'navbar search copy not found').toBeTruthy();

    // The nav links switch on at `lg`. If search waits for a wider breakpoint
    // than that, everything between the two is a hole in the header.
    const hiddenUntilXl = /hidden\b[^"]*\bxl:block\b/.test(navCopy);
    expect(hiddenUntilXl, 'navbar search waits for xl, so lg..xl has no search').toBe(false);

    expect(navCopy).toMatch(/\blg:block\b/);
  });

  it('still hides the navbar copy on phones, where the drawer owns search', () => {
    const navCopy = uses.find((u) => /site-search-nav/.test(u));
    expect(navCopy).toMatch(/\bhidden\b/);
  });

  it('keeps a drawer copy for phones', () => {
    expect(uses.some((u) => /site-search-drawer/.test(u))).toBe(true);
  });

  it('offers a one-tap search button below lg', () => {
    // Search hidden behind a hamburger is how it stayed unfound. The button has
    // to exist and be lg:hidden so it does not duplicate the desktop field.
    const btn = navbar.match(/<button[\s\S]{0,320}?aria-label="Search the site"[\s\S]{0,120}?>/);
    expect(btn, 'no header search button').toBeTruthy();
    expect(btn[0]).toMatch(/lg:hidden/);
    expect(btn[0]).toMatch(/setIsOpen\(true\)/);
  });

  it('focuses the field when opened via that button but not via the hamburger', () => {
    // Opening the menu normally should not yank focus into a text box.
    expect(navbar).toMatch(/setFocusSearch\(true\);\s*\n\s*setIsOpen\(true\);/);
    expect(navbar).toMatch(/setFocusSearch\(false\);\s*\n\s*setIsOpen\(!isOpen\);/);
    expect(navbar).toMatch(/autoFocus=\{focusSearch\}/);
  });
});

describe('the two search inputs do not collide', () => {
  it('gives each copy a distinct id', () => {
    const uses = siteSearchUses(navbar);
    const ids = uses.map((u) => (u.match(/id="([^"]+)"/) || [])[1]);
    expect(ids).toHaveLength(2);
    expect(ids.every(Boolean), `a copy has no id: ${JSON.stringify(ids)}`).toBe(true);
    expect(new Set(ids).size, `duplicate ids: ${JSON.stringify(ids)}`).toBe(2);
  });

  it('derives the label, input and results ids from the prop', () => {
    // A hard-coded id in the JSX is exactly what made two elements collide.
    // The signature's `id = 'site-search'` default is fine — only the markup
    // matters, so assert against the JSX and not the whole file.
    const jsx = siteSearch.slice(siteSearch.indexOf('return ('));
    expect(siteSearch).toMatch(/htmlFor=\{id\}/);
    expect(jsx).toMatch(/id=\{id\}/);
    expect(jsx).toMatch(/id=\{`\$\{id\}-results`\}/);
    expect(jsx, 'results panel id is hard-coded').not.toMatch(/id="site-search-results"/);
    expect(jsx, 'input id is hard-coded').not.toMatch(/id="site-search"/);
  });

  it('still exposes the field to assistive tech', () => {
    expect(siteSearch).toMatch(/aria-label="Search the site"/);
    expect(siteSearch).toMatch(/className="sr-only"/);
  });
});
