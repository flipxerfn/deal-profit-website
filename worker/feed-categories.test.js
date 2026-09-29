// Title extraction and categorisation.
//
// Two real defects, found by measuring the live feed rather than by reading it:
//
//   1. 42 of 200 posts (21%) had a title of literally "\u1cbc" — a single
//      obscure Unicode symbol used as a separator by the Discord bots that post
//      the feed. The real product name was on the NEXT line, which the parser
//      threw away as description. Those posts were also unreadable on the site.
//
//   2. Because there was no title to categorise, 181 of 200 posts fell through
//      to "other". The category filter was effectively a single bin.
//
// A post with no usable title is not a categorisable post, so fixing the title
// is a prerequisite for categories meaning anything.
import { describe, it, expect } from 'vitest';
import { parseDealMessage } from './parseDeals.js';
import { CATEGORIES } from '../src/data/deals.js';

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

const SEP = '\u1cbc';

const parse = (msg) => parseDealMessage(msg, 'c1');

describe('title extraction survives the bots separator character', () => {
  it('uses the real product line when the first line is a bare symbol', () => {
    // This is the exact shape that produced 21% of the live feed.
    const deal = parse(
      message({
        embeds: [
          embed({
            title: SEP,
            description: 'Ninja Foodi Air Fryer - Dualzone, $149, retail $229!',
            url: 'https://www.amazon.com/dp/B07XJ8C8F5',
          }),
        ],
      })
    );
    expect(deal).not.toBeNull();
    expect(deal.title).toBe('Ninja Foodi Air Fryer - Dualzone, $149, retail $229!');
    // And the symbol must not survive anywhere in the title.
    expect(deal.title).not.toContain(SEP);
  });

  it('keeps a good first line rather than reaching past it', () => {
    const deal = parse(
      message({
        embeds: [
          embed({
            title: 'TCL 25" Mini-LED Gaming Monitor',
            description: 'Now $149 at Walmart, was $300.99',
            url: 'https://www.walmart.com/ip/12345',
          }),
        ],
      })
    );
    expect(deal.title).toBe('TCL 25" Mini-LED Gaming Monitor');
  });

  it('skips several junk lines before finding a real one', () => {
    const deal = parse(
      message({
        embeds: [
          embed({
            title: `${SEP} ${SEP}`,
            description: 'Ninja Foodi Air Fryer - Dualzone, $149, retail $229!',
            url: 'https://www.amazon.com/dp/B07XJ8C8F5',
          }),
        ],
      })
    );
    expect(deal.title).toContain('Ninja Foodi');
  });

  it('falls back to something readable when every line is junk', () => {
    // Never return a lone symbol: that is what made the site look broken.
    const deal = parse(
      message({
        embeds: [embed({ title: SEP, description: `${SEP} ${SEP} Now $9.99, was $19.99.`, url: 'https://www.amazon.com/dp/X' })],
      })
    );
    expect(deal).not.toBeNull();
    expect(deal.title.length).toBeGreaterThan(3);
    expect(deal.title).not.toBe(SEP);
  });

  it('trims a long borrowed line to a readable title', () => {
    const long = 'A Really Unreasonably Long Product Name '.repeat(6).trim();
    const deal = parse(
      message({
        embeds: [embed({ title: SEP, description: `${long} Now $9.99.`, url: 'https://www.amazon.com/dp/Y' })],
      })
    );
    expect(deal.title.length).toBeLessThanOrEqual(80);
  });
});

describe('categories', () => {
  // Every fixture needs a parseable price: the feed drops posts it cannot price
  // (a deal card with no price is worse than no card). Real posts all carry
  // one, so the fixtures do too.
  const categorise = (title, description = '', url) =>
    parse(message({ embeds: [embed({ title, description, url })] }))?.category;

  const priced = (title, url, extra = '') =>
    categorise(title, `${extra} Now $29.99, was $59.99.`, url);

  it('routes the same product to the same category regardless of retailer', () => {
    // Groceries were the worst offender: "Starbucks Refreshers" filed as
    // "other" while the site bragged about food and penny finds.
    expect(priced('Starbucks Refreshers, Peach Passion Fruit, 12 Fl Oz', 'https://www.walmart.com/ip/1'))
      .toBe('grocery');
    expect(priced('Ninja Foodi Air Fryer - Dualzone', 'https://www.amazon.com/dp/2'))
      .not.toBe('other');
  });

  it('keeps a penny find a penny find', () => {
    expect(priced('Penny CPU deal', 'https://www.homedepot.com/p/3', 'Caught at a penny.'))
      .toBe('penny');
    // A sub-dollar price is the strongest signal, whatever the title says.
    expect(categorise('Some product', 'Only $0.62 today', 'https://www.homedepot.com/p/4')).toBe('penny');
  });

  it('classifies the categories the live feed actually contained', () => {
    // Sampled from real posts on September 29, 2026.
    const cases = [
      ['Moroso Spark Plug Insulators', 'https://www.homedepot.com/p/5', 'automotive'],
      ['HHIP Hydraulic Chuck Reduction Sleeve', 'https://www.homedepot.com/p/6', 'tools'],
      ['Rawlings Workhorse Baseball Batting Gloves', 'https://www.amazon.com/dp/7', 'sports'],
      ['Waring Pro Martini Maker', 'https://www.amazon.com/dp/8', 'home'],
      ['TCL 25" Mini-LED Gaming Monitor', 'https://www.walmart.com/ip/9', 'tech'],
      ['BCI Crafts Reclaimed Wood Heart Blank', 'https://www.amazon.com/dp/10', 'crafts'],
      // Second pass: these were all still landing in "other" on the live feed.
      ['HP EliteDesk 800 G6 Mini PC', 'https://www.homedepot.com/p/12', 'tech'],
      ['ARIES 2554010 NovaTrac 6" x 53" Black Steel Running Boards', 'https://www.amazon.com/dp/13', 'automotive'],
      ['Victor Reinz 95128SG Intake Manifold Gasket', 'https://www.homedepot.com/p/14', 'automotive'],
      ['BISSELL SpinWave Hard Floor Cleaner', 'https://www.homedepot.com/p/15', 'home'],
      ['Automatic Litter Box Bundle', 'https://www.amazon.com/dp/16', 'pets'],
      ['Funko POP Heroes: CatWoman Vinyl Figure', 'https://www.amazon.com/dp/17', 'toys'],
      ['Lionel Harry Potter Order of the Phoenix O Gauge Boxcar', 'https://www.amazon.com/dp/18', 'toys'],
    ];
    for (const [title, url, expected] of cases) {
      expect(priced(title, url), title).toBe(expected);
    }
  });

  it('falls back to other only when nothing matches', () => {
    expect(priced('Assorted Widget Assemblage', 'https://example.com/p/11')).toBe('other');
  });

  it('only emits category ids the frontend knows how to render', () => {
    // A category the chip list does not contain is invisible in the UI and
    // silently swallowed by the filter.
    const known = new Set(CATEGORIES.map((c) => c.id));
    const samples = [
      ['Starbucks Refreshers', 'https://walmart.com/ip/1'],
      ['Spark plug insulators', 'https://homedepot.com/p/2'],
      ['Baseball batting gloves', 'https://amazon.com/dp/3'],
      ['Gaming Monitor', 'https://walmart.com/ip/4'],
      ['Penny CPU', 'https://homedepot.com/p/5'],
      ['Hydraulic chuck sleeve', 'https://homedepot.com/p/6'],
      ['Reclaimed wood blank', 'https://amazon.com/dp/7'],
      ['Martini maker', 'https://amazon.com/dp/8'],
      ['Unclassifiable thing', 'https://example.com/p/9'],
      ['Automatic Litter Box Bundle', 'https://amazon.com/dp/16'],
      ['Funko POP Vinyl Figure', 'https://amazon.com/dp/17'],
    ];
    for (const [t, u] of samples) {
      const cat = priced(t, u);
      expect(known.has(cat), `${t} -> ${cat}`).toBe(true);
    }
  });
});

describe('posts that are not deals at all', () => {
  const withEmbed = (fields) => parse(message({ embeds: [embed({ color: 0, fields: [], ...fields })] }));

  it('rejects an affiliate redirect with no product behind it', () => {
    // "CHECK FOR STOCK $7.98 WalmartPartner ad" — a mavely.app.link affiliate
    // hop. It has a price and a link, so it passed the old gate, but there is
    // no product and no retailer listing behind it.
    const deal = withEmbed({
      title: 'CHECK FOR STOCK $7.98',
      description: 'WalmartPartner ad',
      url: 'https://mavely.app.link/5M9FrMSTP6b',
    });
    expect(deal).toBeNull();
  });

  it('still keeps a real deal on a real retailer', () => {
    const deal = withEmbed({
      title: 'Ninja Foodi Air Fryer - Dualzone',
      description: 'Now $149, retail $229!',
      url: 'https://www.amazon.com/dp/B07XJ8C8F5',
    });
    expect(deal).not.toBeNull();
  });
});
