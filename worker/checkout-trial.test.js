// Checkout trial flag: POST /api/stripe/create-checkout with { trial: true }
// must create a Stripe subscription session with trial_period_days = 7.
// Stripe is mocked so we can inspect the exact session params.
import { describe, it, expect, beforeEach, vi } from 'vitest';

const DISCORD_ID = '123456789012345678';
const SESSION_TOKEN = 'test-session-token';

const stripeCalls = vi.hoisted(() => ({ sessions: [] }));

vi.mock('stripe', () => {
  class StripeMock {
    static createFetchHttpClient() {
      return {};
    }
    static createSubtleCryptoProvider() {
      return {};
    }
    constructor() {
      this.customers = {
        create: async () => ({ id: 'cus_test_1' }),
      };
      this.checkout = {
        sessions: {
          create: async (params) => {
            stripeCalls.sessions.push(params);
            return { id: 'cs_test_1', url: 'https://checkout.stripe.test/pay/cs_test_1' };
          },
        },
      };
    }
  }
  return { default: StripeMock };
});

const jsonResponse = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function makeEnv() {
  const kv = new Map([
    [
      `discord_session:${SESSION_TOKEN}`,
      JSON.stringify({ id: DISCORD_ID, username: 'tester', at: Date.now() }),
    ],
  ]);
  const handle = async (url, request) => {
    const u = new URL(url);
    switch (u.pathname) {
      case '/subscriptions/get':
        return jsonResponse({ ok: true, subscription: null });
      case '/subscriptions/upsert':
        return jsonResponse({ ok: true, subscription: { user_id: DISCORD_ID } });
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
    ADMIN_USERNAME: 'goosievv',
    ADMIN_PASSWORD: 'testpass',
    STRIPE_SECRET_KEY: 'sk_test_fake',
    DEAL_STORE: {
      idFromName: () => 'test-id',
      get: () => ({
        fetch: (url, init) => handle(url, new Request(url, init ?? {})),
      }),
    },
  };
}

function checkoutRequest(body) {
  return new Request('https://goosiev.com/api/stripe/create-checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `dp_session=${SESSION_TOKEN}`,
      ...(body ? {} : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

describe('create-checkout trial option', () => {
  let handler;
  let env;

  beforeEach(async () => {
    const mod = await import('./index.js');
    handler = mod.default;
    env = makeEnv();
    stripeCalls.sessions.length = 0;
  });

  it('sets trial_period_days=7 when trial: true', async () => {
    const res = await handler.fetch(checkoutRequest({ trial: true }), env);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.url).toContain('cs_test_1');

    expect(stripeCalls.sessions).toHaveLength(1);
    const params = stripeCalls.sessions[0];
    expect(params.mode).toBe('subscription');
    expect(params.metadata.user_id).toBe(DISCORD_ID);
    expect(params.subscription_data.trial_period_days).toBe(7);
    expect(params.subscription_data.metadata.user_id).toBe(DISCORD_ID);
  });

  it('omits the trial when trial is not requested', async () => {
    const res = await handler.fetch(checkoutRequest({ trial: false }), env);
    expect(res.status).toBe(200);
    expect(stripeCalls.sessions).toHaveLength(1);
    expect(stripeCalls.sessions[0].subscription_data.metadata.user_id).toBe(DISCORD_ID);
    expect('trial_period_days' in stripeCalls.sessions[0].subscription_data).toBe(false);
  });

  it('omits the trial when no body is sent', async () => {
    const res = await handler.fetch(checkoutRequest(null), env);
    expect(res.status).toBe(200);
    expect(stripeCalls.sessions).toHaveLength(1);
    expect('trial_period_days' in stripeCalls.sessions[0].subscription_data).toBe(false);
  });

  it('still requires a linked Discord identity', async () => {
    const res = await handler.fetch(
      new Request('https://goosiev.com/api/stripe/create-checkout', {
        method: 'POST',
        body: JSON.stringify({ trial: true }),
        headers: { 'Content-Type': 'application/json' },
      }),
      env
    );
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('discord_required');
    expect(stripeCalls.sessions).toHaveLength(0);
  });
});
