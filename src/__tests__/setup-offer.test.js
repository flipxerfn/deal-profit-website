// Named "Deal Feed Setup", not "Mirror Setup". Mirroring is jargon: a buyer who
// has to stop to work out what a mirror is has already bounced. The URL slug
// still contains "mirror" because Whop fixes a product's route at creation and
// it cannot be changed — so this test asserts the NAME is jargon-free while
// tolerating the address, and a reader-visible label never says "mirror".
//
// A one-time service sitting next to a subscription is the easiest way to
// accidentally sell someone the wrong thing, and the descriptions are the
// place that mistake gets made rather than the code.
//
// Three things can go wrong, and each of them is real money to the wrong person:
//
//  1. startCheckout() — the subscription path — reaching the one-time product.
//     A visitor who clicks "Get Premium" must never be shown a $55 one-time
//     charge. startCheckout dispatches on trial vs paid, and adding a third
//     destination to it is exactly the change that would cause this.
//
//  2. The two products being described as if they were the same offer. Mirror
//     Setup is optional and independent; a reader must be able to tell that
//     Premium does not include it and it does not include Premium.
//
//  3. A price that drifts from what Whop actually charges. The $55 lives in
//     checkout.js so the page and the assertions share one number, and the test
//     compares them.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  startCheckout,
  WHOP_CHECKOUT_URL,
  WHOP_SETUP_URL,
  SETUP_PRICE_USD,
  DISCORD_INVITE,
} from '../lib/checkout.js';

const root = resolve(import.meta.dirname, '../..');
const upgrade = readFileSync(resolve(root, 'src/routes/Upgrade.jsx'), 'utf8');
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const upgradeCode = code(upgrade);

describe('the two offers point at different products', () => {
  it('never points at the same URL', () => {
    expect(WHOP_SETUP_URL).not.toBe(WHOP_CHECKOUT_URL);
    expect(WHOP_SETUP_URL).toMatch(/deal-profit-mirror-setup/);
    expect(WHOP_CHECKOUT_URL).toMatch(/premium-access/);
  });

  it('the mirror link is to the product route, not a checkout link', () => {
    // A product page shows both plans. A checkout link would preselect one.
    expect(WHOP_SETUP_URL).not.toMatch(/\/checkout\//);
  });
});

describe('startCheckout cannot sell the one-time service', () => {
  it('has exactly two destinations', () => {
    const src = readFileSync(resolve(root, 'src/lib/checkout.js'), 'utf8');
    // Bounded to the function body. Slicing to end-of-file would include the
    // dormant Stripe section below it, which has its own location assignments
    // and would make the count meaningless.
    const start = src.indexOf('export async function startCheckout');
    const body = src.slice(start, src.indexOf('\n}', start) + 2);
    const hrefs = [...body.matchAll(/window\.location\.href\s*=\s*([^;]+);/g)].map((m) => m[1]);
    // trial -> Discord invite, paid -> Whop checkout. That is all it does, in
    // one ternary, so a third destination has nowhere to hide.
    expect(hrefs).toHaveLength(1);
    expect(hrefs[0].trim()).toMatch(/^trial\s*\?\s*DISCORD_INVITE\s*:\s*WHOP_CHECKOUT_URL$/);
  });

  it('never references the mirror URL from the checkout dispatcher', () => {
    const src = readFileSync(resolve(root, 'src/lib/checkout.js'), 'utf8');
    const start = src.indexOf('export async function startCheckout');
    const body = src.slice(start, src.indexOf('\n}', start) + 2);
    expect(body, 'startCheckout must not route to the one-time product').not.toMatch(
      /WHOP_SETUP_URL|MIRROR_PRICE/
    );
  });

  it('the Discord trial never leads to the mirror product either', () => {
    // A free trial that then offers a $55 one-time is a bait and switch.
    expect(DISCORD_INVITE).not.toMatch(/whop\.com/);
  });
});

describe('the page describes the two offers as separate', () => {
  it('marks the mirror as optional', () => {
    expect(upgradeCode).toMatch(/Optional\s*&middot;\s*one-time/);
  });

  it('says explicitly that it is not part of Premium', () => {
    // This is the sentence that stops someone paying $25 and expecting the
    // $55 service, or the reverse.
    expect(upgradeCode).toMatch(/not part of Premium/i);
    expect(upgradeCode).toMatch(/do not need it to be a\s*member here/i);
  });

  it('shows the price from the shared constant, not a hard-coded number', () => {
    expect(upgrade).toMatch(/Deal Feed Setup &mdash; \$55 once/);
    // The literal is rendered, but the component must not define its own.
    expect(upgradeCode).not.toMatch(/const\s+SETUP_PRICE[A-Z_]*\s*=/);
  });

  it('the price constant is what the page says', () => {
    expect(SETUP_PRICE_USD).toBe(55);
    expect(upgrade).toContain(`$${SETUP_PRICE_USD} once`);
  });

  it('says one-time, so nobody expects a subscription', () => {
    expect(upgradeCode).toMatch(/Nothing to cancel/i);
  });

  it('does not promise deal volume or speed', () => {
    // The Whop description explicitly declines to promise this. A sentence on
    // our own site claiming volume would contradict the page Whop attaches to
    // disputes, and pricing errors are corrected in minutes.
    for (const phrase of [
      /guarantee[sd]?\s+\d+\s*(?:deals|finds)/i,
      /\d+\+?\s*deals (?:a|per) (?:day|week|month)/i,
      /real-?time (?:alerts|feed) guaranteed/i,
    ]) {
      expect(upgradeCode, `promises volume: ${phrase}`).not.toMatch(phrase);
    }
  });

  it('never calls it a mirror in anything a reader sees', () => {
    // The name is the pitch. "Mirror" only survives in the URL, which is not
    // read by anyone deciding whether to buy.
    expect(upgradeCode, 'the page says "mirror" somewhere visible').not.toMatch(/mirror/i);
    expect(upgradeCode).toMatch(/Deal Feed Setup/);
  });

  it('keeps the jargon out of the exported names too', () => {
    const src = readFileSync(resolve(root, 'src/lib/checkout.js'), 'utf8');
    const names = [...src.matchAll(/export const (\w+)/g)].map((m) => m[1]);
    expect(names.filter((n) => /MIRROR/i.test(n)), 'an exported name still says mirror').toEqual([]);
  });

  it('leaves the subscriber flow alone', () => {
    // Adding a second offer must not have disturbed the first one's copy.
    expect(upgradeCode).toMatch(/What the upgrade button does/);
    expect(upgradeCode).toMatch(/How to cancel/);
  });
});
