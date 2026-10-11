// The trial notice on /welcome had to contradict the Terms of Service.
//
// The TOS was rebuilt on 2026-10-10 to state plainly that the trial "bills
// automatically when the trial ends". /welcome said the opposite to the same
// person at the same moment:
//
//   "…you are not charged — nothing here is automatic and there is nothing
//    you need to remember to do."
//
// Both cannot be true. The charge IS automatic, Whop does it without asking,
// and /welcome is the page a trial buyer is looking at when the charge lands.
// A page that reassures them nothing is automatic, directly above a TOS that
// says it is, is how a subscription becomes a dispute.
//
// This asserts the reassurance is gone and replaced with an accurate
// statement of what happens and how to prevent it.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const welcome = readFileSync(
  resolve(import.meta.dirname, '../routes/Welcome.jsx'),
  'utf8'
);

const trialNotice = welcome.match(
  /<strong[^>]*>Your trial is running\.<\/strong>([\s\S]*?)<\/motion\.div>/
);

describe('/welcome trial notice', () => {
  beforeAll(() => {
    expect(trialNotice, 'trial notice block not found on /welcome').toBeTruthy();
  });

  it('does not tell a trial buyer that nothing is automatic', () => {
    const copy = trialNotice[1].toLowerCase();
    // The old phrasing. The charge happens on its own — Whop does not wait for
    // confirmation, and there is no reminder from us.
    expect(copy).not.toMatch(/nothing here is automatic/);
    expect(copy).not.toMatch(/nothing is automatic/);
  });

  it('states the charge happens without a reminder', () => {
    const copy = trialNotice[1].toLowerCase();
    expect(copy).toMatch(/on its own|automatically/);
    expect(copy).toMatch(/no reminder|without/);
  });

  it('still tells them how to avoid it and what they keep', () => {
    const copy = trialNotice[1].toLowerCase();
    expect(copy).toMatch(/cancel/);
    expect(copy).toMatch(/keep access/);
  });

  it('agrees with the Terms of Service on the trial length', () => {
    // TOS section 2 and the cancellation policy both say seven days.
    expect(trialNotice[1]).toMatch(/7 days/);
  });
});