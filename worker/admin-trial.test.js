// Admin trial grant/revoke endpoints — real DealStore routed through the
// DO stub so grant -> 409 -> revoke -> 404 all run against actual records.
import { describe, it, expect, beforeEach } from 'vitest';
import { DealStore } from './store.js';

const DISCORD_ID = '123456789012345678';

function makeEnv() {
  const kv = new Map();
  const storage = {
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
  };
  const store = new DealStore({ storage }, {});
  return {
    kv,
    ADMIN_USERNAME: 'goosievv',
    ADMIN_PASSWORD: 'testpass',
    DEAL_STORE: {
      idFromName: () => 'main',
      get: () => ({
        fetch: (url, init) => store.fetch(new Request(url, init ?? {})),
      }),
    },
  };
}

async function login(handler, env, { username = 'goosievv', password = 'testpass' } = {}) {
  return handler.fetch(
    new Request('https://goosiev.com/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }),
    env
  );
}

async function sessionCookie(handler, env) {
  const res = await login(handler, env);
  expect(res.status).toBe(200);
  const m = (res.headers.get('Set-Cookie') || '').match(/dp_admin_session=([^;]+)/);
  expect(m).toBeTruthy();
  return `dp_admin_session=${m[1]}`;
}

function trialRequest(path, cookie, discordId) {
  return new Request(`https://goosiev.com/api/admin/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify({ discord_id: discordId }),
  });
}

describe('admin trial endpoints', () => {
  let handler;
  let env;
  let cookie;

  beforeEach(async () => {
    const mod = await import('./index.js');
    handler = mod.default;
    env = makeEnv();
    cookie = await sessionCookie(handler, env);
  });

  it('rejects grant and revoke without an admin session', async () => {
    const grant = await handler.fetch(trialRequest('grant-trial', null, DISCORD_ID), env);
    expect(grant.status).toBe(401);
    const revoke = await handler.fetch(trialRequest('revoke-trial', null, DISCORD_ID), env);
    expect(revoke.status).toBe(401);
  });

  it('rejects a malformed discord id', async () => {
    const res = await handler.fetch(trialRequest('grant-trial', cookie, 'not-a-snowflake'), env);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('invalid_discord_id');
  });

  it('grants a 7-day trialing record with discord_id linked', async () => {
    const before = Date.now();
    const res = await handler.fetch(trialRequest('grant-trial', cookie, DISCORD_ID), env);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.subscription.status).toBe('trialing');
    expect(data.subscription.user_id).toBe(DISCORD_ID);
    expect(data.subscription.discord_id).toBe(DISCORD_ID);
    // ~7 days out (tolerate test execution time)
    expect(data.subscription.current_period_end).toBeGreaterThan(before + 7 * 24 * 60 * 60 * 1000 - 30000);
    expect(data.subscription.current_period_end).toBeLessThanOrEqual(Date.now() + 7 * 24 * 60 * 60 * 1000 + 30000);
    // No bot token in this env — role attempt is reported, not fatal
    expect(data.role).toEqual({ ok: false, error: 'no_bot_token' });
  });

  it('returns 409 already_has_access while a trial is active', async () => {
    const first = await handler.fetch(trialRequest('grant-trial', cookie, DISCORD_ID), env);
    expect(first.status).toBe(200);
    const second = await handler.fetch(trialRequest('grant-trial', cookie, DISCORD_ID), env);
    expect(second.status).toBe(409);
    expect((await second.json()).error).toBe('already_has_access');
  });

  it('revokes to expired, is idempotent, and 404s for unknown ids', async () => {
    await handler.fetch(trialRequest('grant-trial', cookie, DISCORD_ID), env);

    const res = await handler.fetch(trialRequest('revoke-trial', cookie, DISCORD_ID), env);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.subscription.status).toBe('expired');

    // Revoking again keeps the (already expired) record — no error
    const again = await handler.fetch(trialRequest('revoke-trial', cookie, DISCORD_ID), env);
    expect(again.status).toBe(200);
    expect((await again.json()).subscription.status).toBe('expired');

    // A user with no record at all -> 404
    const unknown = await handler.fetch(
      trialRequest('revoke-trial', cookie, '999999999999999999'),
      env
    );
    expect(unknown.status).toBe(404);
    expect((await unknown.json()).error).toBe('not_found');
  });

  it('rejects bad admin credentials', async () => {
    const res = await login(handler, env, { password: 'wrong' });
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('invalid_credentials');
  });
});
