// Nine live posts led with "🔥 NEW DEAL" or "🔔 JUST DROPPED" and those strings
// reached goosiev.com as the product name — including in the hero live feed,
// which is the first thing on the page a visitor reads.
//
// The cause: isJunkLine only measured shape. It counted letters against
// punctuation, so "NEW DEAL" (7 letters, 12 chars) cleared the 40% threshold
// comfortably and was promoted as a product name. The promotion logic was fine;
// the predicate that decides what to promote was too shallow.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseDealMessage } from './parseDeals.js';

const embed = (title, description = '', content = '') => ({
  type: 0,
  id: 'm1',
  guild_id: 'g1',
  channel_id: 'c1',
  content,
  embeds: [
    {
      color: 0,
      title,
      description,
      url: 'https://www.amazon.com/dp/B000000000',
      author: { name: 'Amazon' },
      fields: [],
    },
  ],
  attachments: [],
});

const parse = (title, description = '', content = '') =>
  parseDealMessage(embed(title, description, content), 'c1');

describe('an announcement is not a product name', () => {
  it.each([
    '🔥 NEW DEAL',
    'New deal found',
    '🔔 JUST DROPPED',
    'NEW DEAL',
    'Hot deal',
    'Price drop',
    'Ending soon',
  ])('rejects %j as a title', (title) => {
    const deal = parse(title, 'MR. COFFEE MAKER Now only $34.51 at Amazon');
    expect(deal.title).not.toBe(title);
    expect(deal.title).toMatch(/coffee/i);
  });

  it.each([
    'MARUCCI REMX Batting Gloves PR/CB, AL',
    'Wireless Headphones',
    'Penny Deals',
    'Home Depot 48-Piece Nail Clipper Display',
    'MAX TRAC Suspension Rear Box Kit',
  ])('keeps %j as a title', (title) => {
    // The banner rule must not eat real product names. "Penny Deals" is the
    // adversarial case: both words are banner vocabulary, and it is a real
    // category name that has to survive.
    //
    // Each carries a price because the parser drops price-less posts entirely
    // — an unrelated quality gate, not the one under test here.
    const deal = parse(title, 'Now $19.99, was $49.99 — 60% off');
    expect(deal).not.toBeNull();
    expect(deal.title).toBe(title);
  });

  it('leaves a sentence that merely mentions "deal" alone', () => {
    const t = 'Deal of the day: Keurig K-Elite Coffee Maker';
    expect(parse(t, 'Now $79.99, was $199.99').title).toBe(t);
  });
});

describe('ad-platform residue is stripped', () => {
  it('drops a price glued to the front', () => {
    const d = parse('🔥 NEW DEAL', '$34.51 MR. COFFEE MAKER Now only at Amazon ad');
    expect(d.title.startsWith('$34.51')).toBe(false);
  });

  it('drops a trailing "ad" marker', () => {
    const d = parse('🔥 NEW DEAL', '$98 STANSPORT 6-PERSON TENT on Amazon ad');
    expect(d.title.endsWith('ad')).toBe(false);
  });

  it('never renders a bare fallback for a post that has real detail', () => {
    // The old failure: no product name at all, so the generic string shipped.
    const d = parse('🔥 NEW DEAL', 'BlenderPro 900W Smoothie Blender $29.99 at Walmart');
    expect(d.title).not.toMatch(/^new deal (found|at)/i);
  });
});

describe('the predicate is actually wired into the parser', () => {
  const src = readFileSync(resolve(import.meta.dirname, '../worker/parseDeals.js'), 'utf8');

  it('isJunkLine consults isBannerLine', () => {
    // Otherwise the new rule is dead code and the tests above pass by accident.
    expect(src).toMatch(/if \(isBannerLine\(s\)\) return true;/);
  });

  it('the banner word set is not unbounded', () => {
    const m = src.match(/const BANNER_WORDS = new Set\(\[([\s\S]*?)\]\);/);
    expect(m, 'BANNER_WORDS not found').toBeTruthy();
    const words = m[1].match(/'[a-z]+'/g) ?? [];
    // Adding words here quietly widens what gets discarded. A big jump means
    // real product names are being thrown away.
    expect(words.length).toBeLessThanOrEqual(33);
    // And a duplicate means the list is drifting out of sync with its intent.
    expect(new Set(words).size).toBe(words.length);
  });
});
