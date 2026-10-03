import { describe, it, expect } from 'vitest';
import { validateSetupRequest, buildSetupMessage } from './setupRequest.js';

describe('invite validation', () => {
  // The bug this exists for: the first version required "https://" and rejected
  // "discord.gg/dealprofit" with "That does not look like a Discord invite."
  // People strip the scheme constantly, and a pasted invite is exactly where
  // that happens.
  const ACCEPTED = [
    'https://discord.gg/dealprofit',
    'http://discord.gg/dealprofit',
    'discord.gg/dealprofit',
    'www.discord.gg/dealprofit',
    'https://www.discord.gg/dealprofit',
    'https://discord.com/invite/dealprofit',
    'discord.com/invite/dealprofit',
    'https://discord.gg/deal-profit_1',
    'https://discord.gg/dealprofit/',
  ];

  for (const invite of ACCEPTED) {
    it(`accepts ${invite}`, () => {
      const r = validateSetupRequest({ invite, username: 'someone' });
      expect(r.error).toBeUndefined();
      // Normalisation only adds a scheme when one is missing; it does not
      // rewrite http to https.
      expect(r.value.invite).toMatch(/^https?:\/\//);
    });
  }

  it('adds the scheme when it was omitted', () => {
    expect(validateSetupRequest({ invite: 'discord.gg/ab', username: 'someone' }).value.invite)
      .toBe('https://discord.gg/ab');
  });

  // The reason the shape is checked at all: a public form that posts into the
  // owner's channel must not be usable as a paste-anything-into-Discord box.
  const REJECTED = [
    'https://example.com/discord.gg',
    'https://evil.test/webhook',
    'javascript:alert(1)',
    'https://discord.gg',
    'discord.gg/',
    'https://notdiscord.gg.evil.test/abc',
    'ftp://discord.gg/ab',
  ];

  for (const invite of REJECTED) {
    it(`rejects ${invite}`, () => {
      expect(validateSetupRequest({ invite, username: 'someone' }).error).toBeTruthy();
    });
  }
});

describe('username and honeypot', () => {
  it('requires both fields', () => {
    expect(validateSetupRequest({ username: 'someone' }).error).toBe('invite_required');
    expect(validateSetupRequest({ invite: 'discord.gg/ab' }).error).toBe('username_required');
  });

  it('rejects a username with characters Discord does not use', () => {
    expect(
      validateSetupRequest({ invite: 'discord.gg/ab', username: 'a<b>@c' }).error
    ).toBe('username_invalid');
  });

  it('swallows a honeypot submission but reports success', () => {
    // A bot that gets told it was detected learns to try again. Returning
    // success means it learns nothing and moves on.
    const r = validateSetupRequest({ invite: 'discord.gg/ab', username: 'u', website: 'spam' });
    expect(r.honeypot).toBe(true);
    expect(r.error).toBeUndefined();
    expect(r.value).toBeNull();
  });
});

describe('the message that lands in #logs', () => {
  it('includes the server, the person and the note', () => {
    const { value } = validateSetupRequest({
      invite: 'discord.gg/theirserver',
      username: 'buyer',
      note: 'pantry channel please',
    });
    const msg = buildSetupMessage(value);
    expect(value.invite).toBe('https://discord.gg/theirserver');
    expect(msg).toContain(value.invite);
    expect(msg).toContain(value.username);
    expect(msg).toContain(value.note);
    expect(msg).toContain('setup-request');
  });

  it('omits the quote block when there is no note', () => {
    const { value } = validateSetupRequest({ invite: 'discord.gg/ab', username: 'buyer' });
    expect(buildSetupMessage(value)).not.toContain('>');
  });
});