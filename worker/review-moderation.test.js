// Discord #logs review moderation: submitting a review posts a message with
// ✅/❌ instructions; the scheduled worker applies admin reactions as
// approve/reject decisions (non-admin reactions are ignored).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const GUILD_ID = 'guild_1';
const LOGS_CHANNEL_ID = 'chan_logs';
const BOT_ID = 'bot_1';
const ADMIN_ID = 'admin_1';
const REGULAR_ID = 'user_9';

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

const realFetch = global.fetch;
let postedMessages;
let ackReactions;
// userId -> array of emoji names ('check' | 'cross') the user reacted with
let userReactions;

function stubDiscordFetch() {
  postedMessages = [];
  ackReactions = [];
  global.fetch = vi.fn(async (url, init) => {
    const u = String(url);
    const method = init?.method ?? 'GET';
    if (u === `https://discord.com/api/v10/guilds/${GUILD_ID}/channels`) {
      return jsonResponse([
        { id: 'chan_general', type: 0, name: 'general' },
        { id: LOGS_CHANNEL_ID, type: 0, name: 'logs' },
      ]);
    }
    if (u === 'https://discord.com/api/v10/users/@me') {
      return jsonResponse({ id: BOT_ID });
    }
    if (u === `https://discord.com/api/v10/guilds/${GUILD_ID}`) {
      return jsonResponse({ id: GUILD_ID, owner_id: ADMIN_ID });
    }
    if (u === `https://discord.com/api/v10/guilds/${GUILD_ID}/roles`) {
      return jsonResponse([
        { id: 'r_admin', name: 'Admin', permissions: '8' },
        { id: 'r_mem', name: 'Member', permissions: '104324673' },
      ]);
    }
    const memberMatch = u.match(/\/guilds\/[^/]+\/members\/([^/?]+)$/);
    if (memberMatch && method === 'GET') {
      const id = memberMatch[1];
      if (id === ADMIN_ID) return jsonResponse({ user: { id }, roles: ['r_admin'] });
      if (id === REGULAR_ID) return jsonResponse({ user: { id }, roles: ['r_mem'] });
      return jsonResponse({ message: 'Unknown Member' }, 404);
    }
    const reactGet = u.match(/\/channels\/([^/]+)\/messages\/([^/]+)\/reactions\/([^/?]+)/);
    if (reactGet && method === 'GET') {
      const emoji = decodeURIComponent(reactGet[3]);
      const want = emoji === '✅' ? 'check' : emoji === '❌' ? 'cross' : null;
      const users = Object.entries(userReactions ?? {})
        .filter(([, emojis]) => emojis.includes(want))
        .map(([id]) => ({ id, username: id }));
      return jsonResponse(users);
    }
    const reactPut = u.match(/\/channels\/([^/]+)\/messages\/([^/]+)\/reactions\/([^/]+)\/@me/);
    if (reactPut && method === 'PUT') {
      ackReactions.push(decodeURIComponent(reactPut[3]));
      return jsonResponse(null, 204);
    }
    if (u === `https://discord.com/api/v10/channels/${LOGS_CHANNEL_ID}/messages` && method === 'POST') {
      const body = JSON.parse(String(init?.body ?? '{}'));
      postedMessages.push(body);
      return jsonResponse({ id: 'msg_review_1', channel_id: LOGS_CHANNEL_ID });
    }
    return realFetch(url, init);
  });
}

function readReviews(env) {
  const raw = env.__kv.get('admin:reviews');
  return raw ? JSON.parse(raw) : [];
}

describe('review moderation from #logs', () => {
  let handler;
  let env;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('./index.js');
    handler = mod.default;
    env = makeEnv();
    userReactions = {};
    stubDiscordFetch();
  });

  afterEach(() => {
    global.fetch = realFetch;
  });

  async function submitReview() {
    return handler.fetch(
      new Request('https://goosiev.com/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Tester', text: 'Great deals here', rating: 5 }),
      }),
      env
    );
  }

  it('posts the review notice with ✅/❌ instructions and stores the message id', async () => {
    const res = await submitReview();
    expect(res.status).toBe(201);

    expect(postedMessages).toHaveLength(1);
    expect(postedMessages[0].content).toContain('Great deals here');
    expect(postedMessages[0].content).toContain('✅');
    expect(postedMessages[0].content).toContain('❌');

    const reviews = readReviews(env);
    expect(reviews).toHaveLength(1);
    expect(reviews[0].status).toBe('pending');
    expect(reviews[0].discordMessageId).toBe('msg_review_1');
  });

  it('approves a pending review on an admin ✅ reaction', async () => {
    await submitReview();
    userReactions = { [ADMIN_ID]: ['check'] };

    await handler.scheduled({ cron: '*/5 * * * *' }, env);

    const reviews = readReviews(env);
    expect(reviews[0].status).toBe('approved');
    expect(ackReactions).toContain('✅');
    // admin gets a #logs confirmation like the dashboard flow
    expect(postedMessages.some((m) => m.content.includes('approved'))).toBe(true);
  });

  it('ignores ✅ reactions from non-admin members', async () => {
    await submitReview();
    userReactions = { [REGULAR_ID]: ['check'] };

    await handler.scheduled({ cron: '*/5 * * * *' }, env);

    const reviews = readReviews(env);
    expect(reviews[0].status).toBe('pending');
    expect(ackReactions).toHaveLength(0);
  });

  it('rejects a pending review on an admin ❌ reaction', async () => {
    await submitReview();
    userReactions = { [ADMIN_ID]: ['cross'] };

    await handler.scheduled({ cron: '*/5 * * * *' }, env);

    const reviews = readReviews(env);
    expect(reviews[0].status).toBe('rejected');
    expect(ackReactions).toContain('❌');
  });

  it('skips reviews with no stored Discord message id', async () => {
    await submitReview();
    const reviews = readReviews(env);
    delete reviews[0].discordMessageId;
    env.__kv.set('admin:reviews', JSON.stringify(reviews));
    userReactions = { [ADMIN_ID]: ['check'] };

    const fetchCallsBefore = global.fetch.mock.calls.length;
    await handler.scheduled({ cron: '*/5 * * * *' }, env);

    expect(readReviews(env)[0].status).toBe('pending');
    const reactionCalls = global.fetch.mock.calls
      .slice(fetchCallsBefore)
      .filter(([u]) => String(u).includes('/reactions/'));
    expect(reactionCalls).toHaveLength(0);
  });
});
