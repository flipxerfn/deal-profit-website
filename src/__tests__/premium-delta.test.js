// The free-vs-premium comparison is the only thing on the site that argues for
// paying, and it was failing at it.
//
// The premium list was nine items that all promised the same thing — "you see
// deals sooner". Faster alerts, price error alerts, penny deal alerts, more
// focused notifications, more deal opportunities, premium-only deal
// opportunities. Six ways of promising one speed bump. A buyer reads that and
// concludes the list is padding, which is a fair conclusion.
//
// These tests exist because the failure mode is invisible in a screenshot: the
// table looks full and balanced. It takes counting distinct promises to notice
// that six lines say the same thing.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(
  resolve(import.meta.dirname, '../routes/Upgrade.jsx'),
  'utf8'
);

const listOf = (name) => {
  const m = src.match(new RegExp(`const ${name}\\s*=\\s*\\[([\\s\\S]*?)\\n\\];`));
  expect(m, `${name} not found`).toBeTruthy();
  return [...m[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]);
};

const free = listOf('FREE_FEATURES');
const premium = listOf('PREMIUM_FEATURES');

/**
 * Rough synonym groups, deliberately generous. "alert"/"notification" are
 * treated as the same promise because to a buyer they are — both mean "it
 * tells me". The old list failed this on six items.
 */
const SPEED_PROMISE = [
  /\balert/i,
  /\bnotification/i,
  /\bdigest\b/i,
  /\bsoon(er)?\b/i,
  /\bfast(er)?\b/i,
];

describe('the premium tier promises distinguishable things', () => {
  it('does not stack the same promise six ways', () => {
    const speedLines = premium.filter((f) => SPEED_PROMISE.some((re) => re.test(f)));
    // Exactly one line should be about speed — the primary pitch. Two is
    // tolerable if one is the umbrella and one is a specific channel, but the
    // old list had six and that is what read as invented.
    expect(
      speedLines.length,
      `these all promise the same thing — "sees deals sooner":\n  ` +
        speedLines.map((l) => `• ${l}`).join('\n  ')
    ).toBeLessThanOrEqual(2);
  });

  it('says what is not in the free tier', () => {
    // A comparison table's only job is the delta. A premium list that never
    // mentions the free tier gives the reader nothing to weigh against.
    const mentionsDelta = premium.some((f) =>
      /\bonly\b|never touch|your own|dedicated|priority/i.test(f)
    );
    expect(mentionsDelta).toBe(true);
  });

  it('describes outcomes rather than system capabilities', () => {
    // "Premium-only deal opportunities" is a capability. "Only the finds that
    // match what you actually buy" is something a buyer can picture themselves
    // using.
    const capabilityWords = /opportunit|access to|features?|alerts? for/i;
    const vague = premium.filter((f) => capabilityWords.test(f) && f.length < 45);
    expect(vague, `too short to mean anything to a buyer:\n  ${vague.join('\n  ')}`).toHaveLength(0);
  });

  it('leads with the actual argument for paying', () => {
    // The reason to pay for a price-error feed is that the errors are gone
    // quickly. If that is not in the list, the tier is just "more".
    expect(premium.join(' ')).toMatch(/gone|before then|minutes/i);
  });

  it('is not padded by near-duplicate lines', () => {
    // Cheap similarity check: no two lines should share most of their words.
    const words = (s) => new Set(s.toLowerCase().match(/[a-z]+/g) || []);
    for (let i = 0; i < premium.length; i += 1) {
      for (let j = i + 1; j < premium.length; j += 1) {
        const a = words(premium[i]);
        const b = words(premium[j]);
        const shared = [...a].filter((w) => b.has(w)).length;
        const overlap = shared / Math.min(a.size, b.size);
        expect(
          overlap,
          `these two are near the same line (${Math.round(overlap * 100)}% shared):\n` +
            `  • ${premium[i]}\n  • ${premium[j]}`
        ).toBeLessThan(0.7);
      }
    }
  });
});

describe('the free tier is described by what it is', () => {
  it('does not advertise basics as features', () => {
    // "Basic deal browsing" was on the free list. That is not a feature, it is
    // the absence of a problem, and it made the free tier look thin.
    for (const filler of [/^basic /i, /^selected /i, /browsing$/i]) {
      const found = free.filter((f) => filler.test(f));
      expect(found, `free tier advertises filler: ${found.join(', ')}`).toHaveLength(0);
    }
  });

  it('is still worth having on its own', () => {
    // Someone must be able to join free and feel they got something real,
    // otherwise the free tier is a bait and the paid tier is a rescue.
    expect(free.length).toBeGreaterThanOrEqual(4);
  });
});