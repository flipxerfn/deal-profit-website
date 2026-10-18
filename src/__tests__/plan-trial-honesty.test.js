// Only ONE of the two paid plans has a free trial.
//
// WHY THIS FILE EXISTS
// --------------------
// The site offered a 7-day free trial and, in the same breath, a yearly option,
// and sent both through one link to the Whop product page. Verified against
// Whop's own plan records:
//
//   plan_h6zSr2uB5L1hZ   Monthly   $25    trial_period_days: 7
//   plan_FRJ5tm80gKfCq   Yearly    $200   trial_period_days: null
//
// So the yearly plan has no trial at all. Two things followed from that, and
// both are the kind of defect that costs a chargeback rather than a comment:
//
//   1. The yearly option was presented with the same trial language as the
//      monthly one. Someone choosing yearly was told, in effect, they would get
//      7 days free first. They would not.
//   2. "Start Free Trial" pointed at the storefront, which shows PLANS. A
//      visitor who wanted the trial had to land there and pick the right plan
//      themselves, with no indication which one carried the trial.
//
// Prices and trial lengths are product facts that live in Whop. They are
// mirrored here so the page cannot quietly disagree with what the buyer is
// actually charged, which is the failure mode that turns into a dispute.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  getCheckoutUrl,
  WHOP_MONTHLY_URL,
  WHOP_YEARLY_URL,
} from '../lib/checkout.js';

const root = resolve(import.meta.dirname, '../..');
const upgrade = readFileSync(resolve(root, 'src/routes/Upgrade.jsx'), 'utf8');
// Comments explain the plan structure at length and are not rendered. Strip
// them before asserting on what a reader sees.
const upgradeCode = upgrade
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('each plan goes to its own Whop checkout', () => {
  it('both plan URLs are plan checkouts, not the storefront', () => {
    // The storefront shows plans; a plan checkout is one plan with its own
    // price and trial. The bug was sending a trial-seeker to the storefront.
    expect(WHOP_MONTHLY_URL).toMatch(/whop\.com\/checkout\/plan_/);
    expect(WHOP_YEARLY_URL).toMatch(/whop\.com\/checkout\/plan_/);
    expect(WHOP_MONTHLY_URL).not.toBe(WHOP_YEARLY_URL);
  });

  it('the trial always lands on the monthly plan', () => {
    // The monthly plan is the only one that carries the trial, so a trial
    // request must never resolve to the yearly checkout.
    expect(getCheckoutUrl({ trial: true })).toBe(WHOP_MONTHLY_URL);
    expect(getCheckoutUrl({ trial: true, interval: 'year' })).toBe(WHOP_MONTHLY_URL);
  });

  it('a monthly purchase and a yearly purchase resolve differently', () => {
    expect(getCheckoutUrl({ interval: 'month' })).toBe(WHOP_MONTHLY_URL);
    expect(getCheckoutUrl({ interval: 'year' })).toBe(WHOP_YEARLY_URL);
  });

  it('defaults to the monthly plan', () => {
    expect(getCheckoutUrl()).toBe(WHOP_MONTHLY_URL);
    expect(getCheckoutUrl({})).toBe(WHOP_MONTHLY_URL);
  });
});

describe('the page does not promise a trial on the yearly plan', () => {
  it('the yearly card is marked as having no trial', () => {
    // Without this label the yearly card sits next to a card headed "Free
    // Trial" and inherits its meaning by adjacency.
    expect(upgradeCode).toMatch(/No trial/);
  });

  it('the yearly card says it is billed upfront and annually', () => {
    expect(upgradeCode).toMatch(/Billed upfront/);
    expect(upgradeCode).toMatch(/Billed annually — no free trial/);
  });

  it('the yearly card links to the yearly checkout, not the trial plan', () => {
    // Find the yearly card's anchor by its constant, then confirm the trial
    // constant is not the one it uses.
    const yearly = upgradeCode.match(/href=\{WHOP_YEARLY_URL\}[\s\S]{0,400}?<\/a>/);
    expect(yearly, 'the yearly card has no link to WHOP_YEARLY_URL').toBeTruthy();
    expect(yearly[0]).not.toMatch(/WHOP_MONTHLY_URL/);
  });

  it('the trial card links to the monthly plan and states the post-trial price', () => {
    const trial = upgradeCode.match(/href=\{WHOP_MONTHLY_URL\}[\s\S]{0,500}?<\/a>/);
    expect(trial, 'the trial card has no link to WHOP_MONTHLY_URL').toBeTruthy();
    // A trial that does not say what it renews at is the copy that produces a
    // chargeback. The renewal price must be on the same card as the trial CTA.
    expect(trial[0]).not.toMatch(/WHOP_YEARLY_URL/);
    expect(upgradeCode).toMatch(/Then \{PRICE_MONTHLY_MO\} \+ applicable tax\./);
  });
});

describe('the trial copy states the card and the cancellation', () => {
  it('says a card is required', () => {
    expect(upgradeCode).toMatch(/Card required/i);
  });

  it('says cancelling before the trial ends avoids the charge', () => {
    expect(upgradeCode).toMatch(/Cancel before the trial ends to avoid a charge/i);
  });

  it('never offers a card-free trial', () => {
    // "No card" is only ever true of the free Discord tier. On a trial card it
    // is a scam-list violation.
    const trialCard = upgradeCode.slice(
      upgradeCode.indexOf('data-plan="trial"'),
      upgradeCode.indexOf('data-plan="trial"') + 1600
    );
    expect(trialCard.length).toBeGreaterThan(400);
    expect(trialCard).not.toMatch(/no card/i);
  });
});
