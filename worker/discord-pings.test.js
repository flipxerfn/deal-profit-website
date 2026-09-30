// Discord role pings were rendering on the public /deals page.
//
// The deal bots ping deal channels inside the embed TITLE, so a raw title
// arrives as:
//
//   "MILWAUKEE M18 8-TOOL COMBO KIT FOR $649 <@&1531649408050135195 <@&1091…"
//
// 53 of the 200 posts in the live feed carried one. A visitor scrolling /deals
// saw role markup in a third of the cards, which makes a site that is otherwise
// hand-curated look scraped.
//
// The subtle failure this test exists to catch: the pings TRAIL the title with
// no separator, so they become part of the product name. A title-cleaning
// function that only strips them from the start of the string passes a naive
// test and leaves the real bug in place.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseDealMessage } from './parseDeals.js';

const msg = (title, description = '') => ({
  type: 0,
  id: 'm1',
  guild_id: 'g1',
  channel_id: 'c1',
  content: '',
  attachments: [],
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
});

const parse = (title, description) => parseDealMessage(msg(title, description), 'c1');

describe('Discord pings never reach the page', () => {
  it('strips a trailing role ping, which is where they actually are', () => {
    // The real shape, verbatim from the live feed. The ping is glued to the
    // end of the product name with no separator.
    const deal = parse('MILWAUKEE M18 8-TOOL COMBO KIT FOR $649 <@&1531649408050135195 <@&10913930904907');
    expect(deal).not.toBeNull();
    expect(deal.title).toBe('MILWAUKEE M18 8-TOOL COMBO KIT FOR $649');
    expect(deal.title).not.toMatch(/<@/);
  });

  it('strips a leading ping', () => {
    expect(parse('<@&1531649408050135195 Sony WH-1000XM5 $229').title).not.toMatch(/<@/);
  });

  it('strips a ping in the middle', () => {
    expect(parse('Nike <@&1531649408050135195> Air Max 90 $87').title).not.toMatch(/<@/);
  });

  it.each([
    ['role', '<@&1531649408050135195>'],
    ['user', '<@1531649408050135195>'],
    ['nickname', '<@!1531649408050135195>'],
  ])('handles a %s ping', (_label, ping) => {
    const d = parse(`Boat Shoe ${ping} $40`);
    expect(d.title).not.toMatch(/<@/);
    expect(d.title).toBe('Boat Shoe $40');
  });

  it('strips pings from the description too', () => {
    const d = parse('Sony Headphones $229', 'Half off <@&1531649408050135195> today');
    expect(d.description).not.toMatch(/<@/);
  });

  it('strips a bare @id', () => {
    expect(parse('Dash Cam 4K <@1531649408050135195> $60').title).not.toMatch(/@15316434/);
  });

  it('leaves a clean title completely untouched', () => {
    const d = parse('Sony WH-1000XM5 Headphones $229');
    expect(d.title).toBe('Sony WH-1000XM5 Headphones $229');
  });

  it('does not eat a price or a model number that looks like an id', () => {
    // $1531649408050135195 is not a thing, but a title could legitimately
    // contain a long number. Only the <@…> form is a ping.
    const d = parse('Cosmic Ray Detector Model 1531649408050135195 $199');
    expect(d.title).toMatch(/1531649408050135195/);
  });

  it('collapses the whitespace a trailing ping leaves behind', () => {
    const d = parse('Espresso Machine $89 <@&1531649408050135195>');
    expect(d.title).toBe('Espresso Machine $89');
    expect(d.title).not.toMatch(/\s{2,}/);
  });
});

describe('the pattern is not accidentally strict again', () => {
  it('does not require a closing bracket', () => {
    // The bots emit "<@&1234…" with no ">". Requiring one is why 53 posts kept
    // their pings for as long as they did, and no fixture title happened to use
    // the closed form, so a behavioural test alone did not catch it.
    // Comments are stripped first: the file explains this rule in prose, and
    // the prose mentions the pattern, so a raw scan matches the comment.
    const raw = readFileSync(resolve(import.meta.dirname, 'parseDeals.js'), 'utf8');
    const src = raw
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    const line = src.split('\n').find((l) => /<@\[!&]\?/.test(l) && l.includes('replace')) ?? '';
    expect(line, 'ping pattern not found').toBeTruthy();
    expect(line, 'the closing > must be optional').toMatch(/>\?/);
  });

  it('accepts IDs as short as 10 digits', () => {
    // "<@&10913930904907" is 14 digits and was in the live feed. A {15,25}
    // floor matched the 19-digit ping beside it and missed this one, so a title
    // with both came out half-clean.
    expect(parse('Tool Set $40 <@&1234567890').title).toBe('Tool Set $40');
  });
});

describe('a ping cannot come back through the promotion path', () => {
  it('survives a title that is only a ping, promoting from the post body', () => {
    // The real path the bug took. A title of nothing but pings reads as junk,
    // so the promotion logic reaches into `para` to find a product line — and
    // if `para` still has the ping, it comes straight back into the title.
    //
    // The ping lives in `content` (the post body), which is what `para` is
    // built from. An earlier version of this test put it in the embed
    // description, so the promotion path was never actually exercised and the
    // test passed with the bug present.
    const d = parseDealMessage(
      {
        type: 0,
        id: 'm1',
        guild_id: 'g1',
        channel_id: 'c1',
        content: 'Boat Deck Shoe $45 <@&1531649408050135195 <@&10913930904907',
        attachments: [],
        embeds: [
          {
            color: 0,
            title: '<@&1531649408050135195 <@&10913930904907',
            url: 'https://www.amazon.com/dp/B000000000',
            author: { name: 'Amazon' },
            fields: [],
          },
        ],
      },
      'c1'
    );
    expect(d.title).not.toMatch(/<@/);
    expect(d.title).toMatch(/Boat Deck Shoe/);
  });
});

describe('no public field carries Discord markup', () => {
  it('sweeps every string field of a deal with pings in the title', () => {
    const deal = parse('MILWAUKEE M18 KIT $649 <@&1531649408050135195>', 'Deal <@!1531649408050135195>');
    const walk = (v, p = '') => {
      if (typeof v === 'string') {
        expect(v, `ping survived at ${p}`).not.toMatch(/<@[!&]?\d{15,25}>/);
      } else if (Array.isArray(v)) {
        v.forEach((x, i) => walk(x, `${p}[${i}]`));
      } else if (v && typeof v === 'object') {
        for (const [k, x] of Object.entries(v)) walk(x, `${p}.${k}`);
      }
    };
    walk(deal, 'deal');
  });
});
