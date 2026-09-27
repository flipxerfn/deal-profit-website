// #logs channel notifications: every completed checkout (trial start or paid
// subscription) posts a message to the guild's #logs text channel.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Stripe from 'stripe';

const DISCORD_ID = '123456789012345678';
const GUILD_ID = 'guild_1';
const LOGS_CHANNEL_ID = 'chan_logs';

const jsonResponse = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function makeEnv() {
  const kv = new Map([
    [
      'admin:config',
      JSON.stringify({ token: 'bot_test_token', guildId: GUILD_ID, categories: [] }),
    ],
  ]);
  // Persisted subscription record — the webhook's cancel #logs notice must
  // only fire on the false → true transition, so the flag has to survive
  // between deliveries within a test.
  let record = null;
  const handle = async (url, request) => {
    const u = new URL(url);
    switch (u.pathname) {
      case '/subscriptions/get':
        return jsonResponse({ ok: true, subscription: record });
      case '/subscriptions/upsert': {
        const body = await request.json().catch(() => ({}));
        record = { ...(record ?? {}), ...body };
        return jsonResponse({ ok: true, subscription: record });
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
    STRIPE_WEBHOOK_SECRET: 'whsec_alpha',
    DEAL_STORE: {
      idFromName: () => 'test-id',
      get: () => ({
        fetch: (url, init) => handle(url, new Request(url, init ?? {})),
      }),
    },
  };
}

const realFetch = global.fetch;
let postedMessages;

function stubDiscordFetch() {
  postedMessages = [];
  global.fetch = vi.fn(async (url, init) => {
    const u = String(url);
    if (u === `https://discord.com/api/v10/guilds/${GUILD_ID}/channels`) {
      return jsonResponse([
        { id: 'chan_general', type: 0, name: 'general' },
        { id: LOGS_CHANNEL_ID, type: 0, name: 'logs' },
      ]);
    }
    if (u === `https://discord.com/api/v10/guilds/${GUILD_ID}/roles`) {
      return jsonResponse([{ id: 'role_deal', name: 'deals-profit' }]);
    }
    // Grant/revoke URLs are keyed by the exact premium role ID constant
    if (u.includes(`/guilds/${GUILD_ID}/members/`) && u.includes('/roles/')) {
      return jsonResponse({}); // role grant ack
    }
    if (u === `https://discord.com/api/v10/channels/${LOGS_CHANNEL_ID}/messages`) {
      const body = JSON.parse(String(init?.body ?? '{}'));
      postedMessages.push({ method: init?.method, body });
      return jsonResponse({});
    }
    return realFetch(url, init);
  });
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

function checkoutEvent(status) {
  const periodEnd = Math.floor(Date.now() / 1000) + (status === 'trialing' ? 7 * 86400 : 30 * 86400);
  return {
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_1',
        object: 'checkout.session',
        customer: 'cus_1',
        metadata: { user_id: DISCORD_ID },
        subscription: {
          id: 'sub_1',
          object: 'subscription',
          status,
          metadata: { user_id: DISCORD_ID },
          current_period_end: periodEnd,
          items: { data: [{ current_period_end: periodEnd }] },
        },
      },
    },
  };
}

describe('webhook #logs channel notifications', () => {
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

  async function deliver(payload) {
    const { body, signature } = signEvent(payload, 'whsec_alpha');
    return handler.fetch(
      new Request('https://goosiev.com/api/stripe/webhook', {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/json', 'stripe-signature': signature },
      }),
      env
    );
  }

  it('logs a trial start to #logs', async () => {
    const res = await deliver(checkoutEvent('trialing'));
    expect(res.status).toBe(200);

    expect(postedMessages).toHaveLength(1);
    const { method, body } = postedMessages[0];
    expect(method).toBe('POST');
    expect(body.content).toContain(`<@${DISCORD_ID}>`);
    expect(body.content).toContain('started a **7-day free trial**');
    expect(body.content).toContain('first $25 charge');
  });

  it('logs a paid subscription to #logs', async () => {
    const res = await deliver(checkoutEvent('active'));
    expect(res.status).toBe(200);

    expect(postedMessages).toHaveLength(1);
    const { body } = postedMessages[0];
    expect(body.content).toContain(`<@${DISCORD_ID}>`);
    expect(body.content).toContain('subscribed to **Deal Profit Premium**');
    expect(body.content).toContain('$25/mo');
  });

  it('webhook still succeeds when the #logs channel is missing', async () => {
    // Same env but the guild has no #logs channel
    global.fetch = vi.fn(async (url, init) => {
      const u = String(url);
      if (u === `https://discord.com/api/v10/guilds/${GUILD_ID}/channels`) {
        return jsonResponse([{ id: 'chan_general', type: 0, name: 'general' }]);
      }
      if (u === `https://discord.com/api/v10/guilds/${GUILD_ID}/roles`) {
        return jsonResponse([{ id: 'role_deal', name: 'deals-profit' }]);
      }
      if (u.includes(`/guilds/${GUILD_ID}/members/`)) return jsonResponse({});
      if (u.endsWith('/messages')) {
        throw new Error('should not attempt to post without a #logs channel');
      }
      return realFetch(url, init);
    });

    const res = await deliver(checkoutEvent('trialing'));
    expect(res.status).toBe(200);
  });

  function subscriptionUpdatedEvent({ cancelAtPeriodEnd, status = 'active' }) {
    const periodEnd = Math.floor(Date.now() / 1000) + 2592000;
    return {
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_1',
          object: 'subscription',
          status,
          metadata: { user_id: DISCORD_ID },
          cancel_at_period_end: cancelAtPeriodEnd,
          current_period_end: periodEnd,
          items: { data: [{ current_period_end: periodEnd }] },
        },
      },
    };
  }

  it('logs a cancellation to #logs when the cancel flag flips on', async () => {
    let res = await deliver(subscriptionUpdatedEvent({ cancelAtPeriodEnd: true }));
    expect(res.status).toBe(200);
    expect(postedMessages).toHaveLength(1);
    expect(postedMessages[0].body.content).toContain(`<@${DISCORD_ID}>`);
    expect(postedMessages[0].body.content).toContain('canceled their **subscription**');
    expect(postedMessages[0].body.content).toContain('access until');

    // The flag is already stored — a repeat update must not double-post
    res = await deliver(subscriptionUpdatedEvent({ cancelAtPeriodEnd: true }));
    expect(res.status).toBe(200);
    expect(postedMessages).toHaveLength(1);

    // Flipping the flag back off logs the resume
    res = await deliver(subscriptionUpdatedEvent({ cancelAtPeriodEnd: false }));
    expect(res.status).toBe(200);
    expect(postedMessages).toHaveLength(2);
    expect(postedMessages[1].body.content).toContain('resumed their **subscription**');
  });

  it('calls a canceled trial a trial in the #logs notice', async () => {
    const res = await deliver(
      subscriptionUpdatedEvent({ cancelAtPeriodEnd: true, status: 'trialing' })
    );
    expect(res.status).toBe(200);
    expect(postedMessages).toHaveLength(1);
    expect(postedMessages[0].body.content).toContain('canceled their **trial**');
  });
});
