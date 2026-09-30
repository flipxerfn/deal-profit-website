// Falsified per case: each assertion below was written after confirming the
// naive version gets it wrong. The ones that matter most:
//
//  - A "success" filter that accepts everything puts the channel's own
//    "🔥 NEW DEAL" announcements on a page whose entire job is to show that
//    MEMBERS succeed. That looks like the deals feed wearing a success
//    costume, and it undoes the credibility the rest of the site works for.
//
//  - A text-only version of this page reduces "here is my order, look" to the
//    words "got it for $39.99". Members mostly post PICTURES — an order
//    confirmation, a locked-in price, the item in hand. Those images are the
//    actual evidence, so an image alone qualifies a post and images lead the
//    sort order.
//
//  - A "verified member" badge is a claim about someone's identity that
//    nothing in Discord proves. An earlier version of this site applied it to
//    arbitrary posts. It is asserted absent below because it is the kind of
//    small unearned claim that adds up.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { looksLikeSuccess, excerpt, toSuccessPosts, snowflakeDate, CAVEAT } from './successPosts.js';

const root = resolve(import.meta.dirname, '..');
const src = readFileSync(resolve(root, 'worker/successPosts.js'), 'utf8');

// Real Discord snowflakes, derived rather than typed.
//
// The first version of this file used snowflakes starting "1234567890...",
// which decode to April 2024. Against a 365-day age cut that made every
// fixture expire, so four tests failed for a reason that had nothing to do
// with the code under test. Deriving them from the current clock means the
// fixtures stay current and a real failure is a real failure.
const DISCORD_EPOCH = 1420070400000;
const snowflakeAt = (msAgo) =>
  String(Math.floor((Date.now() - msAgo - DISCORD_EPOCH) * 4194304));
const HOUR = 3600 * 1000;

const AT = {
  day1: snowflakeAt(3 * HOUR),
  day2: snowflakeAt(1 * HOUR),
  // Comfortably beyond the 365-day cut.
  old: snowflakeAt(800 * 24 * HOUR),
};

const PNG = 'https://cdn.discordapp.com/attachments/1/2/receipt.png';
const JPG = 'https://cdn.discordapp.com/attachments/1/3/photo.jpg';

const msg = (over = {}) => ({
  id: AT.day1,
  content: 'got it for $39.99, finally secured the one I wanted',
  author: { username: 'member', bot: false },
  attachments: [],
  embeds: [],
  ...over,
});

const withImage = (over = {}) =>
  msg({
    content: 'mine got here 🎉',
    attachments: [{ content_type: 'image/png', url: PNG }],
    ...over,
  });

describe('a post with a picture counts as a member showing a result', () => {
  it('accepts a photo with an excited caption and no figure', () => {
    // "mine got here 🎉" carries no price and would fail a text-only filter.
    // The picture IS the evidence: it is an order or the item itself.
    expect(looksLikeSuccess('mine got here 🎉', { hasImage: true })).toBe(true);
  });

  it('accepts a photo with no caption at all', () => {
    expect(looksLikeSuccess('', { hasImage: true })).toBe(true);
  });

  it('rejects that same caption with no picture', () => {
    // Same words, no proof. The difference is the whole point.
    expect(looksLikeSuccess('mine got here 🎉', { hasImage: false })).toBe(false);
  });

  it('still rejects an announcement that happens to carry an image', () => {
    // An image does not launder a deal post into a member's win.
    expect(looksLikeSuccess('NEW DEAL $20 RTX', { hasImage: true })).toBe(false);
  });

  it('picks up the image from an attachment or an embed', () => {
    const a = toSuccessPosts([withImage()])[0];
    expect(a.image).toBe(PNG);

    const e = toSuccessPosts([
      msg({ content: 'locked in', embeds: [{ image: { url: JPG } }] }),
    ])[0];
    expect(e.image).toBe(JPG);
  });

  it('ignores non-image attachments', () => {
    // A .pdf receipt should not make an empty post "visual evidence".
    const p = toSuccessPosts([
      msg({ content: '', attachments: [{ content_type: 'application/pdf', url: 'x.pdf' }] }),
    ]);
    expect(p).toEqual([]);
  });

  it('leads with the picture posts', () => {
    const out = toSuccessPosts([
      msg({ id: AT.day1, content: 'got it for $39.99' }),
      withImage({ id: AT.day2 }),
    ]);
    expect(out[0].image).toBe(PNG);
  });

  it('gives an image alt so it is not announced as decoration', () => {
    const p = toSuccessPosts([withImage()])[0];
    expect(p.imageAlt).toBeTruthy();
    expect(p.imageAlt.length).toBeGreaterThan(4);
  });
});

describe('a text-only success post still needs a concrete figure', () => {
  it.each([
    'got it for $39.99, finally secured it',
    'ordered mine, $19.99 at checkout',
    'snagged the set for $12 — thanks!',
    'bought two at $8.99 each, still available',
    'checked out at $4.50, confirmed the order',
  ])('accepts %j', (text) => {
    expect(looksLikeSuccess(text)).toBe(true);
  });

  it.each([
    'NEW DEAL: RTX 5060 for $39.99',
    'just dropped — $18.40 on dmflip',
    '🔥 NEW DEAL $25 at clearanceexplorer',
    'I should grab this one',
    'going to try to buy it now',
    'got it',
    'lol the shipping on this is brutal',
  ])('rejects %j', (text) => {
    expect(looksLikeSuccess(text)).toBe(false);
  });

  it('rejects an announcement even when it also contains a success word', () => {
    expect(looksLikeSuccess('NEW DEAL $20, got the link')).toBe(false);
  });
});

describe('the feed never claims anything it cannot support', () => {
  it('carries no earnings figure', () => {
    // The whole reason this is defensible. An unverifiable income number on a
    // public page is the claim that gets accounts flagged.
    for (const p of toSuccessPosts([msg(), withImage()])) {
      expect(p.earnings).toBeNull();
    }
  });

  it('never labels anyone a verified member', () => {
    for (const p of toSuccessPosts([withImage()])) expect(p.verified).toBeUndefined();
    expect(src, 'the phrase must not appear as a member claim').not.toMatch(
      /verified\s+member/i
    );
  });

  it('states the caveat in the source, not only in the UI', () => {
    // If the disclaimer lives purely in a component, deleting the component
    // silently removes the only thing making these posts publishable. The
    // string is exported so the UI is forced to import the same wording
    // rather than retyping something weaker.
    expect(CAVEAT).toMatch(/not typical/i);
    expect(CAVEAT).toMatch(/not a promise/i);
    expect(src).toMatch(/export const CAVEAT/);
  });

  it('reads the author as a name, never as a verified identity', () => {
    const p = toSuccessPosts([withImage({ author: { username: 'someone', bot: false } })])[0];
    expect(p.author).toBe('someone');
  });
});

describe('the feed is built from member posts only', () => {
  it('drops bot posts', () => {
    expect(toSuccessPosts([withImage({ author: { username: 'Deals', bot: true } })])).toEqual([]);
  });

  it('drops posts with neither body nor image', () => {
    expect(toSuccessPosts([msg({ content: '   ' })])).toEqual([]);
  });

  it('dedupes the same message repeated', () => {
    expect(toSuccessPosts([msg({ id: AT.day1 }), msg({ id: AT.day2 })])).toHaveLength(1);
  });

  it('keeps distinct posts', () => {
    const out = toSuccessPosts([
      msg({ id: AT.day2, content: 'got it for $39.99' }),
      msg({ id: AT.day1, content: 'ordered mine at $12.50' }),
    ]);
    expect(out).toHaveLength(2);
  });

  it('sorts newest first within the same group', () => {
    const out = toSuccessPosts([
      msg({ id: AT.day1, content: 'older text post, got it for $10' }),
      msg({ id: AT.day2, content: 'newer text post, got it for $20' }),
    ]);
    expect(out[0].text).toMatch(/newer/);
  });

  it('honours the limit', () => {
    // Each post needs a DISTINCT caption as well as a distinct id. The first
    // version generated unique snowflakes but left every caption as the same
    // "mine got here", so the dedupe — correctly — collapsed 30 posts into 1
    // and the test failed for a reason of its own making.
    const many = Array.from({ length: 30 }, (_, i) =>
      withImage({
        id: snowflakeAt((i + 1) * 60 * 1000),
        content: `order ${i + 1} came through for $${10 + i}.99`,
      })
    );
    expect(toSuccessPosts(many, { limit: 6 })).toHaveLength(6);
  });

  it('ignores nonsense input instead of throwing', () => {
    for (const bad of [null, undefined, 'nope', 42, {}]) {
      expect(() => toSuccessPosts(bad)).not.toThrow();
    }
  });
});

describe('timestamps', () => {
  it('decodes a Discord snowflake', () => {
    const iso = snowflakeDate(AT.day1);
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(Date.parse(iso)).toBeGreaterThan(Date.parse('2020-01-01'));
  });

  it('returns null rather than a wrong date', () => {
    for (const bad of ['', 'abc', '123', null, undefined]) {
      expect(snowflakeDate(bad)).toBeNull();
    }
  });

  it('drops posts older than a year', () => {
    expect(toSuccessPosts([withImage({ id: AT.old })])).toEqual([]);
  });
});

describe('excerpts cut on a word boundary', () => {
  it('leaves a short post alone', () => {
    expect(excerpt('got it for $39.99')).toBe('got it for $39.99');
  });

  it('truncates at a word boundary, never mid-word', () => {
    const long = 'got it for $39.99 and honestly the shipping was faster than i expected honestly';
    const out = excerpt(long, 40);
    expect(out.endsWith('…')).toBe(true);
    // Truncating at a space means the final word is always COMPLETE. "…the…"
    // is fine — "the" is a whole word that happens to be where it landed. What
    // must never happen is a fragment like "…shipp…", so the check is that the
    // kept text ends on a word that appears whole in the source.
    const kept = out.slice(0, -1);
    const lastWord = kept.split(' ').pop();
    expect(long.split(' ')).toContain(lastWord);
  });

  it('hard-cuts a single word too long to break on', () => {
    // No space exists to break at, so this is the one case that must cut
    // mid-word. Asserting it does NOT would be wrong.
    const giant = 'a'.repeat(300);
    const out = excerpt(giant, 40);
    expect(out).toBe('a'.repeat(40) + '…');
  });

  it('collapses newlines', () => {
    expect(excerpt('got it\n\nfor   $39.99')).toBe('got it for $39.99');
  });

  it('returns empty for an empty caption, so the card can hide it', () => {
    expect(excerpt('')).toBe('');
    expect(excerpt(null)).toBe('');
  });
});
