// Cancellation has to work for a real member, and the published policy has to
// describe the same path the buttons actually take.
//
// The regression these guard against is specific and already happened once:
// billing moved to Whop, the cancel button kept calling our Stripe endpoint,
// and /refunds still told members to click a button that only ever appeared for
// Stripe subscribers. A Whop member was left with no way to cancel at all, on a
// page that promised one existed.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { terms } from '../content/legal/terms';
import { refunds } from '../content/legal/refunds';

const root = resolve(import.meta.dirname, '../..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');

const allLegalText = [terms, refunds]
  .flatMap((d) => d.sections.flatMap((s) => [...(s.body ?? []), ...(s.list ?? [])]))
  .join(' ')
  .toLowerCase();

describe('the cancel path a member can actually take', () => {
  it('sends members to Whop, the only party that can stop the charge', () => {
    const cancel = read('src/components/CancelViaWhop.jsx');
    // It uses the shared constant rather than repeating the URL, so there is
    // one place to change if the product moves.
    expect(cancel).toMatch(/import \{[^}]*WHOP_CHECKOUT_URL[^}]*\} from '\.\.\/lib\/checkout'/);
    expect(cancel).toContain('WHOP_CHECKOUT_URL');
    // It must not pretend to cancel. Claiming to and then failing is worse
    // than saying plainly where the button is.
    expect(cancel).not.toMatch(/api\/stripe\/cancel/);
    // And it names the two real controls rather than hand-waving.
    expect(cancel).toContain('Manage membership');
    expect(cancel).toContain('Cancel membership');
  });

  it('gives the Stripe cancel button only to actual Stripe subscribers', () => {
    // /api/stripe/cancel finds a Stripe subscription by Discord id. A Whop
    // member has none, so that endpoint must not be what a Whop member is sent
    // to. It stays for legacy Stripe subs and must stay behind `subActive`.
    const flow = read('src/components/PaymentFlow.jsx');
    const start = flow.indexOf('{subActive ? (');
    const split = flow.indexOf('/* A Whop member');
    expect(start, 'the subActive ternary was not found').toBeGreaterThan(-1);
    expect(split, 'the Whop-member branch was not found').toBeGreaterThan(start);

    // Slice the two branches out rather than regex the whole ternary, which is
    // full of nested parens and braces.
    const stripeBranch = flow.slice(start, split);
    const whopBranch = flow.slice(split, flow.indexOf('</div>', split));

    expect(stripeBranch).toContain('handleCancelSubscription(false)');
    // The Stripe endpoint must never appear on the Whop side of the ternary.
    expect(whopBranch).toContain('CancelViaWhop');
    expect(whopBranch).not.toContain('handleCancelSubscription');
  });
});

describe('the policy matches the buttons', () => {
  it('tells members to cancel on Whop, not on a button here', () => {
    const cancelNow = refunds.sections.find((s) => s.id === 'cancel-now');
    const text = cancelNow.body.join(' ').toLowerCase();
    expect(text).toContain('whop');
    expect(text).toContain('manage membership');
    // The old claim pointed at a control that only existed for Stripe subs.
    expect(text).not.toContain('cancel subscription button');
    expect(text).not.toContain('/upgrade page');
  });

  it('never claims a timed card trial with a payment method on file', () => {
    // This is the copy most likely to produce a chargeback: "a payment method
    // is required" reads as "you will be charged on day 7".
    expect(allLegalText).not.toContain('payment method is required');
    expect(allLegalText).not.toMatch(/payment method is required to start/);
    expect(allLegalText).not.toMatch(/free trial from any trial button/);
  });

  it('states plainly that no card is taken for the trial', () => {
    const trial = refunds.sections.find((s) => s.id === 'trial');
    expect(trial.body.join(' ').toLowerCase()).toMatch(/no card/);
    expect(trial.body.join(' ').toLowerCase()).toMatch(/discord/);
  });

  it('names Whop as the processor and never claims Stripe', () => {
    const subs = terms.sections.find((s) => s.id === 'subscriptions');
    expect(subs.body.join(' ')).toContain('Whop');
    expect(subs.body.join(' ')).not.toMatch(/\bStripe\b/);
    // Nothing in the published policy may still blame Stripe.
    expect(allLegalText).not.toMatch(/\bstripe\b/);
  });

  it('points plan changes at Whop too', () => {
    const upgrades = refunds.sections.find((s) => s.id === 'upgrades');
    const text = upgrades.body.join(' ').toLowerCase();
    expect(text).toContain('manage membership');
    expect(text).not.toContain('you are charged or credited the difference');
  });

  it('keeps the terms cancellation section consistent with refunds', () => {
    const termsCancel = terms.sections.find((s) => s.id === 'cancel');
    const text = termsCancel.body.join(' ').toLowerCase();
    expect(text).toContain('whop');
    expect(text).not.toContain('from the /upgrade page on this site');
  });
});
