// Shared checkout launcher used by the /upgrade page (which absorbed the old
// /payment and /trial pages).
//
// Current flow:
//   - Free trial  -> Whop, 7 days free with a card on file.
//   - Subscribe   -> Whop, where the plan is chosen and paid for.
//   - Community   -> Discord, which stays free and open.
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

// The one-time setup service. Separate product, separate price, and NOT
// reachable from startCheckout() — a subscription checkout must never be able
// to land a buyer on a one-time purchase by accident. It is only ever linked
// deliberately, from the /upgrade page.
//
// The URL slug still says "mirror" because Whop fixes a product's route at
// creation and it cannot be changed afterwards. That is the address, not the
// name: every title, headline, label and line of copy says "Deal Feed Setup",
// because a buyer who has to ask what a mirror is has already left.
export const WHOP_SETUP_URL = 'https://whop.com/dealprofitco/deal-profit-mirror-setup/';
export const SETUP_PRICE_USD = 55;

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

// The dashboard a member needs in order to cancel a future charge. This is
// distinct from WHOP_SIGN_IN_URL on purpose: that one is the marketing home
// page, and a link labelled "cancel" that lands on a storefront is a dead end
// that reads as a bait-and-switch. Someone on day 5 of a trial who wants to
// stop the charge should reach the screen where they can do it in one click.
export const WHOP_BILLING_URL = 'https://whop.com/?dashboard=home';

// Subscriptions AND the free trial are on Whop.
//
// This used to be split: the trial lived in Discord so no card was ever taken,
// and paid members bought on Whop. That split is gone. Discord was being
// suspended, and a Whop trial turned out to be the steadier place for it.
//
// The cost of the move is the selling point it took with it: every "no card"
// claim on this site was true because no card was taken, and a 7-day Whop trial
// takes one. So the copy across the site, the Terms, the Refunds page and the
// Privacy page now says what actually happens — card on file, charged at the
// end of the trial unless cancelled — instead of what used to be true.
//
// Discord is still the community and support channel. It is just no longer
// where the trial happens, and nothing on this site may imply otherwise.
export async function startCheckout({ trial = false } = {}) {
  // Both paths land on Whop. Whop applies the 7-day trial itself when the
  // buyer starts from the product page, so a separate trial URL is not needed.
  window.location.href = WHOP_CHECKOUT_URL;
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
