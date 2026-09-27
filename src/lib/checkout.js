// Shared Stripe checkout launcher used by /upgrade and /payment.
//
// Flow:
//   1. If the visitor has no Discord identity yet (401), send them to Discord
//      OAuth first — Discord is the account for this site.
//   2. If they already have an active/trialing subscription, show the status
//      page instead of creating another checkout.
//   3. Otherwise create a Stripe Checkout Session and redirect to it.

export async function fetchSubscription() {
  const res = await fetch('/api/user/subscription', {
    headers: { Accept: 'application/json' },
  });
  if (res.status === 401) return { unauthorized: true, subscription: null };
  if (!res.ok) return { unauthorized: false, subscription: null };
  const data = await res.json().catch(() => ({}));
  return { unauthorized: false, subscription: data.subscription ?? null, discord: data.discord ?? null };
}

export async function startCheckout() {
  // Already subscribed? Let the payment page show status instead.
  try {
    const sub = await fetchSubscription();
    if (sub.unauthorized) {
      window.location.href = '/api/discord/auth';
      return { ok: true, redirected: true };
    }
    const status = sub.subscription?.status;
    if (status === 'active' || status === 'trialing') {
      window.location.href = '/payment';
      return { ok: true, redirected: true };
    }
  } catch {
    // fall through to checkout attempt
  }

  try {
    const res = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({}),
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
