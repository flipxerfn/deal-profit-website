// Cancel/resume: POST /api/stripe/cancel flips Stripe's cancel_at_period_end
// for the caller's own subscription (no Stripe dashboard/portal required).
// Stripe is mocked so we can inspect the exact update params.
import { describe, it, expect, beforeEach, vi } from 'vitest';

const DISCORD_ID = '123456789012345678';
const SESSION_TOKEN = 'cancel-test-session';
const PERIOD_END_SEC = Math.floor(Date.now() / 1000) + 2592000;

const stripeCalls = vi.hoisted(() => ({ updates: [], lists: 0 }));

vi.mock('stripe', () => {
  class StripeMock {
    static createFetchHttpClient() {
      return {};
    }
    static createSubtleCryptoProvider() {
      return {};
    }
    constructor() {
      this.subscriptions = {
        update: async (id, params) => {
          stripeCalls.updates.push({ id, params });
          return {
            id,
            object: 'subscription',
            status: 'active',
            cancel_at_period_end: !!params.cancel_at_period_end,
            current_period_end: PERIOD_END_SEC,
            items: { data: [{ current_period_end: PERIOD_END_SEC }] },
            metadata: { user_id: DISCORD_ID },
          };
        },
        list: async () => {
          stripeCalls.lists += 1;
          return {
            data: [
              {
                id: 'sub_listed',
                object: 'subscription',
                status: 'active',
                current_period_end: PERIOD_END_SEC,
                items: { data: [{ current_period_end: PERIOD_END_SEC }] },
                metadata: { user_id: DISCORD_ID },
              },
            ],
          };
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

function makeEnv({ record } = {}) {
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
        return jsonResponse({ ok: true, subscription: record ?? null });
      case '/subscriptions/upsert': {
        const body = await request.json().catch(() => ({}));
        return jsonResponse({ ok: true, subscription: { user_id: DISCORD_ID, ...body } });
      }
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

function cancelRequest(body, cookie = true) {
  return new Request('https://goosiev.com/api/stripe/cancel', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(cookie ? { Cookie: `dp_session=${SESSION_TOKEN}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const FULL_RECORD = {
  user_id: DISCORD_ID,
  stripe_customer_id: 'cus_1',
  stripe_subscription_id: 'sub_1',
  status: 'active',
  current_period_end: PERIOD_END_SEC * 1000,
  discord_id: DISCORD_ID,
};

describe('POST /api/stripe/cancel', () => {
  let handler;
  let env;

  beforeEach(async () => {
    const mod = await import('./index.js');
    handler = mod.default;
    env = makeEnv({ record: FULL_RECORD });
    stripeCalls.updates.length = 0;
    stripeCalls.lists = 0;
  });

  it('requires a Discord session', async () => {
    const res = await handler.fetch(cancelRequest({}, false), env);
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('discord_required');
    expect(stripeCalls.updates).toHaveLength(0);
  });

  it('400s when the user has no subscription to cancel', async () => {
    env = makeEnv({ record: null });
    const res = await handler.fetch(cancelRequest({}), env);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('no_subscription');
    expect(stripeCalls.updates).toHaveLength(0);
  });

  it('cancels at period end by default', async () => {
    const res = await handler.fetch(cancelRequest({}), env);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.cancel_at_period_end).toBe(true);
    expect(data.status).toBe('active');
    expect(data.current_period_end).toBe(PERIOD_END_SEC * 1000);

    expect(stripeCalls.updates).toHaveLength(1);
    expect(stripeCalls.updates[0].id).toBe('sub_1');
    expect(stripeCalls.updates[0].params).toEqual({ cancel_at_period_end: true });
  });

  it('resumes when resume: true', async () => {
    const res = await handler.fetch(cancelRequest({ resume: true }), env);
    expect(res.status).toBe(200);
    expect((await res.json()).cancel_at_period_end).toBe(false);
    expect(stripeCalls.updates).toHaveLength(1);
    expect(stripeCalls.updates[0].params).toEqual({ cancel_at_period_end: false });
  });

  it('finds the subscription through the customer when no sub id is stored', async () => {
    env = makeEnv({ record: { ...FULL_RECORD, stripe_subscription_id: null } });
    const res = await handler.fetch(cancelRequest({}), env);
    expect(res.status).toBe(200);
    expect(stripeCalls.lists).toBe(1);
    expect(stripeCalls.updates).toHaveLength(1);
    expect(stripeCalls.updates[0].id).toBe('sub_listed');
    expect(stripeCalls.updates[0].params).toEqual({ cancel_at_period_end: true });
  });
});
