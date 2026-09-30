// The trial model was rebuilt around "the trial lives in Discord, no card", but
// this admin flow was never removed and it contradicts that in a way that
// matters.
//
// What it does: an admin pastes a Discord ID, the worker writes a `trialing`
// subscription, and calls grantPremiumRole — which grants the PAID role,
// `deals-profit` (1513212681438498857). It then logs to the logs channel:
//
//   "granted a manual 7-day trial by admin — first $25 charge <t:…:D>"
//
// Three problems:
//
//  1. There is no card. There is no "$25 charge", because nobody was charged.
//     The log line asserts a future charge that will never happen, on a system
//     that does not exist. Whop is the merchant of record now.
//
//  2. It grants the paid role for free. So the role means two different things:
//     "paid on Whop" and "an admin typed an ID". `hasPremiumRole` reads that
//     one role as the source of truth for ACCESS, so a comp silently becomes
//     indistinguishable from a paying member.
//
//  3. It is the highest-consequence free-access path on the site. 350 people
//     with a working grant command and 0 paying members is exactly the shape
//     that looks like a subscription-farming operation to a reviewer.
//
// The trial now happens in Discord, where members are told to try it there. So
// this whole flow is dead code that only creates risk.
//
// It is deleted rather than deprecated. Keeping a reachable "grant paid access
// for free" endpoint around in the hope nobody presses it is the failure mode,
// not the mitigation. If a comp is genuinely needed later, it should be a
// deliberate, documented action — not a leftover from the Stripe build.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const worker = readFileSync(resolve(root, 'worker/index.js'), 'utf8');
const code = worker
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

const gone = (p) => !existsSync(resolve(root, p));

describe('no free path to the paid role', () => {
  it('the manual trial grant endpoint is gone', () => {
    // A reachable "grant paid access, free, now" route is the single worst
    // thing to leave in a build whose account is already under scrutiny.
    expect(code).not.toMatch(/handleGrantTrial/);
    expect(code).not.toMatch(/handleRevokeTrial/);
    expect(code).not.toMatch(/grant-trial/);
    expect(code).not.toMatch(/revoke-trial/);
  });

  it('nothing asserts a $25 charge that will not happen', () => {
    // The old log line told the logs channel a charge was coming. No card is
    // involved anywhere in the trial, so this was fiction in an audit trail.
    expect(code).not.toMatch(/first \$25 charge/);
    expect(code).not.toMatch(/\$25 charge/);
  });

  it('no timed trial period constant remains', () => {
    // TRIAL_DAYS / TRIAL_PERIOD_MS only existed to expire a card trial that
    // does not exist. Their presence invites copy promising a timed trial.
    expect(code).not.toMatch(/TRIAL_PERIOD_MS/);
    expect(code).not.toMatch(/TRIAL_DAYS/);
  });

  it('the admin panel has no trials tab', () => {
    expect(gone('src/routes/admin/AdminTrials.jsx'));
    expect(code).not.toMatch(/AdminTrials/);
  });

  it('nothing in this Worker can grant the premium role', () => {
    // The stronger and simpler property than "every call site is
    // authenticated": the function does not exist. The first version of this
    // test checked for a session check before each call, which would have
    // passed on a helper whose only caller was the cron handler — where a
    // session check is neither present nor expected.
    expect(code).not.toMatch(/grantPremiumRole/);
  });

  it('the only remaining role change is a removal on expiry', () => {
    // revokePremiumRole has exactly one caller, the scheduled sweep. Asserting
    // the count keeps a new call site from appearing unnoticed.
    const calls = [...code.matchAll(/revokePremiumRole\(/g)];
    // One is the definition, one is the call.
    expect(calls.length).toBe(2);
    const after = code.slice(calls[1].index);
    expect(after.slice(0, 400), 'the revoke call is not in the scheduled sweep').toMatch(
      /scheduled|expired/i
    );
  });
});

describe('the surviving role helper stays honest about what the role means', () => {
  it('documents that the role is granted by Whop, not by this worker', () => {
    // The worker has no Whop webhook, so it cannot and does not grant or
    // revoke the paid role itself. Whop's own Discord integration does.
    expect(worker).toMatch(/nothing in this Worker grants the premium role/i);
    expect(worker).toMatch(/Whop's own Discord integration grants the/i);
  });
});
