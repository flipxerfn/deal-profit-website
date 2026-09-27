// Role-aware status: GET /api/user/subscription reports `premiumRole` from the
// LIVE Discord member record (matched against the exact premium role ID), so
// the UI can never tell someone "not subscribed" while they hold the role.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const DISCORD_ID = '123456789012345678';
const GUILD_ID = 'guild_1';
const PREMIUM_ROLE_ID = '1513212681438498857';
const SESSION_TOKEN = 'role-test-session';

const jsonResponse = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function makeEnv({ withConfig = true } = {}) {
  const kv = new Map([
    [
      `discord_session:${SESSION_TOKEN}`,
      JSON.stringify({ id: DISCORD_ID, username: 'tester', at: Date.now() }),
    ],
  ]);
  if (withConfig) {
    kv.set(
      'admin:config',
      JSON.stringify({ token: 'bot_test_token', guildId: GUILD_ID, categories: [] })
    );
  }
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

const realFetch = global.fetch;
let memberMode; // 'with-role' | 'without-role' | 'not-found' | 'rate-limited' | 'error'

function stubDiscordFetch() {
  global.fetch = vi.fn(async (url) => {
    const u = String(url);
    if (u.includes(`/guilds/${GUILD_ID}/members/${DISCORD_ID}`)) {
      switch (memberMode) {
        case 'with-role':
          return jsonResponse({ roles: [PREMIUM_ROLE_ID, 'role_other'] });
        case 'without-role':
          return jsonResponse({ roles: [] });
        case 'not-found':
          return jsonResponse({ message: 'Unknown Member' }, 404);
        case 'rate-limited':
          return jsonResponse({ message: 'You are being rate limited.', retry_after: 1 }, 429);
        default:
          throw new Error('network down');
      }
    }
    throw new Error(`unexpected fetch in test: ${u}`);
  });
}

function subscriptionRequest(cookie = true) {
  return new Request('https://goosiev.com/api/user/subscription', {
    headers: cookie ? { Cookie: `dp_session=${SESSION_TOKEN}` } : {},
  });
}

describe('role-aware subscription status', () => {
  let handler;
  let env;

  beforeEach(async () => {
    vi.resetModules(); // fresh module state (config cache) per test
    const mod = await import('./index.js');
    handler = mod.default;
    env = makeEnv();
    memberMode = 'with-role';
    stubDiscordFetch();
  });

  afterEach(() => {
    global.fetch = realFetch;
  });

  it('premiumRole is true when the member holds the premium role', async () => {
    memberMode = 'with-role';
    const res = await handler.fetch(subscriptionRequest(), env);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.premiumRole).toBe(true);
    expect('subscription' in data).toBe(true);
    expect(data.discord.id).toBe(DISCORD_ID);
  });

  it('premiumRole is false when the member has other roles but not the premium one', async () => {
    memberMode = 'without-role';
    const res = await handler.fetch(subscriptionRequest(), env);
    expect(res.status).toBe(200);
    expect((await res.json()).premiumRole).toBe(false);
  });

  it('premiumRole is false when the member left the guild (404)', async () => {
    memberMode = 'not-found';
    const res = await handler.fetch(subscriptionRequest(), env);
    expect(res.status).toBe(200);
    expect((await res.json()).premiumRole).toBe(false);
  });

  it('premiumRole is null (unknown, not a wrong answer) on rate limits', async () => {
    memberMode = 'rate-limited';
    const res = await handler.fetch(subscriptionRequest(), env);
    expect(res.status).toBe(200);
    expect((await res.json()).premiumRole).toBe(null);
  });

  it('premiumRole is null when Discord is unreachable', async () => {
    memberMode = 'error';
    const res = await handler.fetch(subscriptionRequest(), env);
    expect(res.status).toBe(200);
    expect((await res.json()).premiumRole).toBe(null);
  });

  it('premiumRole is null and no lookup happens without a bot token', async () => {
    env = makeEnv({ withConfig: false });
    memberMode = 'with-role';
    const res = await handler.fetch(subscriptionRequest(), env);
    expect(res.status).toBe(200);
    expect((await res.json()).premiumRole).toBe(null);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('caches the role lookup for a minute instead of re-hitting Discord', async () => {
    memberMode = 'with-role';
    const first = await handler.fetch(subscriptionRequest(), env);
    expect((await first.json()).premiumRole).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Role removed in Discord — the cached answer should hold for the TTL
    memberMode = 'without-role';
    const second = await handler.fetch(subscriptionRequest(), env);
    expect((await second.json()).premiumRole).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('still requires a Discord session', async () => {
    const res = await handler.fetch(subscriptionRequest(false), env);
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('discord_required');
  });
});
