// DealStore — a tiny persistent store backed by a Cloudflare Durable Object.
// It holds the admin-managed config (Discord bot token + category IDs), manual deals
// so they survive Worker isolate recycling, and user subscriptions for the premium
// system.
//
// NOTE: subscriptions are stored through the Durable Object **KV API**, not SQL.
// The DealStore class was provisioned with the legacy key-value backend (it predates
// SQLite storage, and an existing class cannot switch backends), and the KV API is
// available on both backends — so KV is the only safe choice here.

const SUB_PREFIX = 'sub:';
const SUB_KEY = (userId) => `${SUB_PREFIX}${userId}`;
const STRIPE_INDEX_KEY = (stripeSubscriptionId) => `subx:stripe:${stripeSubscriptionId}`;
const DISCORD_INDEX_KEY = (discordId) => `subx:discord:${discordId}`;

export class DealStore {
  constructor(state, _env) {
    this.state = state;
  }

  async _get(key) {
    const value = await this.state.storage.get(key);
    return typeof value === 'string' ? value : null;
  }

  async _put(key, value) {
    await this.state.storage.put(key, value);
  }

  async _delete(key) {
    await this.state.storage.delete(key);
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/get') {
      const key = url.searchParams.get('key');
      const raw = await this._get(key);
      return new Response(JSON.stringify({ value: raw }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname === '/put' && request.method === 'POST') {
      const { key, value } = await request.json().catch(() => ({}));
      if (typeof key !== 'string' || key.length === 0) {
        return new Response(JSON.stringify({ error: 'bad_key' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      await this._put(key, typeof value === 'string' ? value : String(value ?? ''));
      return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
    }

    // Subscription API endpoints
    if (url.pathname === '/subscriptions/upsert' && request.method === 'POST') {
      return this._handleUpsertSubscription(request);
    }
    if (url.pathname === '/subscriptions/get' && request.method === 'GET') {
      return this._handleGetSubscription(request);
    }
    if (url.pathname === '/subscriptions/link-discord' && request.method === 'POST') {
      return this._handleLinkDiscord(request);
    }
    if (url.pathname === '/subscriptions/by-discord' && request.method === 'GET') {
      return this._handleGetByDiscord(request);
    }
    if (url.pathname === '/subscriptions/by-stripe' && request.method === 'GET') {
      return this._handleGetByStripe(request);
    }
    if (url.pathname === '/subscriptions/expired' && request.method === 'GET') {
      return this._handleGetExpired(request);
    }
    if (url.pathname === '/subscriptions/revoke' && request.method === 'POST') {
      return this._handleRevoke(request);
    }

    return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  // ---- subscription record helpers ------------------------------------------

  async getSubscription(user_id) {
    if (!user_id) return null;
    const raw = await this._get(SUB_KEY(user_id));
    if (!raw) return null;
    try {
      const record = JSON.parse(raw);
      return record?.user_id ? record : null;
    } catch {
      return null;
    }
  }

  async _saveSubscription(record) {
    await this._put(SUB_KEY(record.user_id), JSON.stringify(record));
    if (record.stripe_subscription_id) {
      await this._put(STRIPE_INDEX_KEY(record.stripe_subscription_id), record.user_id);
    }
    if (record.discord_id) {
      await this._put(DISCORD_INDEX_KEY(record.discord_id), record.user_id);
    }
  }

  // Merge semantics mirror the old SQL upsert: only fields present in `sub`
  // overwrite existing values (COALESCE behaviour).
  async upsertSubscription(sub) {
    const now = Date.now();
    const userId = sub.user_id ?? null;
    if (!userId) throw new Error('user_id required');

    const existing = (await this.getSubscription(userId)) ?? {
      user_id: userId,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      status: null,
      current_period_end: null,
      discord_id: null,
      discord_linked_at: null,
      created_at: now,
    };

    const pick = (value, fallback) => (value === undefined ? fallback : value);
    const merged = {
      ...existing,
      stripe_customer_id: pick(sub.stripe_customer_id, existing.stripe_customer_id),
      stripe_subscription_id: pick(sub.stripe_subscription_id, existing.stripe_subscription_id),
      status: pick(sub.status, existing.status),
      current_period_end: pick(sub.current_period_end, existing.current_period_end),
      discord_id: pick(sub.discord_id, existing.discord_id),
      discord_linked_at: pick(sub.discord_linked_at, existing.discord_linked_at),
      updated_at: now,
    };

    await this._saveSubscription(merged);
    return merged;
  }

  async linkDiscord(user_id, discord_id) {
    const now = Date.now();
    const existing = await this.getSubscription(user_id);

    if (!existing) {
      const record = {
        user_id,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        status: 'pending_discord',
        current_period_end: null,
        discord_id,
        discord_linked_at: now,
        created_at: now,
        updated_at: now,
      };
      await this._saveSubscription(record);
      return record;
    }

    const updated = { ...existing, discord_id, discord_linked_at: now, updated_at: now };
    await this._saveSubscription(updated);
    return updated;
  }

  async getUserByDiscordId(discord_id) {
    if (!discord_id) return null;
    const userId = await this._get(DISCORD_INDEX_KEY(discord_id));
    if (!userId) return null;
    const sub = await this.getSubscription(userId);
    if (!sub) {
      await this._delete(DISCORD_INDEX_KEY(discord_id)); // heal stale index
      return null;
    }
    return sub;
  }

  async getSubscriptionByStripeId(stripe_subscription_id) {
    if (!stripe_subscription_id) return null;
    const userId = await this._get(STRIPE_INDEX_KEY(stripe_subscription_id));
    if (!userId) return null;
    const sub = await this.getSubscription(userId);
    if (!sub) {
      await this._delete(STRIPE_INDEX_KEY(stripe_subscription_id)); // heal stale index
      return null;
    }
    return sub;
  }

  async getExpiredSubscriptions() {
    const now = Date.now();
    const entries = await this.state.storage.list({ prefix: SUB_PREFIX });
    const expired = [];
    for (const [key, value] of entries) {
      try {
        const record = JSON.parse(String(value));
        if (
          record?.user_id &&
          record.status === 'active' &&
          record.current_period_end &&
          record.current_period_end < now
        ) {
          expired.push(record);
        }
      } catch {
        // skip corrupt record
      }
    }
    return expired;
  }

  async revokeSubscription(user_id) {
    const existing = await this.getSubscription(user_id);
    if (!existing) return null;
    const updated = { ...existing, status: 'expired', updated_at: Date.now() };
    await this._saveSubscription(updated);
    return updated;
  }

  // ---- HTTP handlers ---------------------------------------------------------

  async _handleUpsertSubscription(request) {
    try {
      const sub = await request.json();
      const result = await this.upsertSubscription(sub);
      return new Response(JSON.stringify({ ok: true, subscription: result }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  async _handleGetSubscription(request) {
    const url = new URL(request.url);
    const user_id = url.searchParams.get('user_id');
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const sub = await this.getSubscription(user_id);
    return new Response(JSON.stringify({ ok: true, subscription: sub }), { headers: { 'Content-Type': 'application/json' } });
  }

  async _handleLinkDiscord(request) {
    try {
      const { user_id, discord_id } = await request.json();
      if (!user_id || !discord_id) {
        return new Response(JSON.stringify({ error: 'user_id and discord_id required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      const result = await this.linkDiscord(user_id, discord_id);
      return new Response(JSON.stringify({ ok: true, subscription: result }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  async _handleGetByDiscord(request) {
    const url = new URL(request.url);
    const discord_id = url.searchParams.get('discord_id');
    if (!discord_id) {
      return new Response(JSON.stringify({ error: 'discord_id required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const sub = await this.getUserByDiscordId(discord_id);
    return new Response(JSON.stringify({ ok: true, subscription: sub }), { headers: { 'Content-Type': 'application/json' } });
  }

  async _handleGetByStripe(request) {
    const url = new URL(request.url);
    const stripe_subscription_id = url.searchParams.get('stripe_subscription_id');
    if (!stripe_subscription_id) {
      return new Response(JSON.stringify({ error: 'stripe_subscription_id required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const sub = await this.getSubscriptionByStripeId(stripe_subscription_id);
    return new Response(JSON.stringify({ ok: true, subscription: sub }), { headers: { 'Content-Type': 'application/json' } });
  }

  async _handleGetExpired(request) {
    const subs = await this.getExpiredSubscriptions();
    return new Response(JSON.stringify({ ok: true, subscriptions: subs }), { headers: { 'Content-Type': 'application/json' } });
  }

  async _handleRevoke(request) {
    try {
      const { user_id } = await request.json();
      if (!user_id) {
        return new Response(JSON.stringify({ error: 'user_id required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      const result = await this.revokeSubscription(user_id);
      return new Response(JSON.stringify({ ok: true, subscription: result }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }
}
