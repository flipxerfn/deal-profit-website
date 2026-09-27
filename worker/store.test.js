// DealStore tests for subscription functionality (KV-backed records)
import { describe, it, expect, beforeEach } from 'vitest';

function makeStore() {
  const kv = new Map();
  const mockState = {
    storage: {
      get: async (key) => kv.get(key) ?? null,
      put: async (key, value) => {
        kv.set(key, value);
      },
      delete: async (key) => {
        kv.delete(key);
      },
      list: async ({ prefix } = {}) => {
        const out = new Map();
        for (const [k, v] of kv) {
          if (!prefix || k.startsWith(prefix)) out.set(k, v);
        }
        return out;
      },
    },
  };
  return { kv, mockState };
}

describe('DealStore subscriptions', () => {
  let store;
  let kv;

  beforeEach(async () => {
    const mod = await import('./store.js');
    const made = makeStore();
    kv = made.kv;
    store = new mod.DealStore(made.mockState, {});
  });

  it('upserts and gets a subscription', async () => {
    const saved = await store.upsertSubscription({
      user_id: 'u1',
      status: 'active',
      stripe_subscription_id: 'sub_1',
      current_period_end: 1800000000000,
    });
    expect(saved.status).toBe('active');
    expect(saved.created_at).toBeDefined();

    const fetched = await store.getSubscription('u1');
    expect(fetched.stripe_subscription_id).toBe('sub_1');
    expect(fetched.current_period_end).toBe(1800000000000);
  });

  it('upsert merges without clobbering absent fields (COALESCE semantics)', async () => {
    await store.upsertSubscription({
      user_id: 'u1',
      status: 'active',
      stripe_customer_id: 'cus_1',
      stripe_subscription_id: 'sub_1',
      current_period_end: 1800000000000,
      discord_id: '123456789012345678',
    });
    // webhook-style update without customer/discord fields
    await store.upsertSubscription({
      user_id: 'u1',
      status: 'past_due',
      current_period_end: 1800003600000,
    });

    const fetched = await store.getSubscription('u1');
    expect(fetched.status).toBe('past_due');
    expect(fetched.stripe_customer_id).toBe('cus_1');
    expect(fetched.discord_id).toBe('123456789012345678');
    expect(fetched.stripe_subscription_id).toBe('sub_1');
    expect(fetched.current_period_end).toBe(1800003600000);
  });

  it('explicit null overwrites (used by webhook revoke paths)', async () => {
    await store.upsertSubscription({ user_id: 'u1', status: 'active', discord_id: '42' });
    await store.upsertSubscription({ user_id: 'u1', discord_id: null });
    const fetched = await store.getSubscription('u1');
    expect(fetched.discord_id).toBeNull();
    expect(fetched.status).toBe('active');
  });

  it('links discord and finds by discord id', async () => {
    const record = await store.linkDiscord('u1', '999888777666555444');
    expect(record.discord_id).toBe('999888777666555444');
    expect(record.status).toBe('pending_discord');

    const byDiscord = await store.getUserByDiscordId('999888777666555444');
    expect(byDiscord.user_id).toBe('u1');
  });

  it('linkDiscord updates an existing record without losing fields', async () => {
    await store.upsertSubscription({ user_id: 'u1', status: 'active', stripe_subscription_id: 'sub_9' });
    await store.linkDiscord('u1', '555');
    const fetched = await store.getSubscription('u1');
    expect(fetched.discord_id).toBe('555');
    expect(fetched.status).toBe('active');
    expect(fetched.stripe_subscription_id).toBe('sub_9');
  });

  it('finds subscription by stripe subscription id', async () => {
    await store.upsertSubscription({ user_id: 'u1', stripe_subscription_id: 'sub_xyz' });
    const found = await store.getSubscriptionByStripeId('sub_xyz');
    expect(found.user_id).toBe('u1');
    expect(await store.getSubscriptionByStripeId('sub_missing')).toBeNull();
  });

  it('returns only past-period active subscriptions as expired', async () => {
    const now = Date.now();
    await store.upsertSubscription({
      user_id: 'u1',
      status: 'active',
      current_period_end: now - 1000, // past
      discord_id: 'a',
    });
    await store.upsertSubscription({
      user_id: 'u2',
      status: 'active',
      current_period_end: now + 86400000, // future
      discord_id: 'b',
    });
    await store.upsertSubscription({
      user_id: 'u3',
      status: 'canceled',
      current_period_end: now - 1000,
      discord_id: 'c',
    });
    // Trials past their end date must auto-expire too (Stripe trials that
    // never converted / manual grants whose card failed)
    await store.upsertSubscription({
      user_id: 'u4',
      status: 'trialing',
      current_period_end: now - 1000,
      discord_id: 'd',
    });
    await store.upsertSubscription({
      user_id: 'u5',
      status: 'trialing',
      current_period_end: now + 86400000, // future trial — keep it
      discord_id: 'e',
    });

    const expired = await store.getExpiredSubscriptions();
    expect(expired.map((s) => s.user_id)).toEqual(['u1', 'u4']);
  });

  it('revokes a subscription to expired', async () => {
    await store.upsertSubscription({ user_id: 'u1', status: 'active', current_period_end: 123 });
    const revoked = await store.revokeSubscription('u1');
    expect(revoked.status).toBe('expired');
    expect((await store.getSubscription('u1')).status).toBe('expired');
  });

  it('HTTP routes: get/upsert/link-discord/by-stripe/expired/revoke', async () => {
    const base = 'https://store.internal';
    const json = (res) => res.json();

    let res = await store.fetch(
      new Request(`${base}/subscriptions/upsert`, {
        method: 'POST',
        body: JSON.stringify({ user_id: 'u1', status: 'active', stripe_subscription_id: 'sub_1', current_period_end: 1 }),
      })
    );
    expect(res.status).toBe(200);
    expect((await json(res)).subscription.status).toBe('active');

    res = await store.fetch(new Request(`${base}/subscriptions/get?user_id=u1`));
    expect((await json(res)).subscription.user_id).toBe('u1');

    res = await store.fetch(
      new Request(`${base}/subscriptions/link-discord`, {
        method: 'POST',
        body: JSON.stringify({ user_id: 'u1', discord_id: '777' }),
      })
    );
    expect((await json(res)).subscription.discord_id).toBe('777');

    res = await store.fetch(new Request(`${base}/subscriptions/by-discord?discord_id=777`));
    expect((await json(res)).subscription.user_id).toBe('u1');

    res = await store.fetch(new Request(`${base}/subscriptions/by-stripe?stripe_subscription_id=sub_1`));
    expect((await json(res)).subscription.user_id).toBe('u1');

    res = await store.fetch(new Request(`${base}/subscriptions/expired`));
    // u1 is 'active' with period_end=1 (in the past) -> expired list
    expect((await json(res)).subscriptions.map((s) => s.user_id)).toEqual(['u1']);
  });
});
