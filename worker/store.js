// DealStore — a tiny persistent key/value store backed by a Cloudflare Durable Object.
// It holds the admin-managed config (Discord bot token + category IDs) and manual deals
// so they survive Worker isolate recycling and every isolate sees the same data.
// The Worker routes string reads/writes through this object when the DEAL_STORE binding
// exists, otherwise it falls back to memory (local dev / no binding).
// Also stores user subscriptions for the premium system.

// Durable Object SQL runs through storage.exec(query, ...bindings) (SQLite storage).
const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS subscriptions (
    user_id TEXT PRIMARY KEY,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT UNIQUE,
    status TEXT, -- active, past_due, canceled, trialing, expired
    current_period_end INTEGER, -- unix timestamp in ms
    discord_id TEXT UNIQUE,
    discord_linked_at INTEGER,
    created_at INTEGER,
    updated_at INTEGER
  )`,
  'CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id)',
  'CREATE INDEX IF NOT EXISTS idx_subscriptions_discord ON subscriptions(discord_id)',
  'CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status)',
];

export class DealStore {
  constructor(state, _env) {
    this.state = state;
    this._initialized = false;
  }

  async _ensureSchema() {
    if (this._initialized) return;
    for (const statement of SCHEMA_STATEMENTS) {
      this.state.storage.exec(statement);
    }
    this._initialized = true;
  }

  _rows(query, ...bindings) {
    return this.state.storage.exec(query, ...bindings).toArray();
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/get') {
      const key = url.searchParams.get('key');
      const raw = await this.state.storage.get(key);
      return new Response(JSON.stringify({ value: typeof raw === 'string' ? raw : null }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname === '/put' && request.method === 'POST') {
      const { key, value } = await request.json().catch(() => ({}));
      if (typeof key !== 'string' || key.length === 0) {
        return new Response(JSON.stringify({ error: 'bad_key' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      await this.state.storage.put(key, typeof value === 'string' ? value : String(value ?? ''));
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

  // Internal methods for Worker to call directly (not via fetch)
  async initSubscriptionsTable() {
    await this._ensureSchema();
  }

  async upsertSubscription(sub) {
    await this._ensureSchema();
    const now = Date.now();
    const {
      user_id,
      stripe_customer_id,
      stripe_subscription_id,
      status,
      current_period_end,
      discord_id,
      discord_linked_at
    } = sub;

    this._rows(
      `INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, status, current_period_end, discord_id, discord_linked_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         stripe_customer_id = COALESCE(excluded.stripe_customer_id, subscriptions.stripe_customer_id),
         stripe_subscription_id = COALESCE(excluded.stripe_subscription_id, subscriptions.stripe_subscription_id),
         status = COALESCE(excluded.status, subscriptions.status),
         current_period_end = COALESCE(excluded.current_period_end, subscriptions.current_period_end),
         discord_id = COALESCE(excluded.discord_id, subscriptions.discord_id),
         discord_linked_at = COALESCE(excluded.discord_linked_at, subscriptions.discord_linked_at),
         updated_at = excluded.updated_at`,
      user_id, stripe_customer_id, stripe_subscription_id, status, current_period_end, discord_id, discord_linked_at, now, now
    );
    return this.getSubscription(user_id);
  }

  async getSubscription(user_id) {
    await this._ensureSchema();
    const rows = this._rows(`SELECT * FROM subscriptions WHERE user_id = ?`, user_id);
    return rows[0] ?? null;
  }

  async linkDiscord(user_id, discord_id) {
    await this._ensureSchema();
    const now = Date.now();
    const existing = await this.getSubscription(user_id);
    if (!existing) {
      // Create minimal subscription record for Discord linking
      this._rows(
        `INSERT INTO subscriptions (user_id, status, discord_id, discord_linked_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        user_id, 'pending_discord', discord_id, now, now, now
      );
    } else {
      this._rows(
        `UPDATE subscriptions SET discord_id = ?, discord_linked_at = ?, updated_at = ? WHERE user_id = ?`,
        discord_id, now, now, user_id
      );
    }
    return this.getSubscription(user_id);
  }

  async getUserByDiscordId(discord_id) {
    await this._ensureSchema();
    const rows = this._rows(`SELECT * FROM subscriptions WHERE discord_id = ?`, discord_id);
    return rows[0] ?? null;
  }

  async getSubscriptionByStripeId(stripe_subscription_id) {
    await this._ensureSchema();
    const rows = this._rows(
      `SELECT * FROM subscriptions WHERE stripe_subscription_id = ?`,
      stripe_subscription_id
    );
    return rows[0] ?? null;
  }

  async getExpiredSubscriptions() {
    await this._ensureSchema();
    const now = Date.now();
    return this._rows(
      `SELECT * FROM subscriptions WHERE status = 'active' AND current_period_end < ?`,
      now
    );
  }

  async revokeSubscription(user_id) {
    await this._ensureSchema();
    const now = Date.now();
    this._rows(
      `UPDATE subscriptions SET status = 'expired', updated_at = ? WHERE user_id = ?`,
      now, user_id
    );
    return this.getSubscription(user_id);
  }

  // HTTP handlers for fetch API
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