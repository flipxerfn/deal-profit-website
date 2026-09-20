// Deal Profit — duplicate detection tests.
// Run with: node --test worker/dedupe.test.js  (or npm test)
import test from 'node:test';
import assert from 'node:assert/strict';
import { dedupeDeals, canonicalizeUrl, normalizeTitle, variantTokens } from './dedupe.js';

const deal = (over = {}) => ({
  id: 'd' + Math.random().toString(36).slice(2, 8),
  title: over.title ?? 'Product',
  url: over.url ?? null,
  image: over.image ?? null,
  price: over.price ?? 10,
  referencePrice: over.referencePrice ?? null,
  description: over.description ?? '',
  source: over.source ?? 'discord',
  postedAt: over.postedAt ?? '2026-09-20T00:00:00Z',
  ...over,
});

const keptIds = (deals) => dedupeDeals(deals).map((d) => d.id).sort();

test('exact duplicates are deduplicated', () => {
  const a = deal({ title: 'RTX 5060 Gaming PC', url: 'https://newegg.com/p/rtx5060', image: 'https://img/rtx.png', price: 39.99 });
  const b = deal({ title: 'RTX 5060 Gaming PC', url: 'https://newegg.com/p/rtx5060', image: 'https://img/rtx.png', price: 39.99 });
  const out = dedupeDeals([a, b]);
  assert.equal(out.length, 1);
  assert.equal(out[0].id, a.id);
});

test('a pile of exact + near duplicates collapses to one canonical deal', () => {
  const base = {
    title: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones',
    url: 'https://www.amazon.com/dp/B0B7XYKLHX',
    image: 'https://images-na.ssl-images-amazon.com/images/I/71oF1rIqPXL._AC_SL1500_.jpg',
    price: 248,
    referencePrice: 399,
    description: 'Sony flagship ANC headset.',
  };
  const variants = [
    deal({ ...base, url: 'https://amazon.com/dp/B0B7XYKLHX/?tag=dp-20&ref_=as_li_ss_tl&psc=1', title: 'Sony WH1000XM5 Noise Cancelling Headphones' }),
    deal({ ...base, url: 'https://amazon.com/gp/product/B0B7XYKLHX?th=1&psc=1', title: 'Sony wh-1000xm5 wireless noise-cancelling headphones' }),
    deal({ ...base, url: 'https://www.amazon.com/dp/B0B7XYKLHX', title: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones' }),
    deal({ ...base }),
  ];
  const out = dedupeDeals(variants);
  assert.equal(out.length, 1);
  assert.equal(out[0].url.includes('B0B7XYKLHX'), true);
});

test('amazon tracking/affiliate URL differences are ignored', () => {
  const a = deal({ title: 'SSD 1TB', url: 'https://amazon.com/dp/B0ABCDEFGH?tag=dealprofit-20&ref_=as_li_ss_tl', image: 'https://img/ssd.png', price: 49 });
  const b = deal({ title: 'SSD 1TB', url: 'https://www.amazon.com/dp/B0ABCDEFGH/?psc=1&qid=1234', image: 'https://img/ssd.png', price: 49 });
  const out = dedupeDeals([a, b]);
  assert.equal(out.length, 1);
});

test('ebay tracking URL differences are ignored', () => {
  const a = deal({ title: 'Vintage Camera', url: 'https://www.ebay.com/itm/12345?hash=item_abc&_trkparms=pageci%3Axyz%7Cparentrq%3A123&_trksid=p2349624.m46890', image: 'https://img/cam.png' });
  const b = deal({ title: 'Vintage Camera', url: 'https://ebay.com/itm/12345', image: 'https://img/cam.png' });
  assert.equal(dedupeDeals([a, b]).length, 1);
});

test('walmart affiliate URL differences are ignored', () => {
  const a = deal({ title: 'Air Fryer 5.8qt', url: 'https://www.walmart.com/ip/air-fryer/123456?wmlspartner=wlpa&selectedSellerId=9001', image: 'https://img/fryer.png' });
  const b = deal({ title: 'Air Fryer 5.8qt', url: 'https://walmart.com/ip/air-fryer/123456', image: 'https://img/fryer.png' });
  assert.equal(dedupeDeals([a, b]).length, 1);
});

test('same Amazon ASIN detected across different URL shapes', () => {
  const a = deal({ title: 'Echo Dot 5th Gen', url: 'https://amazon.com/dp/B09B8V1LZ3', image: 'https://img/echo.png', price: 49.99 });
  const b = deal({ title: 'Echo Dot (5th Generation)', url: 'https://www.amazon.com/gp/product/B09B8V1LZ3/?ref_=xx', image: 'https://img/echo.png', price: 49.99 });
  const out = dedupeDeals([a, b]);
  assert.equal(out.length, 1);
  assert.equal(out[0].id, a.id);
});

test('ASIN via amazon query param recognized', () => {
  const u1 = canonicalizeUrl('https://amzn.to/3xYzAbC?asin=B0C0FFEEE1&tag=dp-20');
  const u2 = canonicalizeUrl('https://www.amazon.com/dp/B0C0FFEEE1');
  assert.equal(u1.key, u2.key);
  assert.equal(dedupeDeals([
    deal({ title: 'Monitor 27in', url: 'https://amzn.to/3xYzAbC?asin=B0C0FFEEE1&tag=dp-20', image: 'https://img/m.png' }),
    deal({ title: 'Monitor 27in', url: 'https://www.amazon.com/dp/B0C0FFEEE1', image: 'https://img/m.png' }),
  ]).length, 1);
});

test('different ASINs are never merged even with identical titles', () => {
  const a = deal({ title: 'USB-C Hub', url: 'https://amazon.com/dp/B0AAA11111', image: 'https://img/a.png', price: 19 });
  const b = deal({ title: 'USB-C Hub', url: 'https://amazon.com/dp/B0BBB22222', image: 'https://img/b.png', price: 19 });
  assert.equal(dedupeDeals([a, b]).length, 2);
});

test('title formatting differences are normalized (caps, punct, spacing, emoji)', () => {
  const a = deal({ title: '  Apple AirPods Pro  2  🎧  — Noise Cancelling!', url: 'https://bestbuy.com/site/airpods-pro-2', image: 'https://img/ap.png', price: 189 });
  const b = deal({ title: 'apple airpods pro 2: Noise Cancelling', url: 'https://bestbuy.com/site/airpods-pro-2/', image: 'https://img/ap.png', price: 189 });
  const out = dedupeDeals([a, b]);
  assert.equal(out.length, 1);
});

test('same retailer near-identical title text (regex-compatible) merges', () => {
  const a = deal({ title: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones', url: 'https://target.com/sony-headphones', image: 'https://img/s.png', price: 279 });
  const b = deal({ title: 'Sony WH1000XM5 Wireless Noise-Cancelling Headphone', url: 'https://target.com/sony-headphones', image: 'https://img/s.png', price: 279 });
  assert.equal(dedupeDeals([a, b]).length, 1);
});

test('different pack sizes remain separate despite same URL', () => {
  const a = deal({ title: 'AA Batteries 24-pack', url: 'https://amazon.com/dp/B0AAAA1111', image: 'https://img/aa.png', price: 9.99 });
  const b = deal({ title: 'AA Batteries 48-pack', url: 'https://amazon.com/dp/B0AAAA1111', image: 'https://img/aa.png', price: 17.99 });
  assert.equal(dedupeDeals([a, b]).length, 2);
});

test('different storage sizes remain separate', () => {
  const a = deal({ title: 'Samsung 990 Pro SSD 1TB', url: 'https://amazon.com/dp/B0BABC1111', image: 'https://img/1tb.png', price: 89 });
  const b = deal({ title: 'Samsung 990 Pro SSD 2TB', url: 'https://amazon.com/dp/B0BABC2222', image: 'https://img/2tb.png', price: 149 });
  assert.equal(dedupeDeals([a, b]).length, 2);
});

test('different colors remain separate', () => {
  const a = deal({ title: 'T-Shirt Black', url: 'https://walmart.com/ip/tshirt-black', image: 'https://img/black.png', price: 12 });
  const b = deal({ title: 'T-Shirt White', url: 'https://walmart.com/ip/tshirt-white', image: 'https://img/white.png', price: 12 });
  assert.equal(dedupeDeals([a, b]).length, 2);
});

test('same product + same variant merges across wording formats', () => {
  const a = deal({ title: 'Gym Bottle 24-pack', url: 'https://amazon.com/dp/B0CCCC3333', image: 'https://img/bottle.png', price: 21 });
  const b = deal({ title: 'Gym Bottle 24 pack', url: 'https://amazon.com/dp/B0CCCC3333', image: 'https://img/bottle.png', price: 21 });
  assert.equal(dedupeDeals([a, b]).length, 1);
});

test('same title but different products (different URLs + images) stay separate', () => {
  const a = deal({ title: 'USB-C Hub 7-in-1', url: 'https://target.com/usb-hub-a', image: 'https://img/hub-a.png', price: 19 });
  const b = deal({ title: 'USB-C Hub 7-in-1', url: 'https://target.com/usb-hub-b', image: 'https://img/hub-b.png', price: 29 });
  assert.equal(dedupeDeals([a, b]).length, 2);
});

test('same image but clearly different products stay separate', () => {
  const shared = 'https://img/shared.png';
  const a = deal({ title: 'Wireless Mouse', url: 'https://walmart.com/ip/mouse', image: shared, price: 15 });
  const b = deal({ title: 'Gaming Keyboard', url: 'https://walmart.com/ip/keyboard', image: shared, price: 45 });
  assert.equal(dedupeDeals([a, b]).length, 2);
});

test('same image + very similar title merges', () => {
  const shared = 'https://img/stanley.png';
  const a = deal({ title: 'Stanley 40oz Tumbler', url: 'https://walmart.com/ip/stanley', image: shared, price: 35 });
  const b = deal({ title: 'Stanley Quencher 40oz Tumbler', url: 'https://walmart.com/ip/stanley-2', image: shared, price: 35 });
  assert.equal(dedupeDeals([a, b]).length, 1);
});

test('manual deal wins over matching discord duplicate', () => {
  const manual = deal({ id: 'manual', title: 'RTX 5060 Gaming PC', url: 'https://newegg.com/p/rtx', image: 'https://img/r.png', price: 39.99, referencePrice: 599.99, description: 'price error', source: 'manual', postedAt: '2026-09-19T00:00:00Z' });
  const discord = deal({ title: 'RTX 5060 Gaming PC', url: 'https://newegg.com/p/rtx', image: 'https://img/r.png', price: 39.99, source: 'discord', postedAt: '2026-09-20T00:00:00Z' });
  const out = dedupeDeals([manual, discord]);
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 'manual');
});

test('manual + discord different products stay separate', () => {
  const manual = deal({ id: 'manual', title: 'Penny Deals', url: null, image: null, price: 0.01, source: 'manual' });
  const discord = deal({ title: 'RTX 5060 Gaming PC', url: 'https://newegg.com/p/rtx', image: 'https://img/r.png', price: 39.99, source: 'discord' });
  assert.equal(dedupeDeals([manual, discord]).length, 2);
});

test('newest post wins when both deals rank equally', () => {
  const old = deal({ title: 'Monitor 27in', url: 'https://bestbuy.com/monitor', image: 'https://img/m.png', price: 149, postedAt: '2026-09-19T00:00:00Z' });
  const fresh = deal({ title: 'Monitor 27 inch', url: 'https://bestbuy.com/monitor', image: 'https://img/m.png', price: 149, postedAt: '2026-09-21T00:00:00Z' });
  const out = dedupeDeals([old, fresh]);
  assert.equal(out.length, 1);
  assert.equal(out[0].id, fresh.id);
});

test('duplicate groups do not cross-contaminate distinct products', () => {
  // Three products; two posts for product A, one post each for B and C.
  const a1 = deal({ title: 'Coffee Maker 12-cup', url: 'https://amazon.com/dp/B0AAAA1111', image: 'https://img/c1.png', price: 49 });
  const b = deal({ title: 'Toaster 4-slice', url: 'https://amazon.com/dp/B0BBBB2222', image: 'https://img/t.png', price: 29 });
  const c = deal({ title: 'Blender 48oz', url: 'https://amazon.com/dp/B0CCCC3333', image: 'https://img/b.png', price: 59 });
  const a2 = deal({ title: 'Coffee Maker 12 Cup', url: 'https://amazon.com/dp/B0AAAA1111', image: 'https://img/c1.png', price: 49 });
  assert.deepEqual(keptIds([a1, b, c, a2]).sort(), [a1.id, b.id, c.id].sort());
});

test('edits text length and unit normalization helpers', () => {
  assert.equal(variantTokens('Batteries 24-pack').has('24pack'), true);
  assert.equal(variantTokens('Batteries 48 pack').has('48pack'), true);
  assert.equal(variantTokens('16-oz bottle').has('16oz'), true);
  assert.equal(variantTokens('TV 55-inch').has('55inch'), true);
  assert.equal(normalizeTitle('  Hello   WORLD 2024!!  '), 'hello world 2024');
});