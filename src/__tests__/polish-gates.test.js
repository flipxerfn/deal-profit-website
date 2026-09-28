import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');
// Strip CSS comments so prose that merely *mentions* a declaration (e.g. the
// comment explaining why we avoid it) can't satisfy or break a gate.
const readCss = (p) => read(p).replace(/\/\*[\s\S]*?\*\//g, '');

// These gate the accessibility/SEO polish pass on the stylesheet, component and
// public/ sources. They are source-level assertions on purpose: the same style
// of gate already used for the legal-page and admin-CMS content, and they run
// without a browser so a regression fails CI instead of shipping.

describe('discoverability files', () => {
  it('serves a robots.txt that allows the site and hides private routes', () => {
    expect(existsSync(resolve(root, 'public/robots.txt'))).toBe(true);
    const robots = read('public/robots.txt');
    expect(robots).toMatch(/^User-agent:\s*\*/m);
    expect(robots).toMatch(/^Allow:\s*\/\s*$/m);
    // /admin and /api must never be crawlable.
    expect(robots).toMatch(/^Disallow:\s*\/admin\s*$/m);
    expect(robots).toMatch(/^Disallow:\s*\/api\/\s*$/m);
    expect(robots).toMatch(/^Sitemap:\s*https:\/\/goosiev\.com\/sitemap\.xml\s*$/m);
  });

  it('serves a sitemap listing every public route', () => {
    const xml = read('public/sitemap.xml');
    for (const path of [
      'https://goosiev.com/',
      'https://goosiev.com/deals',
      'https://goosiev.com/upgrade',
      'https://goosiev.com/reviews',
      'https://goosiev.com/discord',
      'https://goosiev.com/terms',
      'https://goosiev.com/privacy',
      'https://goosiev.com/refunds',
    ]) {
      expect(xml).toContain(`<loc>${path}</loc>`);
    }
    // The private dashboard must not be advertised for indexing.
    expect(xml).not.toContain('/admin');
  });

  it('serves an llms.txt that describes the site and warns about deal staleness', () => {
    const txt = read('public/llms.txt');
    expect(txt).toMatch(/^# Deal Profit/m);
    expect(txt).toContain('https://goosiev.com/');
    // Honesty contract: an agent reading this must know prices are not guaranteed.
    expect(txt.toLowerCase()).toContain('not guaranteed');
    expect(txt).toContain('GET /api/deals');
  });
});

describe('contrast compliance (WCAG AA)', () => {
  // White on brand (#f43f5e) is only 3.67:1 and fails AA for body text.
  // brand-3 (#e02d4a) is 4.52:1 and passes. Pin it so nobody "brightens the
  // button back" without re-checking the ratio.
  it('renders .btn-primary with the AA-compliant brand-3 background', () => {
    const css = readCss('src/index.css');
    const primary = css.match(/\.btn-primary\s*\{([\s\S]*?)\n\s*\}/)?.[1] ?? '';
    expect(primary).toContain('bg-brand-3');
    // `bg-brand` on its own (3.67:1) must not come back. A trailing -N such as
    // bg-brand-3 is a different token, so match the exact token only.
    expect(primary).not.toMatch(/bg-brand(?![\w-])/);
  });

  it('never uses text-zinc-500 or darker for body copy on the dark surface', () => {
    // zinc-500 on charcoal is 4.01:1 — below AA. zinc-400 is 7.57:1.
    for (const file of ['src/components/Footer.jsx', 'src/components/LegalPage.jsx']) {
      const src = read(file);
      expect(src).not.toMatch(/text-zinc-500/);
      expect(src).toMatch(/text-zinc-400/);
    }
  });
});

describe('accessible names', () => {
  it('gives star ratings a role so aria-label is not prohibited on a bare span', () => {
    // Lighthouse flags aria-label on a <span> with no role: it is prohibited.
    for (const file of ['src/routes/Home.jsx', 'src/routes/Reviews.jsx', 'src/routes/admin/AdminReviews.jsx']) {
      const src = read(file);
      const labelled = src.match(/<span[^>]*aria-label=\{`\$\{(?:review\.)?rating\} out of 5 stars`\}/g) ?? [];
      expect(labelled.length).toBeGreaterThan(0);
      for (const tag of labelled) {
        expect(tag).toContain('role="img"');
      }
    }
  });

  it('keeps the logo link accessible name in sync with its visible text', () => {
    // The visible text is "Deal Profit", so the name must contain it —
    // otherwise label-content-name-mismatch fails.
    const navbar = read('src/components/Navbar.jsx');
    const name = navbar.match(/aria-label="Deal Profit([^"]*)"/)?.[1];
    expect(name).toBeDefined();
    expect(name).not.toBe('');
  });
});

describe('ambient background performance', () => {
  it('paints the ambient gradients on a composited layer, not background-attachment: fixed', () => {
    // background-attachment: fixed forces a full repaint on every scroll frame,
    // which shows up as jank on mobile Safari. A fixed pseudo-element is
    // composited once instead.
    const css = readCss('src/index.css');
    expect(css).not.toMatch(/background-attachment:\s*fixed/);
    const before = css.match(/body::before\s*\{([\s\S]*?)\n\s*\}/)?.[1] ?? '';
    expect(before).toContain('position: fixed');
    expect(before).toMatch(/z-index:\s*-1/);
    // The layered washes and the faint grid both live on that layer.
    expect(before.match(/gradient/g)?.length ?? 0).toBeGreaterThanOrEqual(5);
  });
});

describe('card depth', () => {
  it('gives cards a real surface instead of a flat fill', () => {
    const css = readCss('src/index.css');
    const card = css.match(/\.card\s*\{([\s\S]*?)\n\s*\}/)?.[1] ?? '';
    expect(card).toContain('from-charcoal-2');
    // Layered shadow: an inset top highlight plus a cast shadow.
    expect((card.match(/box-shadow:/g) ?? []).length).toBe(1);
    expect(card).toContain('inset 0 1px 0 0');
    expect(card).toContain('0 8px 24px');
  });

  it('lifts cards on hover with a spring-friendly transform', () => {
    const css = readCss('src/index.css');
    expect(css).toMatch(/\.card-hover[\s\S]*hover:-translate-y-/);
    // cardHover in motion.js must use a spring, not a fixed-duration tween,
    // and expose a tap state.
    const motion = read('src/lib/motion.js');
    const cardHover = motion.match(/cardHover:\s*\{([\s\S]*?)\n\s*\},/)?.[1] ?? '';
    expect(cardHover).toContain('whileHover');
    expect(cardHover).toContain('whileTap');
  });
});

describe('bundle splitting', () => {
  it('keeps only Home in the initial bundle', () => {
    const app = read('src/App.jsx');
    expect(app).toMatch(/import Home from '\.\/routes\/Home';/);
    for (const route of ['Deals', 'Reviews', 'Discord', 'Upgrade', 'Terms', 'Privacy', 'Refunds', 'Admin']) {
      expect(app).toContain(`const ${route} = lazy(() => import('./routes/${route}'))`);
    }
    // No static route imports left behind.
    expect(app).not.toMatch(/^import \w+ from '\.\/routes\/(?!Home)/m);
  });
});

describe('spotlight honesty', () => {
  it('never claims "live now" for a deal without a source listing', () => {
    const src = read('src/components/SpotlightDeal.jsx');
    // The label must be derived from `verifiable`, not hard-coded copy.
    expect(src).toMatch(/const verifiable = isSourceLink\(/);
    expect(src).toMatch(/headline = verifiable[\s\S]*?live now/);
    // A hard-coded "— live now" string would reintroduce the fake-deal problem.
    expect(src).not.toMatch(/>Penny find — live now/);
    expect(src).toContain('Example — no live listing');
  });

  it('caps the spotlight content width so wide screens have no dead gap', () => {
    const src = read('src/components/SpotlightDeal.jsx');
    expect(src).toMatch(/mx-auto grid max-w-5xl/);
  });
});

describe('mobile trust indicators', () => {
  it('keeps trust labels visible on phones instead of showing bare icons', () => {
    const home = read('src/routes/Home.jsx');
    const trust = home.match(/\{\/\* Trust indicators[\s\S]*?TRUST_ITEMS\.map\([\s\S]*?\n\s{12}<\/motion\.div>/)?.[0] ?? '';
    expect(trust).toContain('grid-cols-2');
    expect(trust).not.toContain('hidden sm:block');
  });
});
