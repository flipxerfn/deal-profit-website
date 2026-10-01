// Discord markup was reaching the public front page through the success feed.
//
// The ping-stripping added for deal titles does not apply here. successPosts.js
// builds its captions from `m.content` on a completely separate path, and it
// never got the treatment. The live API was serving:
//
//   "thank you <@1361808798402216017"
//
// rendered in a caption on goosiev.com. Same class of bug as the 53 deal
// titles that carried role pings, in a place nobody checked because it is a
// newer endpoint.
//
// The same helper is applied here so the two paths cannot drift again: if the
// pattern needs fixing it only has to be fixed once.
import { describe, it, expect } from 'vitest';
import { toSuccessPosts } from './successPosts.js';

const msg = (content, extra = {}) => ({
  id: '1554657340421312532',
  channel_id: '1520255197161586779',
  author: { username: 'goosievv', id: '1' },
  content,
  attachments: [],
  embeds: [],
  timestamp: '2026-09-30T00:53:14.093Z',
  ...extra,
});

const run = (content) =>
  toSuccessPosts([msg(content, { // content_type is required: imageUrls() only accepts attachments that declare
  // an image content type, and without one the fixture is filtered out before
  // the ping logic is ever reached — which is how a whole test file can fail
  // for a reason that has nothing to do with what it is testing.
  attachments: [{ url: 'https://cdn.discordapp.com/x.png', filename: 'a.png', content_type: 'image/png' }] })], {
    limit: 5,
  })[0];

describe('no Discord markup survives into a public caption', () => {
  it('strips a user ping, which is what was live', () => {
    // Verbatim from the live API. A bare id with no closing bracket — the same
    // unterminated form the deal bots emit, and the same reason a naive
    // <@…> pattern that requires ">" misses it entirely.
    const post = run('thank you <@1361808798402216017');
    expect(post).not.toBeNull();
    expect(post.text).not.toMatch(/<@/);
    expect(post.text).not.toMatch(/1361808798402216017/);
  });

  it.each([
    ['user', '<@1361808798402216017'],
    ['nickname', '<@!1361808798402216017'],
    ['role', '<@&1531649408050135195'],
  ])('strips a %s ping', (_label, ping) => {
    expect(run(`nice find ${ping}`).text).not.toMatch(/<@/);
  });

  it('strips pings from the alt text too, not only the caption', () => {
    // The alt text is built from the same string and is read aloud by screen
    // readers, so a ping there is just as exposed.
    expect(run('grabbed it <@1361808798402216017').imageAlt).not.toMatch(/<@/);
  });

  it('leaves a clean caption untouched', () => {
    expect(run('grabbed this for 12 bucks').text).toBe('grabbed this for 12 bucks');
  });

  it('does not eat an ordinary number that is not a ping', () => {
    // The bot posts real figures — $12.49, order 1531649408. Only the <@…
    // form is a mention.
    const post = run('paid 1531649408050135195 for it');
    expect(post.text).toContain('1531649408050135195');
  });
});