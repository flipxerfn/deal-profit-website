// Shared Stripe checkout launcher used by the /upgrade page (which absorbed
// the old /payment and /trial pages).
//
// Flow:
//   1. If the visitor has no Discord identity yet (401), send them to Discord
//      OAuth first — Discord is the account for this site.
//   2. Otherwise ALWAYS create a Stripe Checkout Session and redirect to it —
//      even for existing members (e.g. monthly -> yearly switch). Stripe
//      handles proration; the webhook upserts the record to the new sub.

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

// ─── TOGGLE THIS TO GO LIVE WITH STRIPE ───
// The Stripe account isn't verified yet (no SSN / no live bank account), so
// buy buttons send people to Discord instead of a checkout that can't take
// money. When you've done the Stripe verification, change false → true and
// push. Everything below is the original Stripe flow, untouched.
const USE_STRIPE_CHECKOUT = false;

export const DISCORD_INVITE = 'https://discord.gg/dealprofit';

export async function startCheckout({ trial = false, interval = 'month' } = {}) {
  // Discord mode: straight to the invite. The { trial, interval } args are
  // still passed in and simply unused until USE_STRIPE_CHECKOUT is flipped.
  if (!USE_STRIPE_CHECKOUT) {
    window.location.href = DISCORD_INVITE;
    return { ok: true, redirected: true };
  }

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
