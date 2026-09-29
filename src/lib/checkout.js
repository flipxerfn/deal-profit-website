// Shared checkout launcher used by the /upgrade page (which absorbed the old
// /payment and /trial pages).
//
// Current flow:
//   - Free trial  -> Discord invite. No card, so a trial member has nothing to
//                    dispute.
//   - Subscribe   -> Whop, where the plan is chosen and paid for.
//
// startStripeCheckout() below is the previous self-billed Stripe flow, kept
// intact for when the Stripe account is verified.

export async function fetchSubscription() {
  const res = await fetch('/api/user/subscription', {
    headers: { Accept: 'application/json' },
  });
  if (res.status === 401) return { unauthorized: true, subscription: null, premiumRole: null };
  if (!res.ok) return { unauthorized: false, subscription: null, premiumRole: null };
  const data = await res.json().catch(() => ({}));
  return {
    unauthorized: false,
    subscription: data.subscription ?? null,
    discord: data.discord ?? null,
    // Live Discord role check — source of truth for ACCESS (null = unknown)
    premiumRole: typeof data.premiumRole === 'boolean' ? data.premiumRole : null,
  };
}

// Where a member actually subscribes, and where the free trial happens.
export const WHOP_CHECKOUT_URL = 'https://whop.com/dealprofitco/premium-access-d5-f664/';
export const DISCORD_INVITE = 'https://discord.gg/dealprofit';

// Cancelling is Whop's to handle, not ours. Whop is the merchant of record, so
// only Whop can stop a future charge.
//
// Whop exposes a per-membership `manage_url`
// (https://whop.com/billing/manage/mem_xxx) and a cancel API, but both are keyed
// on the membership ID, which cannot be derived from a Discord session. Until a
// Whop webhook records that mapping we send people to the product page, where
// Whop's own "Manage membership" control lives, and spell out the fallback.
// Honest, and it works today.
export const WHOP_SIGN_IN_URL = 'https://whop.com/';

// Subscriptions are sold on Whop. The free trial is Discord-only on purpose:
// no card is taken during a trial, so there is nothing a trial member can
// dispute. Paid members buy on Whop.
export async function startCheckout({ trial = false } = {}) {
  window.location.href = trial ? DISCORD_INVITE : WHOP_CHECKOUT_URL;
  return { ok: true, redirected: true };
}

// ─── The original Stripe Checkout flow, kept intact and dormant ───
// Nothing calls this while startCheckout points at Whop. Use it again when the
// Stripe account is verified (SSN + live bank account): make startCheckout call
// this instead, passing { trial, interval } through as it already expects.
// The 7-day trial, monthly/yearly interval and Discord OAuth pre-step are all
// still here and still work.
//
// BEFORE re-enabling: the js.stripe.com/v3 script tag was removed from
// index.html, because nothing in the browser ever used the Stripe.js SDK — it
// cost every visitor ~50KB and third-party cookies for nothing. Put it back in
// <head> first, or 3DS confirmation will fail at the point of payment.
export async function startStripeCheckout({ trial = false, interval = 'month' } = {}) {
  // No Discord identity yet? Link it first — checkout requires a user.
  // (Members included: the button always goes to Stripe.)
  try {
    const sub = await fetchSubscription();
    if (sub.unauthorized) {
      window.location.href = '/api/discord/auth';
      return { ok: true, redirected: true };
    }
  } catch {
    // fall through to checkout attempt
  }

  try {
    const res = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ trial, interval }),
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.url) {
        window.location.href = data.url;
        return { ok: true, redirected: true };
      }
    }
    if (res.status === 401) {
      // Discord not linked yet — link first, then continue
      window.location.href = '/api/discord/auth';
      return { ok: true, redirected: true };
    }
    const err = await res.json().catch(() => ({}));
    return { ok: false, error: err.error || 'checkout_failed' };
  } catch {
    return { ok: false, error: 'network_error' };
  }
}
