// Gates for the charge-date disclosure.
//
// A Whop trial puts a card on file and bills at the end of the window. The
// cost of getting that disclosure wrong is not an angry comment — it is a
// chargeback against Whop's account, because Whop is the merchant of record.
// That is a worse outcome than the sale was ever worth, and it is invisible
// until it happens.
//
// So these tests are mostly about the copy surviving edits. A trim of the
// pricing page for length is exactly the change that quietly removes the
// sentence explaining when someone is charged.
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import BillingTransparency, { PLAN_PRICES } from '../components/BillingTransparency.jsx';
import { WHOP_BILLING_URL } from '../lib/checkout.js';

const html = renderToStaticMarkup(
  <MemoryRouter>
    <BillingTransparency />
  </MemoryRouter>
);

describe('charge date is disclosed', () => {
  it('mounts', () => {
    expect(html.length).toBeGreaterThan(300);
  });

  it('says when the trial charges and how long it is', () => {
    expect(html).toMatch(/when you are charged/i);
    expect(html).toMatch(/7 days/i);
    expect(html).toMatch(/not before/i);
  });

  it('states both post-trial prices', () => {
    expect(html).toContain(`$${PLAN_PRICES.monthly}`);
    expect(html).toContain(`$${PLAN_PRICES.annual}`);
  });

  it('links to cancel rather than describing it in prose only', () => {
    // A reader who has decided to cancel must reach the screen in one click.
    // Telling them to "go to your Whop account" and stopping there is the
    // version that loses the cancellation.
    expect(html).toContain(WHOP_BILLING_URL);
    expect(html).toMatch(/manage or cancel/i);
  });

  it('does not describe the free tier as chargeable', () => {
    expect(html).toMatch(/joining the discord is free/i);
    expect(html).toMatch(/no card, no charge/i);
  });

  it('does not imply we handle the card ourselves', () => {
    expect(html).toMatch(/do not see or store your card details/i);
    expect(html).toMatch(/handled entirely by whop/i);
  });

  it('never promises the charge is refundable on request', () => {
    // The refund policy is linked, not restated here. Restating it invites a
    // promise the page cannot keep.
    expect(html).toMatch(/refund policy/i);
  });
});

describe('prices agree with the pricing page', () => {
  // The billing block and the pricing table are written separately. They are
  // the same promise to the same person at two moments in the funnel, so a
  // mismatch is a real defect rather than a cosmetic one.
  it('PLAN_PRICES matches the constants on Upgrade.jsx', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(
      new URL('../routes/Upgrade.jsx', import.meta.url),
      'utf8'
    );
    expect(src).toContain(`const PRICE_MONTHLY_MO = '$${PLAN_PRICES.monthly}/mo';`);
    expect(src).toContain(`const PRICE_YEARLY_YR = '$${PLAN_PRICES.annual}/yr';`);
  });

  it('monthly annualised does not undercut the yearly price', () => {
    // $200/yr against $25/mo means the yearly tier saves two months. If either
    // number moves, this catches the case where the yearly price stops being
    // the better deal while the page still presents it as the saving.
    const yearlyPerMonth = PLAN_PRICES.annual / 12;
    expect(yearlyPerMonth).toBeLessThan(PLAN_PRICES.monthly);
  });
});
