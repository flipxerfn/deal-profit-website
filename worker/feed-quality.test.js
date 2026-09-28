// Feed hygiene: a message only becomes a "deal" when it carries a real source
// link or explicit deal language. Without this, plain product titles with a
// stray number ("Hangar 9 Fuselage Hatch", "BRUTE 44 Gal") were being posted
// as $9 / $44 deals with no listing behind them — the reason people believed
// the feed was fake.
import { describe, it, expect } from 'vitest';
import { parseDealMessage } from './parseDeals.js';

const message = (over = {}) => ({
  type: 0,
  id: 'm1',
  guild_id: 'g1',
  channel_id: 'c1',
  content: '',
  embeds: [],
  attachments: [],
  ...over,
});

const embed = (o) => ({ color: 0, fields: [], ...o });

describe('parseDealMessage — only real deals get through', () => {
  it('rejects a plain product title with only a number in it', () => {
    const msg = message({
      embeds: [
        embed({
          title: 'Hangar 9 Fuselage Turbine Hatch: Hawk/T-14 Flying',
          description: 'Rubbermaid Commercial Products BRUTE 44 Gal. Rectangular Container',
        }),
      ],
    });
    expect(parseDealMessage(msg, 'c1')).toBeNull();
  });

  it('rejects a product list post with no link and no deal language', () => {
    const msg = message({
      content: 'New in store: Kobalt 40-Volt 9-in Handheld Battery Law W-28 4Ah',
    });
    expect(parseDealMessage(msg, 'c1')).toBeNull();
  });

  it('accepts a post with a real retailer link and a price', () => {
    const msg = message({
      content: 'RTX 5060 gaming PC $39.99 — was $599.99 https://www.example-retailer.com/p/5060',
    });
    const deal = parseDealMessage(msg, 'c1');
    expect(deal).not.toBeNull();
    expect(deal.cta.href).toBe('https://www.example-retailer.com/p/5060');
    expect(deal.price).toBe(39.99);
  });

  it('accepts an explicit price-error post with no link', () => {
    const msg = message({ content: 'Price error! Kobalt battery $8.99 — normally $39.99' });
    const deal = parseDealMessage(msg, 'c1');
    expect(deal).not.toBeNull();
    expect(deal.badge).toBe('Price error');
  });

  it('never labels a deal "Live now" when it has no source link', () => {
    const msg = message({ content: 'Glitch deal: drone $19.99 down from $89.99' });
    const deal = parseDealMessage(msg, 'c1');
    expect(deal.meta).not.toContain('Live now');
  });
});
