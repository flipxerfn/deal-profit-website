import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');
// Strip CSS comments so prose that merely *mentions* a declaration (e.g. the
// comment explaining why we avoid it) can't satisfy or break a gate.
const readCss = (p) => read(p).replace(/\/\*[\s\S]*?\*\//g, '');

// Depth-first list of every file under a directory, relative to the repo root.
const walk = (dir) =>
  readdirSync(resolve(root, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]
  );

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

  it('never puts white text on a solid brand or brand-2 background', () => {
    // Every interactive surface, not just the .btn utility class. The Button
    // component, the /upgrade plan toggle and the checkout step badge all
    // carry their own literal colours, and each was 3.67:1.
    // Brand *tints* (bg-brand/10, /20) are fine — white on those is ~17:1 —
    // so the check keys on a solid token, i.e. one with no /opacity suffix.
    const offenders = [];
    for (const file of walk('src')) {
      if (!/\.(jsx|js)$/.test(file)) continue;
      for (const [i, line] of read(file).split('\n').entries()) {
        if (!/text-white/.test(line)) continue;
        if (/bg-brand(?![\w-])/.test(line) || /bg-brand-2(?![\w-])/.test(line)) {
          // A trailing /NN is a tint, not a solid fill.
          if (!/bg-brand(?:-\d)?\/\d/.test(line)) {
            offenders.push(`${file}:${i + 1}  ${line.trim()}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('keeps the Button component on the compliant primary variant', () => {
    const btn = read('src/components/ui/Button.jsx');
    const primary = btn.match(/primary:\s*'([^']*)'/)?.[1] ?? '';
    expect(primary).toContain('bg-brand-3');
    expect(primary).not.toMatch(/bg-brand(?![\w-])/);
    // brand-2 is 2.72:1 against white — unusable as a hover background too.
    expect(primary).not.toMatch(/hover:bg-brand-2(?![\w-])/);
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
    // The rule Lighthouse enforces: the accessible name must contain the
    // visible text verbatim. The wordmark renders "Deal" + "Profit" as two
    // spans, so it only reads "Deal Profit" if there is a space between them.
    // Miss it and the name says "Deal Profit" while the text says
    // "DealProfit" — exactly the mismatch that failed the audit.
    const navbar = read('src/components/Navbar.jsx');
    // Capture the literal text between the opening tag and the coloured
    // "Profit" span. It must be "Deal " *including* the trailing space —
    // that space is the whole point, so it is captured rather than skipped.
    const wordmark = navbar.match(
      /aria-label="Deal Profit — home"[\s\S]*?<span className="text-\[15px\][^"]*">([^<]*)<span/
    );
    expect(wordmark, 'logo wordmark markup not found').not.toBeNull();
    // trimStart (not trim): the trailing space is the character under test.
    // With it: 'Deal '. Without it: 'Deal' — which fails here.
    expect(wordmark[1].trimStart()).toBe('Deal ');
    const name = navbar.match(/aria-label="(Deal Profit[^"]*)"/)?.[1] ?? '';
    expect(name).toContain('Deal Profit');
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
    // This used to require FIVE or more gradients on the layer — three radial
    // washes plus a two-axis grid. Measured on the deployed hero that put four
    // hue families on screen competing with the brand accent, and made a
    // mid-grey the single most common pixel in the fold.
    //
    // Replaced, not deleted. A gate pinning a number that was deliberately
    // moved is worse than no gate: it protects the old decision by accident,
    // because deleting it removes the only thing that noticed when the
    // background quietly grew back.
    //
    // One wash, no grid. The upper bound is the real gate — a lower bound
    // alone would pass on the old five-layer version.
    const gradients = before.match(/gradient/g)?.length ?? 0;
    expect(gradients, `background has ${gradients} gradients, expected exactly 1`)
      .toBe(1);
    // And the grid overlay stays out of the global layer entirely.
    expect(before).not.toMatch(/linear-gradient\(/);
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
    const lines = home.split('\n');

    // Locate the trust row by its own content rather than by matching a whole
    // JSX block. Two earlier versions anchored a regex on the TRUST_ITEMS call
    // and a closing </motion.div> at a fixed indent, so a refactor that changed
    // the call from TRUST_ITEMS.map to TRUST_ITEMS(x).map made the match empty
    // and the gate reported a layout failure that did not exist — while a real
    // layout regression could equally have slipped past it.
    // Anchor on the actual call, not on the comment above it that mentions the
    // same name — an earlier version matched that comment and inspected the
    // wrong part of the file entirely.
    const start = lines.findIndex((l) => /TRUST_ITEMS\([^)]*\)\.map\(/.test(l));
    expect(start, 'trust indicators not found in Home.jsx').toBeGreaterThan(-1);

    // The container is a few lines above the call, so scan upwards for the
    // grid the items sit in.
    const container = lines
      .slice(Math.max(0, start - 6), start + 2)
      .join('\n');
    expect(container).toContain('grid-cols-2');
    // And the labels are never reduced to bare icons on a phone.
    expect(container).not.toContain('hidden sm:block');
  });
});
