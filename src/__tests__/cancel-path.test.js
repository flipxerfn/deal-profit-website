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

  it('discloses the card and the charge date, and never hides either', () => {
    // This used to assert the opposite — that "payment method is required"
    // appeared nowhere — because the trial was in Discord and took no card.
    // It now runs on Whop and takes one, so the chargeback risk this test was
    // guarding against is real and has to be disclosed, not avoided.
    //
    // The wording still matters: the pages must say a card is held AND say when
    // it is charged AND say how to stop it. Saying only the first is the copy
    // that produces chargebacks.
    const subs = terms.sections.find((s) => s.id === 'subscriptions');
    const subText = subs.body.join(' ');
    expect(subText).toMatch(/7 days/);
    expect(subText.toLowerCase()).toMatch(/payment method is required|card/);
    expect(subText.toLowerCase()).toMatch(/cancel/);
    expect(subText.toLowerCase()).not.toMatch(/no card/);
    // Never imply a trial exists that bypasses checkout.
    expect(allLegalText).not.toMatch(/free trial from any trial button/);
  });

  it('states plainly what the trial does and does not charge', () => {
    // The refund page is the document that gets attached to a chargeback, so it
    // has to describe the real model: a 7-day Whop trial, card on file, and no
    // charge if cancelled first. It used to assert "no card", which was true
    // when the trial lived in Discord and is now false.
    const trial = refunds.sections.find((s) => s.id === 'trial');
    const text = trial.body.join(' ');
    expect(text.toLowerCase()).toMatch(/7 days/);
    expect(text).toContain('Whop');
    expect(text.toLowerCase()).toMatch(/cancel/);
    expect(text.toLowerCase()).not.toMatch(/no card/);
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
