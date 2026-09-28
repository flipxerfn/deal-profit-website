// Discord interactions endpoint: button clicks (Approve / Reject) on #logs
// review notices. Discord POSTs here the instant a button is clicked — no
// polling — and expects an Interaction Response within 3 seconds.
//
// Request signature is Ed25519 (not HMAC like webhooks): verify the raw body
// against the X-Signature-Ed25519 header using the app's public key, and the
// X-Signature-Timestamp header for replay protection.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Test key pair: throwaway Ed25519 keys generated for the harness only
// (worker/test/ed25519-helper.js). The worker is given the matching
// public key, Discord's real public key is a wrangler secret.
import { TEST_PUBLIC_KEY_B64, sign } from './test/ed25519-helper.js';
import { putReview, readReviews } from './test/review-fixture.js';

// Re-exported for readability inside the tests below.

const jsonResponse = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function makeEnv() {
  const kv = new Map([
    [
      'admin:config',
      JSON.stringify({ token: 'bot_test_token', guildId: 'guild_1', categories: [] }),
    ],
  ]);
  const handle = async (url, request) => {
    const u = new URL(url);
    switch (u.pathname) {
      case '/subscriptions/expired':
        return jsonResponse({ subscriptions: [] });
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
    DEAL_STORE: {
      idFromName: () => 'test-id',
      get: () => ({
        fetch: (url, init) => handle(url, new Request(url, init ?? {})),
      }),
    },
    __kv: kv,
  };
}

function reviewButtonMessage(reviewId) {
  return {
    type: 3, // MESSAGE
    id: '1553951585523077192',
    channel_id: 'chan_logs',
    content: `review notice for ${reviewId}`,
    embeds: [],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 2, // Success
            custom_id: `review:approve:${reviewId}`,
          },
          { type: 2, style: 2, custom_id: `review:reject:${reviewId}` },
        ],
      },
    ],
  };
}

function interaction(customId, userId = 'admin_1', guildId = 'guild_1') {
  return {
    type: 2, // MESSAGE_COMPONENT (button click)
    id: '1',
    application_id: '1553844051449483445',
    token: 'interaction_token',
    version: 1,
    data: { name: 'review_moderation', custom_id: customId, component_type: 2 },
    guild_id: guildId,
    channel_id: 'chan_logs',
    member: { user: { id: userId } },
    message: reviewButtonMessage('rv-test-1'),
  };
}

const realFetch = global.fetch;
let interactionCalls;

function stubDiscordFetch() {
  interactionCalls = [];
  global.fetch = vi.fn(async (url, init) => {
    const u = String(url);
    const method = init?.method ?? 'GET';
    if (u === `https://discord.com/api/v10/guilds/guild_1/channels`) {
      return jsonResponse([
        { id: 'chan_general', type: 0, name: 'general' },
        { id: 'chan_logs', type: 0, name: 'logs' },
      ]);
    }
    if (u === 'https://discord.com/api/v10/users/@me') {
      return jsonResponse({ id: 'bot_1' });
    }
    if (u === 'https://discord.com/api/v10/guilds/guild_1') {
      return jsonResponse({ id: 'guild_1', owner_id: 'admin_1' });
    }
    if (u === 'https://discord.com/api/v10/guilds/guild_1/roles') {
      return jsonResponse([
        { id: 'r_admin', name: 'Admin', permissions: '8' },
        { id: 'r_mem', name: 'Member', permissions: '104324673' },
      ]);
    }
    const memberMatch = u.match(/\/guilds\/[^/]+\/members\/([^/?]+)$/);
    if (memberMatch && method === 'GET') {
      if (memberMatch[1] === 'admin_1') {
        return jsonResponse({ user: { id: 'admin_1' }, roles: ['r_admin'] });
      }
      return jsonResponse({ user: { id: memberMatch[1] }, roles: ['r_mem'] });
    }
    if (u.includes('/interactions/') && u.endsWith('/callback')) {
      interactionCalls.push({ method, url: u, body: init?.body ? JSON.parse(init.body) : null });
      return jsonResponse({});
    }
    if (u === 'https://discord.com/api/v10/channels/chan_logs/messages' && method === 'POST') {
      return jsonResponse({ id: 'msg_1', channel_id: 'chan_logs' });
    }
    return realFetch(url, init);
  });
}

describe('discord review moderation buttons', () => {
  let handler;
  let env;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('./index.js');
    handler = mod.default;
    env = { ...makeEnv(), DISCORD_PUBLIC_KEY: TEST_PUBLIC_KEY_B64 };
    stubDiscordFetch();
  });

  afterEach(() => {
    global.fetch = realFetch;
  });

  it('exposes the endpoint at the configured path', async () => {
    const res = await handler.fetch(
      new Request('https://goosiev.com/api/discord/interactions', { method: 'POST', body: '{}' }),
      env
    );
    // Missing signature -> 401, but the route must exist (not 404/not_found)
    expect(res.status).toBe(401);
    expect(['invalid_signature', 'missing_signature']).toContain(
      (await res.json()).error
    );
  });

  it('rejects unsigned requests', async () => {
    const res = await handler.fetch(
      new Request('https://goosiev.com/api/discord/interactions', {
        method: 'POST',
        body: JSON.stringify(interaction('review:approve:rv-test-1')),
      }),
      env
    );
    expect(res.status).toBe(401);
  });

  it('rejects a malformed interaction payload', async () => {
    const body = JSON.stringify({ type: 99 });
    const { signature, timestamp } = await sign(body);
    const res = await handler.fetch(
      new Request('https://goosiev.com/api/discord/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature-Ed25519': signature,
          'X-Signature-Timestamp': timestamp,
        },
        body,
      }),
      env
    );
    expect(res.status).toBe(400);
  });

  it('answers PING with PONG when correctly signed', async () => {
    const body = JSON.stringify({ type: 1, application_id: '1553844051449483445' });
    const { signature, timestamp } = await sign(body);
    const res = await handler.fetch(
      new Request('https://goosiev.com/api/discord/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature-Ed25519': signature,
          'X-Signature-Timestamp': timestamp,
        },
        body,
      }),
      env
    );
    expect(res.status).toBe(200);
    expect((await res.json()).type).toBe(1);
  });

  it('shows the pending review when a review button is clicked', async () => {
    putReview(env, { id: 'rv-test-1', status: 'pending', name: 'Tester', rating: 5, text: 'hi' });

    const body = JSON.stringify(interaction('review:approve:rv-test-1'));
    const { signature, timestamp } = await sign(body);
    const res = await handler.fetch(
      new Request('https://goosiev.com/api/discord/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature-Ed25519': signature,
          'X-Signature-Timestamp': timestamp,
        },
        body,
      }),
      env
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.type).toBe(5); // DEFERRED_CHANNEL_UPDATE_WITH_SOURCE
    expect(JSON.stringify(data.data)).toContain('Approved');
    // The status write is applied after the ack (Discord only allows one
    // callback), so it lands once the deferred work settles.
    await vi.waitFor(() => expect(readReviews(env)[0].status).toBe('approved'));
    expect(interactionCalls.some((c) => c.method === 'PATCH')).toBe(true);
  });

  it('ignores clicks from non-admins (ephemeral denial)', async () => {
    putReview(env, { id: 'rv-test-1', status: 'pending', name: 'Tester', rating: 5, text: 'hi' });

    const body = JSON.stringify(interaction('review:approve:rv-test-1', 'user_9'));
    const { signature, timestamp } = await sign(body);
    const res = await handler.fetch(
      new Request('https://goosiev.com/api/discord/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature-Ed25519': signature,
          'X-Signature-Timestamp': timestamp,
        },
        body,
      }),
      env
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.flags).toBe(64); // EPHEMERAL
    expect(JSON.stringify(data.data)).toContain('admin');
    expect(readReviews(env)[0].status).toBe('pending');
  });

  it('ephemeral-errors on an unknown review id', async () => {
    const body = JSON.stringify(interaction('review:approve:rv-missing'));
    const { signature, timestamp } = await sign(body);
    const res = await handler.fetch(
      new Request('https://goosiev.com/api/discord/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature-Ed25519': signature,
          'X-Signature-Timestamp': timestamp,
        },
        body,
      }),
      env
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.flags).toBe(64);
    expect(JSON.stringify(data.data)).toContain('not found');
  });
});
