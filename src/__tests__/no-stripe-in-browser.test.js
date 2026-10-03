// Whop is the only payment provider in the browser.
//
// js.stripe.com/v3 was being loaded on every page while nothing in the
// frontend ever touched the Stripe.js SDK — no window.Stripe, no loadStripe, no
// @stripe/stripe-js. It cost every visitor roughly 50KB and was the sole cause
// of the remaining Lighthouse "Uses third-party cookies" failure.
//
// The server-side Stripe code is untouched and stays dormant. This file only
// guards the two things that would regress: the script creeping back, and the
// dormant path being re-enabled without the tag it needs.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const html = read('index.html');
const checkout = read('src/lib/checkout.js');

describe('no Stripe in the browser', () => {
  it('does not load js.stripe.com', () => {
    expect(html).not.toContain('js.stripe.com');
  });

  it('uses the Stripe.js SDK nowhere in the frontend', () => {
    // If this ever becomes true, the script tag has to come back — which is
    // why it is asserted rather than assumed.
    const walk = (dir) =>
      readdirSync(resolve(root, dir), { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]
      );
    const offenders = [];
    for (const file of walk('src')) {
      if (!/\.(jsx|js)$/.test(file) || /\.test\.js$/.test(file)) continue;
      for (const [i, line] of read(file).split('\n').entries()) {
        if (/window\.Stripe|loadStripe|from ['"]@stripe\/stripe-js/.test(line)) {
          offenders.push(`${file}:${i + 1} ${line.trim()}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('routes both purchases and trials to Whop', () => {
    // Purchases and the free trial now both happen on Whop. The trial used to
    // go to the Discord invite because no card was taken; it takes one now, so
    // there is no reason for two paths.
    expect(checkout).toContain('WHOP_CHECKOUT_URL');
    expect(checkout).toContain('DISCORD_INVITE');
    expect(checkout).not.toMatch(/trial \? DISCORD_INVITE/);
    expect(checkout).toMatch(/window\.location\.href = WHOP_CHECKOUT_URL/);
  });
});

describe('the dormant Stripe path is still recoverable', () => {
  it('keeps the server-side Stripe flow intact', () => {
    // The worker still owns /api/stripe/* and the webhook, so going back to
    // self-billing after the account is verified is a config change, not a
    // rebuild.
    expect(checkout).toContain('export async function startStripeCheckout');
    expect(checkout).toContain('/api/stripe/create-checkout');
  });

  it('warns that the script tag must be restored before re-enabling', () => {
    // Without this, flipping startCheckout back to Stripe would fail at the
    // point of payment with a confusing 3DS error instead of a clear cause.
    expect(checkout).toMatch(/js\.stripe\.com\/v3[^\n]*removed/i);
    expect(checkout).toMatch(/BEFORE re-enabling/i);
  });
});
