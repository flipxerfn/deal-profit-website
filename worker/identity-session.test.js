// Discord identity session.
//
// A member signs in with Discord, the Worker issues an HttpOnly session cookie,
// and /api/user/subscription reports their identity plus whether they hold the
// premium role.
//
// This file used to be payment-flow.test.js and also covered a Stripe checkout and
// a signed Stripe webhook. Both are gone with the rest of the payment code: Whop
// takes the payment and its Discord integration grants and removes the role. The
// tests for them were removed rather than left failing, because a test asserting
// a checkout session exists for a provider that no longer does is worse than no
// test at all — it looks like coverage.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Stripe from 'stripe';

const DISCORD_ID = '123456789012345678';

const jsonResponse = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

// Minimal DealStore stand-in (KV + subscription routes, stateful)
function mockDealStore() {
  const kv = new Map();
  const handle = async (url, request) => {
    const u = new URL(url);
    switch (u.pathname) {
      case '/subscriptions/get':
        return jsonResponse({ ok: true, subscription: null });
      case '/subscriptions/upsert':
        return jsonResponse({ ok: true, subscription: { user_id: 'x' } });
      case '/subscriptions/link-discord':
        return jsonResponse({ ok: true, subscription: null });
      case '/subscriptions/revoke':
        return jsonResponse({ ok: true, subscription: null });
      case '/subscriptions/by-stripe':
      case '/subscriptions/by-discord':
        return jsonResponse({ ok: true, subscription: null });
      case '/subscriptions/expired':
        return jsonResponse({ ok: true, subscriptions: [] });
      case '/get':
        return jsonResponse({ value: kv.get(u.searchParams.get('key')) ?? null });
      case '/put': {
        const body = await request.json().catch(() => ({}));
        if (typeof body.key === 'string') kv.set(body.key, String(body.value ?? ''));
        return jsonResponse({ ok: true });
      }
      default:
        return jsonResponse({ error: 'not_found' }, 404);
    }
  };
  return {
    idFromName: () => 'test-id',
    get: () => ({
      fetch: (url, init) => handle(url, new Request(url, init ?? {})),
    }),
  };
}

function makeEnv(overrides = {}) {
  return {
    ADMIN_USERNAME: 'goosievv',
    ADMIN_PASSWORD: 'testpass',
    DISCORD_CLIENT_ID: 'test_client_id',
    DISCORD_CLIENT_SECRET: 'test_client_secret',
    DISCORD_REDIRECT_URI: 'http://localhost:8787/api/discord/callback',
    STRIPE_SECRET_KEY: 'sk_test_fake',
    STRIPE_WEBHOOK_SECRET: 'whsec_alpha,whsec_beta',
    DEAL_STORE: mockDealStore(),
    ...overrides,
  };
}

const realFetch = global.fetch;

function stubDiscordFetch() {
  global.fetch = vi.fn(async (url, init) => {
    const u = String(url);
    if (u === 'https://discord.com/api/oauth2/token') {
      return new Response(JSON.stringify({ access_token: 'fake_token', token_type: 'Bearer' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (u === 'https://discord.com/api/users/@me') {
      return new Response(JSON.stringify({ id: DISCORD_ID, username: 'tester' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return realFetch(url, init);
  });
}

async function runOAuthFlow(handler, env) {
  // 1. /api/discord/auth -> grab state + cookie
  const authRes = await handler.fetch(new Request('https://goosiev.com/api/discord/auth'), env);
  expect(authRes.status).toBe(302);
  const state = new URL(authRes.headers.get('Location')).searchParams.get('state');
  const stateCookie = (authRes.headers.get('Set-Cookie') || '').match(/dp_oauth_state=([^;]+)/)[1];

  // 2. callback with matching state -> session cookie
  const cbRes = await handler.fetch(
    new Request(
      `https://goosiev.com/api/discord/callback?code=abc&state=${state}`,
      { headers: { Cookie: `dp_oauth_state=${stateCookie}` } }
    ),
    env
  );
  expect(cbRes.status).toBe(302);
  expect(cbRes.headers.get('Location')).toContain('/upgrade?linked=true');
  const sessionCookie = (cbRes.headers.get('Set-Cookie') || '').match(/dp_session=([^;]+)/);
  expect(sessionCookie).toBeTruthy();
  return `dp_session=${sessionCookie[1]}`;
}

function signEvent(payload, secret) {
  const stripe = new Stripe('sk_test_fake');
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload: JSON.stringify(payload),
    secret,
    timestamp,
  });
  return { body: JSON.stringify(payload), signature: `${timestamp},${signature}` };
}

describe('Discord identity session', () => {
  let handler;
  let env;

  beforeEach(async () => {
    const mod = await import('./index.js');
    handler = mod.default;
    env = makeEnv();
    stubDiscordFetch();
  });

  afterEach(() => {
    global.fetch = realFetch;
  });

  it('OAuth callback issues session and subscription endpoint honors it', async () => {
    const cookie = await runOAuthFlow(handler, env);

    const res = await handler.fetch(
      new Request('https://goosiev.com/api/user/subscription', { headers: { Cookie: cookie } }),
      env
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.discord.id).toBe(DISCORD_ID);
    expect(data.discord.username).toBe('tester');
    // link-discord ran against the in-memory kv (no DO in this test), so the
    // record may be null here — but the identity must be present.
    expect('subscription' in data).toBe(true);
  });

  it('rejects a bogus session cookie', async () => {
    const res = await handler.fetch(
      new Request('https://goosiev.com/api/user/subscription', {
        headers: { Cookie: 'dp_session=not-a-real-token' },
      }),
      env
    );
    expect(res.status).toBe(401);
  });
});
