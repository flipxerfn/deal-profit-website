// Feed curation: what reaches the public feed.
//
// Both rules here came from looking at the live feed rather than the code.
//
// 1. The newest post on /deals was a silicone breast product, and it was the
//    first thing a visitor saw. Three of 200 posts are adult-worded. The first
//    card in the grid is the one people screenshot, and on an account that
//    needs to look credible to a payment provider, that is not a trade worth
//    making.
//
// 2. Six consecutive slots in the newest-24 were near-identical swim goggles
//    from one poster: "H2O Life Swim Goggles", "Heart Shaped", "Kids",
//    "with Designs", "Mask Shaped", "Premium". Dedupe is working correctly —
//    those really are different products — but a reader landing there sees a
//    retailer's catalogue, not a deal feed.
//
//    The first attempt capped per CHANNEL and it was wrong twice: no channel
//    holds more than 25% of the real feed, so a channel cap trims nothing,
//    and the offender held only 15 posts total. The repetition is inside one
//    channel's own run, so the rule is per BRAND within a sliding window.
//
// The adult-word list is deliberately narrow. A broad filter deletes real
// deals — "Dog Sweater (XXX-Large)" and "XBOX Series X" both contain three
// X's — and silently dropping someone's purchase is worse than showing it.
import { describe, it, expect } from 'vitest';
import { curateDeals, isOffensive, brandKey, channelRank, BRAND_RUN_LIMIT } from './curation.js';

const deal = (over = {}) => ({
  id: 'd1',
  title: 'Sony WH-1000XM5 Headphones $229',
  url: 'https://amazon.com/dp/B000000001',
  price: 229,
  referencePrice: 349,
  channelId: 'c1',
  postedAt: '2026-09-30T10:00:00.000Z',
  ...over,
});

describe('sensitive content never reaches the feed', () => {
  it.each([
    'Master Series Perky Pair G-Cup Silicone Breasts – Dark',
    'Silicone Breast Forms for Men',
    'Black Lace Lingerie Set for Women',
    'Womens Thong Underwear 5 Pack',
    'Latex Catwoman Costume',
  ])('rejects %j', (title) => {
    expect(isOffensive({ title })).toBe(true);
  });

  it.each([
    'Sony WH-1000XM5 Headphones $229',
    'H2O Life Swim Goggles with Designs',
    'Nike Air Max 90 Sneakers $87',
    // "Adult" appears in legitimate titles. A false positive silently deletes
    // a real deal, which is the worse failure.
    'Battle Sports Football Gloves – Adult & Youth',
    'Chilly Dog Reindeer Shawl Dog Sweater (XXX-Large)',
    'XBOX Series X Console Bundle',
  ])('keeps %j', (title) => {
    expect(isOffensive({ title })).toBe(false);
  });

  it('checks the description too, not only the title', () => {
    expect(isOffensive({ title: 'Blue Widget', description: 'silicone breast forms, assorted sizes' })).toBe(true);
  });

  it('is case and punctuation insensitive', () => {
    expect(isOffensive({ title: 'SILICONE BREASTS!!!' })).toBe(true);
    expect(isOffensive({ title: 'lingerie-bra-set' })).toBe(true);
  });
});

describe('the brand key collapses a catalogue without collapsing the feed', () => {
  it('groups near-identical variants of one product', () => {
    const a = brandKey('H2O Life Swim Goggles w-Drawcord Strap');
    const b = brandKey('H2O Life Heart Shaped Swim Goggles');
    const c = brandKey('H2O Life Kids Swim Goggles');
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('keeps different brands apart', () => {
    expect(brandKey('H2O Life Swim Goggles')).not.toBe(brandKey('Nike Air Max 90'));
    expect(brandKey('Sony WH-1000XM5')).not.toBe(brandKey('Bose QC45'));
  });

  it('ignores model numbers, which are what varies across a catalogue', () => {
    // "3M Gear Case 05311" and "3M Command Strips 3-pack" are different products
    // and must not collapse into one brand.
    expect(brandKey('3M Gear Case 05311')).not.toBe(brandKey('3M Command Strips'));
  });

  it('returns null for a title with nothing usable', () => {
    expect(brandKey('')).toBeNull();
    expect(brandKey('12345 67890')).toBeNull();
  });
});

describe('a catalogue run is thinned out', () => {
  // The real sequence, in feed order, from the live feed.
  const goggles = [
    'H2O Life Swim Goggles w-Drawcord Strap',
    'H2O Life Heart Shaped Swim Goggles',
    'H2O Life Kids Swim Goggles',
    'H2O Life Swim Goggles with Designs',
    'H2O Life Mask Shaped Swim Goggles',
    'ComfortSpa Reading Pillow',
  ];

  it('drops the repeats past the limit', () => {
    const posts = goggles.map((t, i) =>
      deal({ id: `g${i}`, title: t, postedAt: new Date(Date.parse('2026-09-30T00:00:00Z') + i * 6e4).toISOString() })
    );
    const out = curateDeals(posts);
    // Two goggles survive the limit, and the non-goggle is untouched.
    expect(out.filter((d) => d.title.startsWith('H2O'))).toHaveLength(BRAND_RUN_LIMIT);
    expect(out.filter((d) => d.title.startsWith('ComfortSpa'))).toHaveLength(1);
  });

  it('keeps the newest of a run and drops the older duplicates', () => {
    // Sorted newest-first internally, so a reader hitting Refresh sees fresh
    // finds rather than the same goggles marching back up the page.
    const posts = goggles.map((t, i) =>
      deal({ id: `g${i}`, title: t, postedAt: new Date(Date.parse('2026-09-30T00:00:00Z') + i * 6e4).toISOString() })
    );
    const out = curateDeals(posts);
    const keptTitles = out.map((d) => d.title);
    expect(keptTitles).toContain(goggles[goggles.length - 2]);
    expect(keptTitles).not.toContain(goggles[0]);
  });

  it('leaves a varied feed completely alone', () => {
    const titles = [
      'Sony WH-1000XM5 Headphones', 'Nike Air Max 90', 'Bose QC45',
      'Dyson V15 Detect', 'KitchenAid Mixer', 'Sony WH-1000XM4',
      'Adidas Ultraboost', 'Roomba i7', 'Nintendo Switch OLED', 'Kindle Paperwhite',
    ];
    const posts = titles.map((t, i) =>
      deal({ id: `v${i}`, title: t, postedAt: new Date(Date.parse('2026-09-30T00:00:00Z') + i * 6e4).toISOString() })
    );
    expect(curateDeals(posts)).toHaveLength(titles.length);
  });

  it('does not thin a feed that is one brand, just because it is one brand', () => {
    // 3 of 200 posts were adult; 15 of 200 were this one poster's toys. A rule
    // that deleted most of a small feed would be worse than the problem.
    const out = curateDeals([deal({ id: 'a' }), deal({ id: 'b' })]);
    expect(out).toHaveLength(2);
  });
});

describe('offensive posts are removed before anything else', () => {
  it('drops them regardless of brand grouping', () => {
    const out = curateDeals([
      deal({ id: 'a', title: 'Silicone Breast Forms' }),
      deal({ id: 'b', title: 'H2O Life Swim Goggles' }),
    ]);
    expect(out.map((d) => d.id)).toEqual(['b']);
  });

  it('a rejected post cannot be reintroduced by the repetition rule', () => {
    const out = curateDeals([
      deal({ id: 'x', title: 'Lingerie Set' }),
      deal({ id: 'y', title: 'Lingerie Set' }),
    ]);
    expect(out).toEqual([]);
  });
});

describe('robustness', () => {
  it('ignores a missing channelId', () => {
    expect(curateDeals([deal({ id: 'x', channelId: undefined })])).toHaveLength(1);
  });

  it('does not crash on malformed input', () => {
    for (const bad of [null, undefined, [], [null], 'nope', [{}]]) {
      expect(() => curateDeals(bad)).not.toThrow();
    }
  });

  it('sorts newest first', () => {
    const a = deal({ id: 'old', postedAt: '2026-09-29T00:00:00Z' });
    const b = deal({ id: 'new', postedAt: '2026-09-30T00:00:00Z' });
    expect(curateDeals([a, b]).map((d) => d.id)).toEqual(['new', 'old']);
  });

  it('reports the worst brand repetition for diagnostics', () => {
    expect(channelRank(['A B one', 'A B two', 'A B three', 'C D four'])).toBe(3);
    expect(channelRank(['A B one', 'C D four'])).toBe(1);
  });
});
