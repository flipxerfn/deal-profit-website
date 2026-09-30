// Deal Profit — Cloudflare Worker.
//  - GET  /api/deals         public: live Discord deal feed (manual + category-based)
//  - POST /api/admin/login   public: authenticates an admin, sets an HttpOnly session cookie
//  - POST /api/admin/logout  admin: clears the session
//  - GET  /api/admin/status  admin: dashboard diagnostics (no secrets)
//  - POST /api/admin/sync    admin: force a feed refresh
//  - GET/POST /api/admin/config admin: read/write Discord config (bot token + category IDs)
//  - GET/POST /api/admin/deals and PUT/DELETE /api/admin/deals/:id admin: manual deal CRUD
// Everything else delegates to the static assets (SPA).
// Secrets (DISCORD_BOT_TOKEN, ADMIN_PASSWORD) are write-only: they are stored server-side
// (Worker env or the DEAL_STORE Durable Object) and never returned to the browser.

import { parseDealMessage } from './parseDeals.js';
import { toSuccessPosts, fetchSuccessPosts, CAVEAT } from './successPosts.js';
import { dedupeDeals } from './dedupe.js';
import {
  makeReview,
  reviewSummary,
  REVIEW_CATEGORIES,
  REVIEW_MAX_STORED,
  toPublicReview,
  validateReview,
} from './reviews.js';
import {
  SESSION_AGE_MS,
  SESSION_COOKIE,
  clearSessionCookie,
  issueSession,
  newSessionId,
  readCookie,
  safeEqual,
  sessionCookie,
  verifySession,
} from './auth.js';

const DISCORD_API = 'https://discord.com/api/v10';
// The premium role — keyed by exact ID (name lookups can't be trusted to
// match: the role is spelled "deals-profit"). ID is authoritative.
const PREMIUM_ROLE_ID = '1513212681438498857';
const PREMIUM_ROLE_NAME = 'deals-profit';
const DISCORD_FETCH_TIMEOUT_MS = 10_000;
const CACHE_TTL_MS = 60_000;
const EDGE_CACHE = 'public, max-age=60, s-maxage=60, stale-while-revalidate=120';
const MAX_CHANNELS_PER_SYNC = 60;
const MAX_DEALS = 200;
const DEFAULT_ADMIN_USERNAME = 'goosievv';
const LOGIN_RATE_LIMIT = { windowMs: 15 * 60 * 1000, max: 20 };

const CONFIG_KEY = 'admin:config';
const MANUAL_KEY = 'admin:manual-deals';
const REVIEWS_KEY = 'admin:reviews';
const REVIEW_RATE = { windowMs: 10 * 60 * 1000, max: 3 };

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });

// ---- feed state (module-scoped, per isolate) ---------------------------------

const feedState = {
  data: null, // last successful sync payload
  syncedAt: 0, // epoch ms of last successful sync
  error: null, // sanitized message
  errorsAt: null,
  inflight: null,
};

// ---- admin-managed storage ---------------------------------------------------
// Uses the DEAL_STORE Durable Object when bound (defined in wrangler.toml, deploys
// automatically with the Worker), so admin settings + manual deals persist across
// isolates/restarts. Falls back to an in-memory Map when unbound (local dev/tests).
// Values are strings. For KV-style bindings (mock KV in tests) the object's get/put
// methods are used directly.

const memStore = (() => {
  const m = new Map();
  return {
    get: async (key) => (m.has(key) ? String(m.get(key)) : null),
    put: async (key, value) => {
      m.set(key, String(value));
    },
    delete: async (key) => {
      m.delete(key);
    },
  };
})();

const getStore = (env) =>
  env.DEAL_STORE && typeof env.DEAL_STORE.get === 'function' && typeof env.DEAL_STORE.put === 'function'
    ? env.DEAL_STORE
    : memStore;

const isDurableObject = (binding) =>
  binding && typeof binding.idFromName === 'function' && typeof binding.get === 'function';

const doGetValue = async (binding, key) => {
  const id = binding.idFromName('main');
  const stub = binding.get(id);
  const res = await stub.fetch(`https://store.internal/get?key=${encodeURIComponent(key)}`);
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return data && typeof data.value === 'string' ? data.value : null;
};

const doPutValue = async (binding, key, value) => {
  const id = binding.idFromName('main');
  const stub = binding.get(id);
  const res = await stub.fetch('https://store.internal/put', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value: String(value) }),
  });
  return res.ok;
};

const kvGet = async (env, key) => {
  if (isDurableObject(env.DEAL_STORE)) {
    try {
      return await doGetValue(env.DEAL_STORE, key);
    } catch {
      return null;
    }
  }
  try {
    const value = await getStore(env).get(key);
    return typeof value === 'string' ? value : null;
  } catch {
    return null;
  }
};

const kvPut = async (env, key, value) => {
  if (isDurableObject(env.DEAL_STORE)) {
    try {
      return await doPutValue(env.DEAL_STORE, key, value);
    } catch {
      return false;
    }
  }
  try {
    await getStore(env).put(key, String(value));
    return true;
  } catch {
    return false;
  }
};

const configCache = { value: null, at: 0 };
const CONFIG_CACHE_TTL_MS = 10_000;

async function loadConfig(env) {
  const now = Date.now();
  if (configCache.value && now - configCache.at < CONFIG_CACHE_TTL_MS) return configCache.value;
  let cfg = null;
  const raw = await kvGet(env, CONFIG_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && typeof parsed.token === 'string') cfg = parsed;
    } catch {
      // treat corrupt config as absent
    }
  }
  if (!cfg) cfg = { token: '', categories: [], updatedAt: null };
  configCache.value = cfg;
  configCache.at = now;
  return cfg;
}

async function saveConfig(env, { token, categories, successChannelId }) {
  const prev = await loadConfig(env);
  const cfg = {
    token: typeof token === 'string' && token.trim() ? token.trim() : prev.token,
    categories: Array.isArray(categories) ? categories : prev.categories,
    // Kept across writes when omitted, so saving a token from the admin panel
    // cannot silently unconfigure the success feed.
    successChannelId:
      typeof successChannelId === 'string' && successChannelId.trim()
        ? successChannelId.trim()
        : prev.successChannelId ?? '',
    updatedAt: new Date().toISOString(),
  };
  const ok = await kvPut(env, CONFIG_KEY, JSON.stringify(cfg));
  if (!ok) throw new Error('Failed to persist configuration');
  configCache.value = cfg;
  configCache.at = Date.now();
  return cfg;
}

async function resolveDiscord(env) {
  const cfg = await loadConfig(env);
  const token = cfg.token || env.DISCORD_BOT_TOKEN || '';
  const categories = cfg.categories.length ? cfg.categories : listIds(env.DISCORD_CATEGORY_IDS);
  return {
    token,
    categories,
    tokenSource: cfg.token ? 'panel' : env.DISCORD_BOT_TOKEN ? 'env' : 'none',
    categoriesSource: cfg.categories.length ? 'panel' : 'env',
  };
}

async function listManualDeals(env) {
  const raw = await kvGet(env, MANUAL_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function saveManualDeals(env, deals) {
  await kvPut(env, MANUAL_KEY, JSON.stringify(deals));
}

async function listReviews(env) {
  const raw = await kvGet(env, REVIEWS_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function saveReviews(env, reviews) {
  await kvPut(env, REVIEWS_KEY, JSON.stringify(reviews.slice(0, REVIEW_MAX_STORED)));
}

const cleanStr = (value, max) => String(value ?? '').trim().slice(0, max);
const toNum = (value) => {
  const n = parseFloat(String(value ?? '').replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n : null;
};

function buildManualDeal(raw, id, existing) {
  const title = cleanStr(raw.title, 160);
  const price = toNum(raw.price);
  const referencePrice = toNum(raw.originalPrice);
  if (!title) return { error: 'title_required' };
  if (price == null || price <= 0) return { error: 'price_required' };

  const url = cleanStr(raw.url, 1000);
  const image = cleanStr(raw.image, 1000);
  const category = ['tech', 'penny', 'other'].includes(raw.category) ? raw.category : 'other';
  const shop = cleanStr(raw.shop, 40);
  const categoryLabel = category === 'penny' ? 'Penny Deals' : category === 'tech' ? 'Tech' : 'Manual';

  return {
    id,
    title,
    url,
    image,
    price,
    referencePrice: referencePrice > 0 ? referencePrice : null,
    category,
    categoryLabel,
    description: cleanStr(raw.description, 240),
    badge: category === 'penny' ? 'Penny find' : null,
    displayPrice: price < 1 ? 'As low as $0.01' : null,
    meta: [shop || 'Manual'],
    imageAlt: title,
    imagePosition: 'center',
    cta: { label: url ? 'View Deal' : 'No link', href: url || '' },
    source: 'manual',
    postedAt: existing?.postedAt ?? new Date().toISOString(),
    shop,
    note: cleanStr(raw.note, 200),
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

const toPublicDeal = (deal) => {
  const { title, url, image, price, referencePrice, category, categoryLabel, description, badge, displayPrice, meta, imageAlt, imagePosition, cta, source, postedAt, retailer } = deal;
  return { id: deal.id, title, url, retailer: retailer ?? null, image, price, referencePrice, category, categoryLabel, description, badge, displayPrice, meta, imageAlt, imagePosition, cta, source, postedAt };
};

// ---- helpers ----------------------------------------------------------------

const listIds = (raw) =>
  String(raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^\d{10,25}$/.test(s));

const parseCategories = (raw) =>
  String(raw ?? '')
    .split(/[,;\n\r\s]+/)
    .map((s) => s.trim())
    .filter((s) => /^\d{10,25}$/.test(s));

const maskId = (id) => (id.length > 9 ? `${id.slice(0, 4)}…${id.slice(-4)}` : id);

const sanitizeError = (err) => {
  const msg = String(err?.message ?? err ?? 'Unknown error');
  // Never surface tokens/headers/query strings in admin error messages.
  return msg.replace(/https?:\/\/\S+/g, 'Discord API').slice(0, 160);
};

const clientIp = (request) =>
  request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || 'unknown';

async function discordGet(urlPath, token) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DISCORD_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${DISCORD_API}${urlPath}`, {
      headers: {
        Authorization: `Bot ${token}`,
        'User-Agent': 'DealProfit-Website/1.0 (https://goosiev.com)',
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = res.status === 429 ? await res.json().catch(() => ({})) : {};
      const err = new Error(`Discord API responded with status ${res.status}`);
      err.code = res.status === 429 ? 'rate_limited' : 'discord_http';
      err.status = res.status;
      err.retryAfter = detail.retry_after ?? null;
      throw err;
    }
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

// ---- Discord feed (category-based discovery) --------------------------------

async function doSync(env) {
  const { token, categories } = await resolveDiscord(env);
  if (!token) {
    return {
      ok: true,
      configured: false,
      deals: [],
      categoriesConfigured: 0,
      categoriesMasked: [],
      channelsDiscovered: 0,
      lastSync: null,
      note: 'not_configured',
    };
  }

  if (categories.length === 0) {
    return {
      ok: true,
      configured: true,
      deals: [],
      categoriesConfigured: 0,
      categoriesMasked: [],
      channelsDiscovered: 0,
      lastSync: new Date().toISOString(),
      note: 'no_categories',
    };
  }

  // Discover guilds the bot is in, then text channels inside configured categories.
  const guilds = await discordGet('/users/@me/guilds', token);
  if (!Array.isArray(guilds) || guilds.length === 0) {
    throw new Error('Bot is not in any guilds');
  }

  const categorySet = new Set(categories.map(String));
  const channels = [];
  for (const guild of guilds) {
    const guildChannels = await discordGet(`/guilds/${guild.id}/channels`, token);
    if (Array.isArray(guildChannels)) {
      for (const channel of guildChannels) {
        if (categorySet.has(String(channel.parent_id)) && (channel.type === 0 || channel.type === 5)) {
          channels.push(channel);
        }
      }
    }
  }

  const channelIds = [...new Set(channels.map((c) => String(c.id)))].slice(0, MAX_CHANNELS_PER_SYNC);
  const syncedAt = new Date().toISOString();

  if (channelIds.length === 0) {
    return {
      ok: true,
      configured: true,
      deals: [],
      categoriesConfigured: categories.length,
      categoriesMasked: categories.map(maskId),
      channelsDiscovered: 0,
      lastSync: syncedAt,
      note: 'no_text_channels_in_categories',
    };
  }

  const messageLists = await Promise.all(
    channelIds.map((id) => discordGet(`/channels/${encodeURIComponent(id)}/messages?limit=50`, token).catch(() => []))
  );

  const deals = [];
  const seen = new Set();
  for (const messages of messageLists) {
    if (!Array.isArray(messages)) continue;
    for (const message of messages) {
      const deal = parseDealMessage(message, message.channel_id);
      if (deal && !seen.has(deal.id)) {
        seen.add(deal.id);
        deals.push(deal);
      }
    }
  }

  const deduped = dedupeDeals(deals);
  const duplicatesDropped = deals.length - deduped.length;

  deduped.sort((a, b) => new Date(b.postedAt ?? 0) - new Date(a.postedAt ?? 0));
  const trimmed = deduped.slice(0, MAX_DEALS);

  return {
    ok: true,
    configured: true,
    deals: trimmed,
    duplicatesDropped,
    categoriesConfigured: categories.length,
    categoriesMasked: categories.map(maskId),
    channelsDiscovered: channelIds.length,
    lastSync: syncedAt,
    note: trimmed.length === 0 ? 'no_deals_posted' : null,
  };
}

async function syncFeed(env) {
  if (!feedState.inflight) {
    feedState.inflight = (async () => {
      try {
        const result = await doSync(env);
        feedState.data = result;
        feedState.syncedAt = Date.now();
        feedState.error = null;
        feedState.errorsAt = null;
        return result;
      } catch (err) {
        feedState.error = sanitizeError(err);
        feedState.errorsAt = Date.now();
        throw err;
      } finally {
        feedState.inflight = null;
      }
    })();
  }
  return feedState.inflight;
}

async function dashboard(env) {
  const { token, categories, tokenSource } = await resolveDiscord(env);
  const tokenConfigured = Boolean(token);
  const data = feedState.data;
  return {
    tokenConfigured,
    tokenSource,
    connected: tokenConfigured && Boolean(data) && !feedState.error,
    categoriesConfigured: categories.length,
    categoriesMasked: categories.map(maskId),
    channelsDiscovered: data?.channelsDiscovered ?? 0,
    deals: data?.deals?.length ?? 0,
    lastSync: data?.lastSync ?? null,
    note: tokenConfigured
      ? categories.length === 0
        ? data?.note ?? 'no_categories'
        : (data?.note ?? null)
      : 'not_configured',
    lastError: feedState.error,
    lastErrorAt: feedState.errorsAt ?? null,
  };
}

async function handleDeals(env) {
  const now = Date.now();
  const manual = await listManualDeals(env);
  const manualDeals = manual.map(toPublicDeal);
  // The deal feed is public and read-only, and the Whop-hosted storefront
  // (*.whop.site) fetches it from the browser — a different origin. Allow
  // that read specifically. This endpoint never sees a session or a card, and
  // is already world-readable, so there is nothing to protect here; the header
  // is only so the browser will let the storefront read it.
  const CORS = { 'Access-Control-Allow-Origin': '*', Vary: 'Origin' };
  const serve = (payload, extra = {}) =>
    json({ ...payload }, 200, { 'Cache-Control': EDGE_CACHE, ...CORS, ...extra });

  const merged = (result) => {
    const raw = [...manualDeals, ...(result?.deals ?? [])];
    const deduped = dedupeDeals(raw);
    return {
      ok: true,
      configured: Boolean(result?.configured) || manual.length > 0,
      deals: deduped,
      manual: manual.length,
      discord: Boolean(result?.configured),
      duplicatesDropped: raw.length - deduped.length,
      feed: result?.configured ? 'live' : 'manual_only',
    };
  };

  const failOver = async () => {
    const { token } = await resolveDiscord(env);
    if (manual.length > 0) {
      return json(
        { ...merged(null), feed: 'unavailable' },
        200,
        { 'Cache-Control': 'no-store' }
      );
    }
    return json(
      { ok: false, configured: Boolean(token), deals: [], error: 'unavailable' },
      502,
      { 'Cache-Control': 'no-store' }
    );
  };

  if (feedState.data && now - feedState.syncedAt < CACHE_TTL_MS) {
    return serve(merged(feedState.data));
  }

  const errorRecent = feedState.error && feedState.errorsAt && now - feedState.errorsAt < 15_000;
  if (errorRecent) {
    if (feedState.data) {
      return serve({ ...merged({ ...feedState.data, stale: true }) });
    }
    return failOver();
  }

  try {
    const result = await syncFeed(env);
    return serve(merged(result));
  } catch {
    if (feedState.data) {
      return serve({ ...merged({ ...feedState.data, stale: true }) });
    }
    return failOver();
  }
}

/**
 * List the text channels the bot can see, so the admin panel can offer a picker
 * for the success channel.
 *
 * The owner has no way to discover a snowflake by eye, and the previous UI
 * asked for a raw ID. That is a support problem waiting to happen: a mistyped
 * ID silently produces an empty feed, which looks identical to "the channel is
 * quiet this week".
 *
 * Names only, and only for channels the bot is already a member of. Thread
 * channels (type 11) are included deliberately — a success channel is often a
 * thread. The bot token is never returned.
 */
async function listBotChannels(env) {
  const { token } = await resolveDiscord(env);
  if (!token) return { ok: false, error: 'no_bot_token', channels: [] };
  try {
    const guilds = await discordGet('/users/@me/guilds', token);
    if (!Array.isArray(guilds) || guilds.length === 0) {
      return { ok: false, error: 'not_in_any_guild', channels: [] };
    }
    const out = [];
    for (const guild of guilds) {
      const channels = await discordGet(`/guilds/${guild.id}/channels`, token);
      if (!Array.isArray(channels)) continue;
      for (const ch of channels) {
        // 0 = text, 5 = announcement, 11 = public thread. Everything else is a
        // voice channel or category, which cannot hold these posts.
        if (ch?.type !== 0 && ch?.type !== 5 && ch?.type !== 11) continue;
        out.push({
          id: String(ch.id),
          name: ch.name ?? 'unnamed',
          type: ch.type,
          categoryId: ch.parent_id ? String(ch.parent_id) : null,
        });
      }
    }
    return { ok: true, channels: out };
  } catch {
    return { ok: false, error: 'unreachable', channels: [] };
  }
}

async function handleChannelList(request, env) {
  const session = await getSession(request, env);
  if (!session) return json({ ok: false, error: 'unauthorized' }, 401);
  if (request.method !== 'GET') return json({ ok: false, error: 'method_not_allowed' }, 405);
  return json(await listBotChannels(env));
}

// ---- admin auth -------------------------------------------------------------

const revoked = new Map(); // jti -> exp (best-effort in-isolate revocation on logout)

function revokeSession(payload) {
  if (payload?.jti) revoked.set(payload.jti, payload.exp);
  if (revoked.size > 5000) {
    const now = Date.now();
    for (const [jti, exp] of revoked) {
      if (exp <= now || revoked.size > 2500) revoked.delete(jti);
    }
  }
}

async function getSession(request, env) {
  if (!env.ADMIN_PASSWORD) return null;
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const payload = await verifySession(token, env.ADMIN_PASSWORD);
  if (!payload) return null;
  if (payload.jti && revoked.has(payload.jti)) return null;
  if (env.ADMIN_USERNAME && payload.u !== env.ADMIN_USERNAME) return null;
  return payload;
}

const loginAttempts = new Map();

function tooManyAttempts(request) {
  const ip = clientIp(request);
  const entry = loginAttempts.get(ip);
  if (entry && entry.resetAt > Date.now() && entry.count >= LOGIN_RATE_LIMIT.max) return true;
  return false;
}

function recordFailure(request) {
  const ip = clientIp(request);
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || entry.resetAt <= now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_RATE_LIMIT.windowMs });
  } else {
    entry.count += 1;
  }
  if (loginAttempts.size > 10_000) loginAttempts.clear();
}

// Public review submissions are limited by IP to prevent spam/abuse.
const reviewSubmits = new Map();

function reviewRateLimited(request) {
  const ip = clientIp(request);
  const now = Date.now();
  const entry = reviewSubmits.get(ip);
  if (entry && entry.resetAt > now) {
    if (entry.count >= REVIEW_RATE.max) return true;
    entry.count += 1;
  } else {
    reviewSubmits.set(ip, { count: 1, resetAt: now + REVIEW_RATE.windowMs });
  }
  if (reviewSubmits.size > 10_000) reviewSubmits.clear();
  return false;
}

async function handleLogin(request, env) {
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);
  if (!env.ADMIN_PASSWORD) {
    return json({ ok: false, configured: false, error: 'admin_not_configured' }, 503);
  }
  if (tooManyAttempts(request)) {
    return json({ ok: false, error: 'too_many_attempts' }, 429);
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    // fall through to credential check
  }
  const { username, password } = body ?? {};
  const expectedUser = env.ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME;

  if (
    username === expectedUser &&
    (await safeEqual(String(password ?? ''), env.ADMIN_PASSWORD))
  ) {
    const session = await issueSession(
      { u: expectedUser, exp: Date.now() + SESSION_AGE_MS, jti: newSessionId() },
      env.ADMIN_PASSWORD
    );
    const res = json({ ok: true, authenticated: true }, 200);
    res.headers.set('Set-Cookie', sessionCookie(session, request));
    return res;
  }

  recordFailure(request);
  return json({ ok: false, error: 'invalid_credentials' }, 401);
}

function originIsAllowed(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

async function handleLogout(request, env) {
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);
  const token = readCookie(request, SESSION_COOKIE);
  if (token) {
    const payload = await verifySession(token, env?.ADMIN_PASSWORD).catch(() => null);
    revokeSession(payload);
  }
  const res = json({ ok: true });
  res.headers.set('Set-Cookie', clearSessionCookie(request));
  return res;
}

async function ensureFeedWarm(env) {
  if (!feedState.data || Date.now() - feedState.syncedAt >= CACHE_TTL_MS) {
    try {
      await syncFeed(env);
    } catch {
      // status page can still report the error
    }
  }
}

async function handleStatus(request, env) {
  const session = await getSession(request, env);
  if (!session) {
    return json({ ok: false, authenticated: false, error: 'unauthorized' }, 401);
  }
  await ensureFeedWarm(env);
  return json({
    ok: true,
    authenticated: true,
    admin: { username: env.ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME },
    session: { expiresAt: session.exp },
    discord: await dashboard(env),
  });
}

async function handleSync(request, env) {
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);
  if (!(await getSession(request, env))) {
    return json({ ok: false, authenticated: false, error: 'unauthorized' }, 401);
  }
  if (!originIsAllowed(request)) {
    return json({ ok: false, error: 'forbidden' }, 403);
  }
  feedState.syncedAt = 0;
  let syncOk = false;
  try {
    await syncFeed(env);
    syncOk = true;
  } catch {
    // refetch failed; surface the reason via the dashboard payload
  }
  return json({ ok: true, synced: syncOk, discord: await dashboard(env) });
}

async function handleConfig(request, env) {
  const session = await getSession(request, env);
  if (!session) {
    return json({ ok: false, authenticated: false, error: 'unauthorized' }, 401);
  }

  if (request.method === 'GET') {
    configCache.value = null;
    configCache.at = 0;
    const cfg = await loadConfig(env);
    const effectiveToken = cfg.token || env.DISCORD_BOT_TOKEN || '';
    const effectiveCategories = cfg.categories.length
      ? cfg.categories
      : listIds(env.DISCORD_CATEGORY_IDS);
    return json({
      ok: true,
      config: {
        tokenSet: Boolean(effectiveToken),
        tokenSource: cfg.token ? 'panel' : env.DISCORD_BOT_TOKEN ? 'env' : 'none',
        categories: effectiveCategories,
        successChannelId: cfg.successChannelId ?? '',
        updatedAt: cfg.updatedAt,
      },
    });
  }

  if (request.method === 'POST') {
    if (!originIsAllowed(request)) {
      return json({ ok: false, error: 'forbidden' }, 403);
    }
    let body = {};
    try {
      body = await request.json();
    } catch {
      // treat as empty body
    }
    const categories = parseCategories(body.categories ?? '');
    // Accept a raw snowflake or a pasted URL/ID form. An empty value clears it.
    const rawChannel = typeof body.successChannelId === 'string' ? body.successChannelId.trim() : '';
    const scraped = rawChannel.match(/(\d{15,25})/)?.[1] ?? '';
    let cfg;
    try {
      cfg = await saveConfig(env, {
        token: body.token,
        categories,
        successChannelId: scraped,
      });
    } catch (err) {
      return json({ ok: false, error: sanitizeError(err) }, 500);
    }
    feedState.syncedAt = 0;
    feedState.data = null;
    feedState.error = null;
    feedState.errorsAt = null;
    return json({
      ok: true,
      config: {
        tokenSet: Boolean(cfg.token),
        tokenSource: cfg.token ? 'panel' : 'none',
        categories: cfg.categories,
        successChannelId: cfg.successChannelId,
        updatedAt: cfg.updatedAt,
      },
    });
  }

  return json({ ok: false, error: 'method_not_allowed' }, 405);
}

async function handleDealsAdmin(request, env, id) {
  const session = await getSession(request, env);
  if (!session) {
    return json({ ok: false, authenticated: false, error: 'unauthorized' }, 401);
  }
  const mutation = request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE';
  if (mutation && !originIsAllowed(request)) {
    return json({ ok: false, error: 'forbidden' }, 403);
  }

  const all = await listManualDeals(env);

  if (!id && request.method === 'GET') {
    return json({ ok: true, deals: all });
  }

  if (!id && request.method === 'POST') {
    let body = {};
    try {
      body = await request.json();
    } catch {
      // fall through to validation
    }
    const nextId = `manual-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    const deal = buildManualDeal(body, nextId, null);
    if (deal.error) return json({ ok: false, error: deal.error }, 400);
    all.push(deal);
    await saveManualDeals(env, all);
    return json({ ok: true, deal }, 201);
  }

  if (id) {
    const index = all.findIndex((d) => d.id === id);
    if (index === -1) return json({ ok: false, error: 'not_found' }, 404);
    if (request.method === 'PUT') {
      let body = {};
      try {
        body = await request.json();
      } catch {
        // fall through to validation
      }
      const updated = buildManualDeal(body, id, all[index]);
      if (updated.error) return json({ ok: false, error: updated.error }, 400);
      all[index] = updated;
      await saveManualDeals(env, all);
      return json({ ok: true, deal: updated });
    }
    if (request.method === 'DELETE') {
      all.splice(index, 1);
      await saveManualDeals(env, all);
      return json({ ok: true });
    }
  }

  return json({ ok: false, error: 'method_not_allowed' }, 405);
}


function readTrialDiscordId(body) {
  const id = String(body?.discord_id ?? '').trim();
  return /^\d{17,25}$/.test(id) ? id : null;
}

const TRIAL_ID_HINT =
  'Enter a Discord user ID (17-25 digits). Enable Developer Mode in Discord (Settings → Advanced), right-click the user → Copy User ID.';

// Admin grants the free 7-day trial after approving a #trials ticket.

// Admin manually revokes access (trial abuse / early cut-off).

// Content API — read/write editable site content (stored in KV, synced from git)
async function handleContent(request, env) {
  const session = await getSession(request, env);
  if (!session) return json({ ok: false, authenticated: false, error: 'unauthorized' }, 401);

  const url = new URL(request.url);
  const route = url.searchParams.get('route');
  const component = url.searchParams.get('component');

  if (request.method === 'GET') {
    if (!route || !component) {
      // Return full manifest
      const manifest = await getContentManifest(env);
      return json({ ok: true, manifest });
    }
    const content = await getContent(env, route, component);
    return json({ ok: true, content });
  }

  if (request.method === 'PUT') {
    if (!originIsAllowed(request)) return json({ ok: false, error: 'forbidden' }, 403);
    if (!route || !component) return json({ ok: false, error: 'route and component required' }, 400);

    let body = {};
    try { body = await request.json(); } catch { return json({ ok: false, error: 'invalid_json' }, 400); }

    const manifest = await getContentManifest(env);
    const routeConfig = manifest.routes?.[route];
    const componentSchema = routeConfig?.components?.[component];
    if (!componentSchema) return json({ ok: false, error: 'component not found' }, 404);

    // Validate against schema
    const validated = validateContent(body, componentSchema.fields);
    if (!validated.ok) return json({ ok: false, error: validated.error }, 400);

    await setContent(env, route, component, validated.data);
    return json({ ok: true, content: validated.data });
  }

  return json({ ok: false, error: 'method_not_allowed' }, 405);
}

async function handleContentSync(request, env) {
  const session = await getSession(request, env);
  if (!session) return json({ ok: false, authenticated: false, error: 'unauthorized' }, 401);
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);

  try {
    const manifest = await fetchContentManifestFromGit(env);
    await syncContentToKV(env, manifest);
    return json({ ok: true, synced: true });
  } catch (e) {
    console.error('[content] sync failed:', e);
    return json({ ok: false, error: 'sync_failed' }, 500);
  }
}

async function getContentManifest(env) {
  const cached = await kvGet(env, 'content:manifest');
  if (cached) {
    try { return JSON.parse(cached); } catch {}
  }
  // Fallback to embedded manifest
  return getEmbeddedManifest();
}

async function setContent(env, route, component, data) {
  const key = `content:${route}:${component}`;
  await kvPut(env, key, JSON.stringify(data));
  // Update manifest timestamp
  const manifest = await getContentManifest(env);
  if (manifest.routes?.[route]?.components?.[component]) {
    manifest.routes[route].components[component].updatedAt = Date.now();
    await kvPut(env, 'content:manifest', JSON.stringify(manifest));
  }
}

async function getContent(env, route, component) {
  const key = `content:${route}:${component}`;
  const cached = await kvGet(env, key);
  if (cached) {
    try { return JSON.parse(cached); } catch {}
  }
  // Fallback to embedded default
  const manifest = await getContentManifest(env);
  return manifest.routes?.[route]?.components?.[component]?.fields ? 
    getDefaultValues(manifest.routes[route].components[component].fields) : null;
}

function getDefaultValues(fields) {
  const result = {};
  for (const [key, schema] of Object.entries(fields)) {
    result[key] = schema.default ?? null;
  }
  return result;
}

function validateContent(data, schema) {
  const result = {};
  for (const [key, fieldSchema] of Object.entries(schema)) {
    const value = data[key];
    if (value === undefined || value === null) {
      if (fieldSchema.default !== undefined) {
        result[key] = fieldSchema.default;
        continue;
      }
      if (fieldSchema.required) return { ok: false, error: `Missing required field: ${key}` };
    }
    // Type validation
    if (fieldSchema.type === 'string' && typeof value !== 'string') return { ok: false, error: `Field ${key} must be string` };
    if (fieldSchema.type === 'number' && typeof value !== 'number') return { ok: false, error: `Field ${key} must be number` };
    if (fieldSchema.type === 'array') {
      if (!Array.isArray(value)) return { ok: false, error: `Field ${key} must be array` };
      if (fieldSchema.itemType === 'object' && fieldSchema.itemFields) {
        result[key] = value.map(item => validateContent(item, fieldSchema.itemFields).data ?? {});
      } else {
        result[key] = value;
      }
    } else {
      result[key] = value;
    }
  }
  return { ok: true, data: result };
}

async function fetchContentManifestFromGit(env) {
  // TODO: Implement GitHub API fetch when GitHub PAT is configured
  // For now, return embedded manifest
  return getEmbeddedManifest();
}

async function syncContentToKV(env, manifest) {
  await kvPut(env, 'content:manifest', JSON.stringify(manifest));
  // Seed defaults for any missing content
  for (const [route, routeConfig] of Object.entries(manifest.routes || {})) {
    for (const [component, componentSchema] of Object.entries(routeConfig.components || {})) {
      const key = `content:${route}:${component}`;
      const existing = await kvGet(env, key);
      if (!existing && componentSchema.fields) {
        await kvPut(env, key, JSON.stringify(getDefaultValues(componentSchema.fields)));
      }
    }
  }
}

function getEmbeddedManifest() {
  // This is the source of truth — synced from src/content/content-manifest.json at build time
  // For production, this would be injected at build time. For now, return minimal structure.
  return {
    version: 1,
    routes: {
      "/": {
        name: "Home",
        components: {
          "Hero": { fields: { title: { type: "string", default: "Catch the deals before everyone else." }, subtitle: { type: "string", default: "Price errors, penny deals and hidden discounts flagged the second they go live..." }, ctaPrimary: { type: "string", default: "Explore Deals" }, ctaSecondary: { type: "string", default: "Start Free Trial" } } },
          "HowItWorks": { fields: { eyebrow: { type: "string", default: "How it works" }, title: { type: "string", default: "From find to profit in three steps" }, description: { type: "string", default: "No paid bot subscriptions, no resellers farming referrals. Just fast, verified deal alerts." }, steps: { type: "array", default: [] } } },
          "WhatWeHunt": { fields: { eyebrow: { type: "string", default: "What we hunt" }, title: { type: "string", default: "The four pillars of the hunt" }, description: { type: "string", default: "Every post is verified and shared with the community before the retailer notices." }, pillars: { type: "array", default: [] } } },
          "LatestFinds": { fields: { eyebrow: { type: "string", default: "Live finds" }, title: { type: "string", default: "Latest finds" } } },
          "CommunityProof": { fields: { eyebrow: { type: "string", default: "Community proof" }, title: { type: "string", default: "Trusted by thousands of deal hunters" }, description: { type: "string", default: "Real feedback from people hunting price errors, penny finds and glitch deals with Deal Profit." }, stats: { type: "array", default: [] } } },
          "FinalCTA": { fields: { title: { type: "string", default: "Never miss a deal again." }, description: { type: "string", default: "Join the community where price errors, penny deals and profitable finds are posted the moment they go live." } } }
        }
      },
      "/upgrade": {
        name: "Upgrade",
        components: {
          "Hero": { fields: { eyebrow: { type: "string", default: "Deal Profit Premium" }, title: { type: "string", default: "Get more than the free feed. Upgrade for faster alerts and more deals." }, description: { type: "string", default: "Free deals are just the beginning. Upgrade for faster alerts, more deal opportunities, and access to premium features designed to help you catch deals before they disappear." } } },
          "TrialIncludes": { fields: { eyebrow: { type: "string", default: "What's included" }, title: { type: "string", default: "Everything inside the free trial" }, items: { type: "array", default: [] } } },
          "Benefits": { fields: { eyebrow: { type: "string", default: "Everything included" }, title: { type: "string", default: "Built for people who hate missing deals" }, description: { type: "string", default: "Every premium feature is designed around one goal: catching the deal before it is gone." }, benefits: { type: "array", default: [] } } },
          "Comparison": { fields: { title: { type: "string", default: "Free gives you access to deals. Premium gives you more ways to catch them." }, description: { type: "string", default: "The free feed is useful for browsing deals. Premium is designed for people who want faster notifications, more deal opportunities, premium Discord access, and additional alerts for price errors, penny deals, and more chances to catch deals before they disappear." }, freeFeatures: { type: "array", default: [] }, premiumFeatures: { type: "array", default: [] } } },
          "TrustIndicators": { fields: { items: { type: "array", default: [] } } },
          "FAQ": { fields: { eyebrow: { type: "string", default: "FAQ" }, title: { type: "string", default: "Questions, answered" }, description: { type: "string", default: "Everything you need to know before joining premium." }, items: { type: "array", default: [] } } },
          "FinalCTA": { fields: { title: { type: "string", default: "Ready to catch more deals?" }, description: { type: "string", default: "Try it free in Discord, then subscribe for $25/mo. Cancel anytime." } } }
        }
      }
    }
  };
}

const CODE_ALLOWLIST = [
  'src/components/',
  'src/routes/',
  'src/lib/',
  'src/hooks/',
  'src/index.css',
  'src/main.jsx',
];

function isCodePathAllowed(path) {
  if (typeof path !== 'string') return false;
  if (path.includes('..')) return false;
  return CODE_ALLOWLIST.some((prefix) => path === prefix || path.startsWith(prefix));
}

// Code API — admin file browser/editor backend. Reads served from the repo is
// not possible inside the Worker, so `tree` returns the editable surface and
// file read/write/preview/commit are staged behind these endpoints until the
// GitHub PAT integration lands (tracked in docs/superpowers/plans/2026-09-28-admin-cms.md).
async function handleCode(request, env) {
  const session = await getSession(request, env);
  if (!session) return json({ ok: false, authenticated: false, error: 'unauthorized' }, 401);

  const url = new URL(request.url);
  const filePath = url.searchParams.get('path');

  if (request.method === 'GET') {
    if (url.pathname.endsWith('/tree')) {
      return json({
        ok: true,
        tree: {
          type: 'folder',
          name: 'src',
          path: 'src',
          children: [
            { type: 'file', name: 'index.css', path: 'src/index.css' },
            { type: 'file', name: 'main.jsx', path: 'src/main.jsx' },
            { type: 'folder', name: 'components', path: 'src/components', children: [] },
            { type: 'folder', name: 'routes', path: 'src/routes', children: [] },
            { type: 'folder', name: 'lib', path: 'src/lib', children: [] },
            { type: 'folder', name: 'hooks', path: 'src/hooks', children: [] },
          ],
        },
      });
    }
    if (filePath) {
      if (!isCodePathAllowed(filePath)) return json({ ok: false, error: 'path_not_allowed' }, 403);
      return json({ ok: false, error: 'github_not_configured' }, 501);
    }
    return json({ ok: false, error: 'path required' }, 400);
  }

  if (request.method === 'PUT') {
    if (!originIsAllowed(request)) return json({ ok: false, error: 'forbidden' }, 403);
    if (!filePath || !isCodePathAllowed(filePath)) {
      return json({ ok: false, error: 'path_not_allowed' }, 403);
    }
    return json({ ok: false, error: 'github_not_configured' }, 501);
  }

  return json({ ok: false, error: 'method_not_allowed' }, 405);
}

async function handleCodePreview(request, env) {
  const session = await getSession(request, env);
  if (!session) return json({ ok: false, authenticated: false, error: 'unauthorized' }, 401);
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);
  if (!originIsAllowed(request)) return json({ ok: false, error: 'forbidden' }, 403);
  return json({ ok: false, error: 'github_not_configured' }, 501);
}

async function handleCodeCommit(request, env) {
  const session = await getSession(request, env);
  if (!session) return json({ ok: false, authenticated: false, error: 'unauthorized' }, 401);
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);
  if (!originIsAllowed(request)) return json({ ok: false, error: 'forbidden' }, 403);
  return json({ ok: false, error: 'github_not_configured' }, 501);
}

const adminRoutes = {
  '/api/admin/login': handleLogin,
  '/api/admin/logout': handleLogout,
  '/api/admin/status': handleStatus,
  '/api/admin/sync': handleSync,
  '/api/admin/config': handleConfig,
  '/api/admin/channels': handleChannelList,
  '/api/admin/interaction-debug': async (request, env) => {
    const session = await getSession(request, env);
    if (!session) return json({ ok: false, error: 'unauthorized' }, 401);
    const raw = await kvGet(env, 'debug:interactions');
    return json({ ok: true, debug: raw ? JSON.parse(raw) : null });
  },
  '/api/admin/content': handleContent,
  '/api/admin/content/sync': handleContentSync,
  '/api/admin/code': handleCode,
  '/api/admin/code/tree': handleCode,
  '/api/admin/code/file': handleCode,
  '/api/admin/code/preview': handleCodePreview,
  '/api/admin/code/commit': handleCodeCommit,
};

function reviewNoticeText(value) {
  const reviewer = value.name ?? 'Anonymous';
  const stars = '★'.repeat(value.rating) + '☆'.repeat(5 - value.rating);
  return (
    `📝 **New review submitted** by **${reviewer}** — ${stars} (${value.rating}/5)\n` +
    `> ${value.text?.slice(0, 200)}${value.text?.length > 200 ? '…' : ''}\n` +
    `_Use the buttons to approve or reject._`
  );
}

function logsReviewDecisionMessage(review, status) {
  const emoji = status === 'approved' ? '✅' : '❌';
  const text = review.text ?? '';
  return (
    `${emoji} Review **${status}** by admin — **${review.name ?? 'Anonymous'}** ` +
    `(${review.rating}/5): ${text.slice(0, 150)}${text.length > 150 ? '…' : ''}`
  );
}

async function handleReviews(request, env) {
  if (request.method === 'GET') {
    const all = await listReviews(env);
    const approved = all
      .filter((r) => r.status === 'approved')
      .sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0));
    const summary = reviewSummary(all);
    return json(
      {
        ok: true,
        reviews: approved.map(toPublicReview),
        summary: { count: summary.count, average: summary.average },
        featured: summary.featured,
      },
      200,
      { 'Cache-Control': 'public, max-age=15, s-maxage=15, stale-while-revalidate=30' }
    );
  }

  if (request.method === 'POST') {
    if (!originIsAllowed(request)) {
      return json({ ok: false, error: 'forbidden' }, 403);
    }
    if (reviewRateLimited(request)) {
      return json({ ok: false, error: 'rate_limited' }, 429);
    }
    let body = {};
    try {
      body = await request.json();
    } catch {
      // fall through to validation
    }
    const { value, error } = validateReview(body);
    if (error) return json({ ok: false, error }, 400);
    const all = await listReviews(env);
    const id = `rv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const review = makeReview(value, id);

    // Log review submission to #logs. Approve/Reject BUTTONS make moderation
    // instant (Discord POSTs to /api/discord/interactions on click). The
    // ✅/❌ reaction instructions stay as a fallback path — the scheduled
    // worker still polls reactions for anyone who prefers them.
    const messageId = await postToLogsChannel(env, reviewNoticeText(value), {
      components: reviewNoticeComponents(id),
    });
    if (messageId) review.discordMessageId = messageId;

    all.push(review);
    await saveReviews(env, all);
    return json({ ok: true, id }, 201);
  }

  return json({ ok: false, error: 'method_not_allowed' }, 405);
}

// Public, read-only feed of member success posts.
//
// The server has 350+ members in Discord and 0 paying on Whop, and the channel
// where members post their wins is invisible to anyone who has not joined. This
// is that channel, shown to strangers.
//
// Cached like the deal feed because it is on the hot path, and unlike the
// success-post shaping itself it carries no correctness risk: a stale image is
// a slightly old photo, not a false claim. The claims in this payload — no
// earnings, no verification, and CAVEAT alongside — are asserted in
// success-posts.test.js.
async function handleSuccess(request, env) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Max-Age': '86400',
      },
    });
  }
  if (request.method !== 'GET') {
    return json({ ok: false, error: 'method_not_allowed' }, 405);
  }
  // loadConfig must be CLOSED OVER env. Passing the bare function reference
  // meant fetchSuccessPosts called it with no argument, so `env` was undefined
  // inside loadConfig and that undefined reached kvGet, which then read
  // `env.DEAL_STORE` off nothing and threw. 500 on every request.
  // Spreading env is equally wrong: KV bindings live on the env prototype, not
  // as own enumerable properties, so a spread loses them.
  const result = await fetchSuccessPosts({
    DISCORD_BOT_TOKEN: env.DISCORD_BOT_TOKEN,
    loadConfig: () => loadConfig(env),
  });
  return json(
    {
      ok: result.ok,
      configured: result.configured,
      posts: result.posts,
      caveat: CAVEAT,
      // Surface the reason so the UI can say "not configured" honestly rather
      // than showing an empty box that looks broken.
      reason: result.reason ?? null,
    },
    200,
    { 'Cache-Control': EDGE_CACHE, 'Access-Control-Allow-Origin': '*', Vary: 'Origin' }
  );
}

async function handleReviewsAdmin(request, env, id) {
  const session = await getSession(request, env);
  if (!session) {
    return json({ ok: false, authenticated: false, error: 'unauthorized' }, 401);
  }
  const mutation = request.method === 'PATCH' || request.method === 'DELETE';
  if (mutation && !originIsAllowed(request)) {
    return json({ ok: false, error: 'forbidden' }, 403);
  }

  const all = await listReviews(env);

  if (!id && request.method === 'GET') {
    const sorted = [...all].sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0));
    return json({ ok: true, reviews: sorted });
  }

  if (id) {
    const index = all.findIndex((r) => r.id === id);
    if (index === -1) return json({ ok: false, error: 'not_found' }, 404);

    if (request.method === 'PATCH') {
      let body = {};
      try {
        body = await request.json();
      } catch {
        // treat as empty patch (status/featured only)
      }
      const review = all[index];
      if (body.status != null) {
        if (!['pending', 'approved', 'rejected'].includes(body.status)) {
          return json({ ok: false, error: 'status_invalid' }, 400);
        }
        const oldStatus = review.status;
        review.status = body.status;
        if (oldStatus !== body.status && (body.status === 'approved' || body.status === 'rejected')) {
          await postToLogsChannel(env, logsReviewDecisionMessage(review, body.status));
        }
      }
      if (body.featured === true) {
        review.featured = true;
        review.status = 'approved';
      } else if (body.featured === false) {
        review.featured = false;
      }
      if (body.name != null) {
        const name = String(body.name).trim().replace(/\s+/g, ' ').slice(0, 40);
        if (name.length < 2) return json({ ok: false, error: 'name_short' }, 400);
        review.name = name;
      }
      if (body.text != null) {
        const text = String(body.text).trim().slice(0, 1000);
        if (text.length < 3) return json({ ok: false, error: 'text_short' }, 400);
        review.text = text;
      }
      if (body.rating != null) {
        const rating = Number(body.rating);
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
          return json({ ok: false, error: 'rating_invalid' }, 400);
        }
        review.rating = rating;
      }
      if (body.category != null) {
        review.category = REVIEW_CATEGORIES.includes(body.category) ? body.category : null;
      }
      review.updatedAt = new Date().toISOString();
      await saveReviews(env, all);
      return json({ ok: true, review });
    }

    if (request.method === 'DELETE') {
      all.splice(index, 1);
      await saveReviews(env, all);
      return json({ ok: true });
    }
  }

  return json({ ok: false, error: 'method_not_allowed' }, 405);
}

// ---- Stripe helpers -----------------------------------------------------------

// Support multiple webhook signing secrets (comma-separated), e.g. when both a
// "snapshot" and a "thin" Stripe destination point at this endpoint.
function webhookSecrets(env) {
  return String(env.STRIPE_WEBHOOK_SECRET || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

// Subscription objects moved current_period_end around across API versions —
// check the top level first, then subscription items.
function subscriptionPeriodEndMs(sub) {
  const seconds =
    sub?.current_period_end ??
    sub?.items?.data?.find((i) => i.current_period_end)?.current_period_end ??
    sub?.items?.data?.[0]?.current_period_end;
  return seconds ? seconds * 1000 : null;
}

// Stripe "thin" events only carry { id, object } — re-fetch the full resource.

async function getSubscriptionStore(env) {
  if (!env.DEAL_STORE) throw new Error('DEAL_STORE binding not available');
  const id = env.DEAL_STORE.idFromName('main');
  return env.DEAL_STORE.get(id);
}


// Cancel (or resume) the caller's own subscription: cancel-at-period-end via
// Stripe so access lasts until the paid-through date. The #logs notice and the
// persisted cancel flag come from the subscription.updated webhook, which
// Stripe fires for portal cancels too — single source of truth.

// ---- Discord #logs channel notifications --------------------------------------
// Every trial start and paid subscription posts a message to the guild's
// #logs text channel. Best-effort: failures are logged but never block the
// webhook or admin action that triggered them.

let logsChannelCache = { id: null, at: 0, resolved: false };
const LOGS_CHANNEL_TTL_MS = 5 * 60 * 1000;

async function postToLogsChannel(env, content, extra = {}) {
  try {
    const logs = await getLogsChannel(env);
    if (!logs) return null;

    const res = await fetch(`${DISCORD_API}/channels/${logs.channelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${logs.token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'DealProfit-Website/1.0 (https://goosiev.com)',
        Accept: 'application/json',
      },
      body: JSON.stringify({ content, ...extra }),
    });
    if (!res.ok) {
      console.error('[logs] #logs post failed:', res.status, await res.text().catch(() => ''));
      return null;
    }
    const data = await res.json().catch(() => null);
    return data?.id ?? null;
  } catch (err) {
    console.error('[logs] #logs post error:', err);
    return null;
  }
}

// Resolve (and cache) the guild's #logs channel plus the bot token.
// Returns { guildId, channelId, token } or null when unavailable.
async function getLogsChannel(env) {
  try {
    const { token } = await resolveDiscordConfig(env);
    if (!token) {
      console.warn('[logs] no bot token — skipping #logs message');
      return null;
    }
    const guildId = await getGuildId(env);
    if (!guildId) {
      console.warn('[logs] no guild id — skipping #logs message');
      return null;
    }
    if (!logsChannelCache.resolved || Date.now() - logsChannelCache.at > LOGS_CHANNEL_TTL_MS) {
      const channels = await discordGet(`/guilds/${guildId}/channels`, token);
      const logs = Array.isArray(channels)
        ? channels.find((c) => c.type === 0 && c.name === 'logs')
        : null;
      logsChannelCache = { id: logs?.id ?? null, at: Date.now(), resolved: true };
      if (!logs?.id) console.warn('[logs] #logs channel not found in guild');
    }
    if (!logsChannelCache.id) return null;
    return { guildId, channelId: logsChannelCache.id, token };
  } catch (err) {
    console.error('[logs] #logs resolve error:', err);
    return null;
  }
}

// Grant the premium Discord role once the subscription is (or becomes) paid.

async function handleUserSubscription(request, env) {
  if (request.method !== 'GET') return json({ ok: false, error: 'method_not_allowed' }, 405);

  const user = await getDiscordSession(request, env);
  if (!user) {
    return json({ ok: false, error: 'discord_required' }, 401);
  }

  // The Discord role is the source of truth for ACCESS ("do they have it?"),
  // the Stripe record is the source of truth for billing. Report both so the
  // UI can't say "not subscribed" to someone who actually holds the role.
  const premiumRole = await hasPremiumRole(env, user.id);
  const discord = { id: user.id, username: user.username };

  const store = await getSubscriptionStore(env);
  const sub = await store.fetch('https://store.internal/subscriptions/get?user_id=' + encodeURIComponent(user.id));
  if (!sub.ok) {
    // Store hiccup — still answer with identity + role instead of failing
    return json({ ok: true, subscription: null, discord, premiumRole });
  }
  const data = await sub.json();

  return json({
    ok: true,
    subscription: data.subscription,
    discord,
    premiumRole,
  });
}

// ---- Discord OAuth2 -----------------------------------------------------------

const OAUTH_STATE_COOKIE = 'dp_oauth_state';
const OAUTH_STATE_TTL_MS = 30 * 60 * 1000; // 30 minutes (Discord verification can be slow)
const OAUTH_STATES_MAX = 3; // keep recent states: double-clicks / back+retry must not invalidate
const OAUTH_COOKIE_SEPARATOR = '|'; // '|' is a legal cookie-octet, ',' is not

function issueOAuthStateCookie(request, state, previousValue) {
  const secure = new URL(request.url).protocol === 'https:';
  const previous = previousValue ? previousValue.split(OAUTH_COOKIE_SEPARATOR) : [];
  const states = [...previous, state].slice(-OAUTH_STATES_MAX);
  return `${OAUTH_STATE_COOKIE}=${states.join(OAUTH_COOKIE_SEPARATOR)}; Path=/; HttpOnly; Secure=${secure}; SameSite=Lax; Max-Age=${Math.floor(OAUTH_STATE_TTL_MS / 1000)}`;
}

function readOAuthStateCookie(request) {
  const cookie = request.headers.get('Cookie');
  if (!cookie) return null;
  const match = cookie.match(new RegExp(`(?:^|; )${OAUTH_STATE_COOKIE}=([^;]+)`));
  return match ? match[1] : null;
}

function isValidOAuthState(request, state) {
  const stored = readOAuthStateCookie(request);
  if (!stored) return false;
  return stored.split(OAUTH_COOKIE_SEPARATOR).includes(state);
}

function clearOAuthStateCookie(request) {
  const secure = new URL(request.url).protocol === 'https:';
  return `${OAUTH_STATE_COOKIE}=; Path=/; HttpOnly; Secure=${secure}; SameSite=Lax; Max-Age=0`;
}

// ---- Discord identity session (the site's only "login") ----------------------
// There is no password login for customers: Discord OAuth is the identity.
// A random token cookie maps to a stored record { id, username, at }.

const DISCORD_SESSION_COOKIE = 'dp_session';
const DISCORD_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const DISCORD_SESSION_KEY = (token) => `discord_session:${token}`;

function readCookieValue(request, name) {
  const cookie = request.headers.get('Cookie');
  if (!cookie) return null;
  const match = cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return match ? match[1] : null;
}

async function createDiscordSession(env, user) {
  const token = crypto.randomUUID();
  const record = { id: String(user.id), username: String(user.username ?? ''), at: Date.now() };
  await kvPut(env, DISCORD_SESSION_KEY(token), JSON.stringify(record));
  // link any subscription created before login (discord_id passed through OAuth)
  return token;
}

async function getDiscordSession(request, env) {
  const token = readCookieValue(request, DISCORD_SESSION_COOKIE);
  if (!token) return null;
  const raw = await kvGet(env, DISCORD_SESSION_KEY(token));
  if (!raw) return null;
  try {
    const record = JSON.parse(raw);
    if (!record?.id) return null;
    if (Date.now() - (record.at ?? 0) > DISCORD_SESSION_TTL_MS) return null;
    return record;
  } catch {
    return null;
  }
}

function sessionCookieHeader(request, token) {
  const secure = new URL(request.url).protocol === 'https:';
  return `${DISCORD_SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure=${secure}; SameSite=Lax; Max-Age=${Math.floor(DISCORD_SESSION_TTL_MS / 1000)}`;
}

async function handleDiscordAuth(request, env) {
  if (!env.DISCORD_CLIENT_ID || !env.DISCORD_REDIRECT_URI) {
    return json({ ok: false, error: 'discord_oauth_not_configured' }, 500);
  }

  const state = crypto.randomUUID();
  const scope = 'identify guilds.members.read';
  const params = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    redirect_uri: env.DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope,
    state,
    prompt: 'consent'
  });

  const redirectUrl = `https://discord.com/api/oauth2/authorize?${params.toString()}`;

  // no-store: browsers must never replay a cached 302 (stale state = broken flow)
  return new Response(null, {
    status: 302,
    headers: {
      'Location': redirectUrl,
      'Cache-Control': 'no-store',
      'Set-Cookie': issueOAuthStateCookie(request, state, readOAuthStateCookie(request))
    }
  });
}

// All callback failures land the user back on /upgrade with a readable message
// instead of a bare 400 text page.
function oauthFailureRedirect(request, reason) {
  console.error('[discord-oauth] callback failed:', reason);
  const frontendUrl = new URL(request.url).origin;
  const headers = new Headers({
    'Location': `${frontendUrl}/upgrade?linked=failed`,
    'Cache-Control': 'no-store',
  });
  headers.append('Set-Cookie', clearOAuthStateCookie(request));
  return new Response(null, { status: 302, headers });
}

async function handleDiscordCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state || !isValidOAuthState(request, state)) {
    return oauthFailureRedirect(request, `invalid state (code=${!!code})`);
  }

  // Exchange code for access token
  const tokenParams = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    client_secret: env.DISCORD_CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: env.DISCORD_REDIRECT_URI
  });

  const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenParams.toString()
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    return oauthFailureRedirect(request, `token exchange failed: ${err}`);
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  // Get user info
  const userRes = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!userRes.ok) {
    return oauthFailureRedirect(request, `user info fetch failed: ${userRes.status}`);
  }

  const user = await userRes.json();
  const discordId = String(user.id);

  // Discord OAuth is the site's login: always establish an identity session
  const token = await createDiscordSession(env, user);

  // Record the link (user_id === discord id under this identity model)
  try {
    const store = await getSubscriptionStore(env);
    await store.fetch('https://store.internal/subscriptions/link-discord', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: discordId, discord_id: discordId }),
    });
  } catch (err) {
    console.error('[discord] link-discord failed:', err);
  }

  const frontendUrl = new URL(request.url).origin;
  const headers = new Headers({
    'Location': `${frontendUrl}/upgrade?linked=true`,
    'Cache-Control': 'no-store',
  });
  headers.append('Set-Cookie', clearOAuthStateCookie(request));
  headers.append('Set-Cookie', sessionCookieHeader(request, token));
  return new Response(null, { status: 302, headers });
}

// ---- Discord Role Management --------------------------------------------------

async function resolveDiscordConfig(env) {
  const { token, categories } = await resolveDiscord(env);
  return { token, categories };
}

async function getGuildId(env) {
  // Try to get from stored config first
  const cfg = await loadConfig(env);
  if (cfg.guildId) return cfg.guildId;
  // Fallback: discover from bot's guilds (assume first guild)
  const { token } = await resolveDiscordConfig(env);
  if (!token) return null;
  const guilds = await discordGet('/users/@me/guilds', token);
  if (Array.isArray(guilds) && guilds.length > 0) {
    return guilds[0].id;
  }
  return null;
}

async function getRoleId(env, guildId) {
  if (!guildId) return null;
  // Exact ID — can't be misspelled or confused with a similarly-named role
  if (PREMIUM_ROLE_ID) return PREMIUM_ROLE_ID;
  const { token } = await resolveDiscordConfig(env);
  if (!token) return null;
  const roles = await discordGet(`/guilds/${guildId}/roles`, token);
  if (Array.isArray(roles)) {
    const role = roles.find(r => r.name === PREMIUM_ROLE_NAME);
    return role?.id ?? null;
  }
  return null;
}

async function discordRoleRequest(method, guildId, userId, roleId, token, retries = 3) {
  const url = `${DISCORD_API}/guilds/${guildId}/members/${userId}/roles/${roleId}`;
  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DISCORD_FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bot ${token}`,
          'User-Agent': 'DealProfit-Website/1.0 (https://goosiev.com)',
        },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok || res.status === 404) {
        return { ok: true, status: res.status };
      }
      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        const retryAfter = (data.retry_after ?? 1) * 1000;
        await new Promise(r => setTimeout(r, retryAfter));
        continue;
      }
      return { ok: false, status: res.status, error: await res.text() };
    } catch (err) {
      clearTimeout(timer);
      if (attempt === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  return { ok: false, error: 'max_retries_exceeded' };
}

// Nothing in this Worker grants the premium role.
//
// Whop is the merchant of record, and Whop's own Discord integration grants the
// role when a member completes a purchase and removes it when the subscription
// ends. There is deliberately no `grantPremiumRole` here any more: a helper
// that hands out paid access, sitting in a Worker on an account that has already
// been flagged once, is a liability waiting to be wired to something.
//
// This revoke survives only for the scheduled expiry sweep, which tidies
// subscription records this Worker wrote before the move to Whop.
async function revokePremiumRole(env, discordId) {
  const { token } = await resolveDiscordConfig(env);
  if (!token) return { ok: false, error: 'no_bot_token' };
  const guildId = await getGuildId(env);
  if (!guildId) return { ok: false, error: 'no_guild' };
  const roleId = await getRoleId(env, guildId);
  if (!roleId) return { ok: false, error: 'role_not_found' };
  return discordRoleRequest('DELETE', guildId, discordId, roleId, token);
}

// Does this Discord user currently hold the premium role?
// Returns true / false, or null when it can't be determined (no bot token,
// network hiccup) so callers can report "unknown" rather than guessing. Cached briefly so page loads don't hammer the Discord API.
const ROLE_CACHE_PREFIX = 'rolecache:';
const ROLE_CACHE_TTL_MS = 60_000;

async function hasPremiumRole(env, discordId) {
  const cacheKey = ROLE_CACHE_PREFIX + discordId;
  try {
    const raw = await kvGet(env, cacheKey);
    if (raw) {
      const cached = JSON.parse(raw);
      if (cached && typeof cached.at === 'number' && Date.now() - cached.at < ROLE_CACHE_TTL_MS) {
        return typeof cached.has === 'boolean' ? cached.has : null;
      }
    }
  } catch {
    // corrupt cache — fall through to a live check
  }

  let result = null;
  try {
    const { token } = await resolveDiscordConfig(env);
    const guildId = token ? await getGuildId(env) : null;
    const roleId = guildId ? await getRoleId(env, guildId) : null;
    if (guildId && roleId) {
      try {
        const member = await discordGet(`/guilds/${guildId}/members/${discordId}`, token);
        result = !!(member && Array.isArray(member.roles) && member.roles.includes(roleId));
      } catch (err) {
        // 404 = not in the guild anymore → definitely no role; anything else
        // (rate limit, network) stays unknown rather than a wrong answer
        if (err?.status === 404) result = false;
      }
    }
  } catch {
    result = null;
  }

  await kvPut(env, cacheKey, JSON.stringify({ has: result, at: Date.now() }));
  return result;
}

async function handleAdmin(request, env) {
  const url = new URL(request.url);
  const dealsMatch = url.pathname.match(/^\/api\/admin\/deals(?:\/([^/]+))?$/);
  if (dealsMatch) return handleDealsAdmin(request, env, dealsMatch[1] ?? null);
  const reviewsMatch = url.pathname.match(/^\/api\/admin\/reviews(?:\/([^/]+))?$/);
  if (reviewsMatch) return handleReviewsAdmin(request, env, reviewsMatch[1] ?? null);
  const handler = adminRoutes[url.pathname];
  if (!handler) return json({ ok: false, error: 'not_found' }, 404);
  return handler(request, env);
}

// ---- site counter -------------------------------------------------------------
// Public vanity counter: total unique visitors (first-party localStorage id,
// counted once, ever) + how many have pinged in the last 5 minutes.

const STATS_TOTAL_KEY = 'stats:total';
const STATS_SEEN_PREFIX = 'stats:seen:';
const STATS_PRESENCE_KEY = 'stats:presence';
const STATS_ONLINE_WINDOW_MS = 5 * 60 * 1000;
const STATS_PRESENCE_MAX = 500; // hard cap so spam can't bloat the map

function countOnline(presence, now) {
  return Object.values(presence).filter(
    (t) => typeof t === 'number' && now - t < STATS_ONLINE_WINDOW_MS
  ).length;
}

async function handleSiteStats(request, env) {
  const now = Date.now();

  if (request.method === 'GET') {
    let presence = {};
    try {
      presence = JSON.parse((await kvGet(env, STATS_PRESENCE_KEY)) ?? '{}') || {};
    } catch {
      presence = {};
    }
    const total = Number((await kvGet(env, STATS_TOTAL_KEY)) ?? 0) || 0;
    return json({ ok: true, total, online: countOnline(presence, now) }, 200, {
      'Cache-Control': 'no-store',
    });
  }

  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);

  let body = {};
  try {
    body = await request.json();
  } catch {
    // fall through to vid validation
  }
  const vid = String(body?.vid ?? '');
  if (!/^[a-z0-9-]{8,64}$/i.test(vid)) return json({ ok: false, error: 'invalid_vid' }, 400);

  // Read current stats (needed for the response either way)
  let presence = {};
  try {
    presence = JSON.parse((await kvGet(env, STATS_PRESENCE_KEY)) ?? '{}') || {};
  } catch {
    presence = {};
  }
  let total = Number((await kvGet(env, STATS_TOTAL_KEY)) ?? 0) || 0;

  // Presence: stamp this visitor, prune stale entries, enforce a size cap.
  // (No per-IP cooldown: carrier-grade NAT shares one IP across many real
  // users, and throttling would drop them from the online count. Total is
  // protected by the once-per-vid dedup below instead.)
  const fresh = {};
  for (const [k, t] of Object.entries(presence)) {
    if (typeof t === 'number' && now - t < STATS_ONLINE_WINDOW_MS) fresh[k] = t;
  }
  fresh[vid] = now;
  let entries = Object.entries(fresh);
  if (entries.length > STATS_PRESENCE_MAX) {
    entries.sort((a, b) => b[1] - a[1]);
    entries = entries.slice(0, STATS_PRESENCE_MAX);
  }
  const presenceOut = Object.fromEntries(entries);
  await kvPut(env, STATS_PRESENCE_KEY, JSON.stringify(presenceOut));

  // Total: count each visitor id exactly once, ever
  const seenKey = STATS_SEEN_PREFIX + vid;
  if (!(await kvGet(env, seenKey))) {
    await kvPut(env, seenKey, String(now));
    total += 1;
    await kvPut(env, STATS_TOTAL_KEY, String(total));
  }

  return json({ ok: true, total, online: countOnline(presenceOut, now) }, 200, {
    'Cache-Control': 'no-store',
  });
}

// ---- #logs review moderation ------------------------------------------------
// Buttons: every review notice gets Approve / Reject buttons whose custom_id
// is `review:approve:<id>` / `review:reject:<id>`. Clicks arrive at
// /api/discord/interactions, signed with Ed25519 using the app's PUBLIC key
// (Discord signs; we verify — no shared secret). We answer within 3s with an
// ephemeral result and apply the decision via the follow-up PATCH so the user
// gets an instant "✅ Approved" popup.
const REVIEW_BTN_PREFIX = 'review:';
const INTERACTION_MAX_AGE_S = 60 * 15;

// Hex → Uint8Array (browsers/Workers have no Buffer)
function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function parseInteractionPublicKey(base64) {
  const raw = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  if (raw.length !== 32) throw new Error('bad_public_key');
  return crypto.subtle.importKey('raw', raw, { name: 'Ed25519' }, false, ['verify']);
}

// Returns true only for a fresh, correctly-signed Discord interaction.
async function verifyInteractionRequest(request, body, env) {
  const publicKeyB64 = env.DISCORD_PUBLIC_KEY;
  if (!publicKeyB64) return { ok: false, error: 'public_key_not_configured' };
  const signature = request.headers.get('X-Signature-Ed25519');
  const timestamp = request.headers.get('X-Signature-Timestamp');
  if (!signature || !timestamp) return { ok: false, error: 'missing_signature' };
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return { ok: false, error: 'bad_timestamp' };
  const ageS = Math.abs(Date.now() / 1000 - ts);
  if (ageS > INTERACTION_MAX_AGE_S) return { ok: false, error: 'stale_timestamp' };
  try {
    const key = await parseInteractionPublicKey(publicKeyB64);
    const valid = await crypto.subtle.verify(
      { name: 'Ed25519' },
      key,
      hexToBytes(signature),
      new TextEncoder().encode(timestamp + body)
    );
    return valid ? { ok: true } : { ok: false, error: 'invalid_signature' };
  } catch {
    return { ok: false, error: 'invalid_signature' };
  }
}

const interactionResponse = (body) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

const interactionEphemeral = (content) =>
  interactionResponse({
    type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
    data: { content, flags: 64 }, // EPHEMERAL — only the clicker sees this
  });

// Ack within 3s (ephemeral result), then apply the decision in the background.
function interactionAckResponse(apply) {
  const ack = interactionResponse({
    type: 5, // DEFERRED_CHANNEL_UPDATE_WITH_SOURCE
    data: { content: apply.ackText },
  });
  return {
    response: ack,
    deferred: (async () => {
      try {
        await apply.run();
      } catch (err) {
        console.error('[interactions] apply failed:', err);
      }
    })(),
  };
}

function reviewNoticeComponents(reviewId) {
  return [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 2, // Success
          label: 'Approve',
          custom_id: `${REVIEW_BTN_PREFIX}approve:${reviewId}`,
        },
        {
          type: 2,
          style: 2, // Danger
          label: 'Reject',
          custom_id: `${REVIEW_BTN_PREFIX}reject:${reviewId}`,
        },
      ],
    },
  ];
}

async function setReviewStatus(env, review, status) {
  const all = await listReviews(env);
  const target = all.find((r) => r.id === review.id);
  if (!target) return false;
  target.status = status;
  target.updatedAt = new Date().toISOString();
  await saveReviews(env, all);
  return true;
}

async function handleDiscordInteractions(request, env) {
  if (request.method !== 'POST') {
    return json({ ok: false, error: 'method_not_allowed' }, 405);
  }
  const body = await request.text();
  const verified = await verifyInteractionRequest(request, body, env);
  if (!verified.ok) {
    // TEMP DIAGNOSTIC: record exactly what arrived so we can see why Discord's
    // verification ping is rejected. Removed once verified.
    try {
      await kvPut(env, 'debug:interactions', JSON.stringify({
        at: new Date().toISOString(),
        error: verified.error,
        hasSig: !!request.headers.get('X-Signature-Ed25519'),
        hasTs: !!request.headers.get('X-Signature-Timestamp'),
        ts: request.headers.get('X-Signature-Timestamp'),
        sigLen: (request.headers.get('X-Signature-Ed25519') || '').length,
        bodyLen: body.length,
        bodyHead: body.slice(0, 200),
        fullBody: body,
        fullSig: request.headers.get('X-Signature-Ed25519'),
        cfRay: request.headers.get('cf-ray'),
        ua: request.headers.get('user-agent'),
        allHeaders: Array.from(request.headers.keys()),
      }));
    } catch {}
    return json({ ok: false, error: verified.error }, 401);
  }

  let interaction;
  try {
    interaction = JSON.parse(body);
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }

  if (interaction.type === 1) {
    return interactionResponse({ type: 1 }); // PONG
  }
  if (interaction.type !== 2 || !interaction.message?.components) {
    return json({ ok: false, error: 'unsupported_interaction' }, 400);
  }

  const clickerId = String(interaction.member?.user?.id ?? interaction.user?.id ?? '');
  const guildId = interaction.guild_id
    ? String(interaction.guild_id)
    : await getGuildId(env);
  const { token: botToken } = await resolveDiscordConfig(env);
  if (!botToken) return interactionEphemeral('⚠️ Bot token is not configured.');

  if (!(await isGuildAdmin(env, guildId, clickerId, botToken))) {
    return interactionEphemeral('🔒 Only server admins can approve or reject reviews.');
  }

  const ids = interaction.message.components
    .flatMap((row) => row.components ?? [])
    .map((c) => c.custom_id);
  const known = new Set(['approve', 'reject']);
  const clicked = ids.find((cid) => {
    const [, action, reviewId] = String(cid).split(':');
    return known.has(action) && reviewId === interaction.data?.custom_id?.split(':')[2];
  });
  const action = clicked?.split(':')[1] ?? interaction.data?.custom_id?.split(':')[1];
  const reviewId = clicked?.split(':')[2] ?? interaction.data?.custom_id?.split(':')[2];

  const all = await listReviews(env);
  const review = all.find((r) => r.id === reviewId);
  if (!review) return interactionEphemeral('⚠️ That review was not found (already handled?).');
  if (review.status === action + 'd') {
    return interactionEphemeral(`ℹ️ Already ${review.status}.`);
  }

  const status = action === 'approve' ? 'approved' : 'rejected';
  const messageId = review.discordMessageId ?? interaction.message?.id;
  const { response, deferred } = interactionAckResponse({
    ackText: `${action === 'approve' ? '✅' : '❌'} **Approved** by <@${clickerId}>`,
    run: async () => {
      const ok = await setReviewStatus(env, review, status);
      if (!ok) return;
      await patchInteractionMessage(interaction, review, status, clickerId);
      await postToLogsChannel(env, logsReviewDecisionMessage(review, status));
    },
  });
  deferred.catch(() => {});
  return response;
}

// Bake the decision into the #logs notice: buttons swapped for a disabled
// result chip, so nobody can double-approve.
async function patchInteractionMessage(interaction, review, status, clickerId) {
  const chip = status === 'approved' ? '\u2705 Approved' : '\u274c Rejected';
  try {
    await fetch(`${DISCORD_API}/interactions/${interaction.id}/${interaction.token}/callback`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DealProfit-Website/1.0 (https://goosiev.com)',
      },
      body: JSON.stringify({
        content:
          `**${status === 'approved' ? 'Approved' : 'Rejected'}** by <@${clickerId}>` +
          (review.discordMessageId ? '' : ''),
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 2,
                label: chip,
                custom_id: `${REVIEW_BTN_PREFIX}done:${review.id}`,
                disabled: true,
              },
            ],
          },
        ],
      }),
    });
  } catch (err) {
    console.error('[interactions] message patch failed:', err);
  }
}

// Reaction-based fallback (same admin check as the buttons): pending reviews
// carry the Discord message id of their #logs notice, and the scheduled
// worker polls ✅/❌ reactions on those messages. Only guild admins count.

const REVIEW_MOD_EMOJI = { approve: '✅', reject: '❌' };
const REVIEW_MOD_GUILD_CACHE_TTL_MS = 10 * 60_000;

let reviewModGuildCache = { at: 0, botId: null, ownerId: null, roles: null };

async function reviewModGuild(env, guildId, token) {
  if (
    reviewModGuildCache.roles &&
    reviewModGuildCache.guildId === guildId &&
    Date.now() - reviewModGuildCache.at < REVIEW_MOD_GUILD_CACHE_TTL_MS
  ) {
    return reviewModGuildCache;
  }
  const [me, guild, roles] = await Promise.all([
    discordGet('/users/@me', token).catch(() => null),
    discordGet(`/guilds/${guildId}`, token).catch(() => null),
    discordGet(`/guilds/${guildId}/roles`, token).catch(() => null),
  ]);
  reviewModGuildCache = {
    at: Date.now(),
    guildId,
    botId: me?.id ?? null,
    ownerId: guild?.owner_id ?? null,
    roles: Array.isArray(roles) ? roles : [],
  };
  return reviewModGuildCache;
}

async function isGuildAdmin(env, guildId, userId, token) {
  const info = await reviewModGuild(env, guildId, token);
  if (!userId) return false;
  if (info.ownerId && userId === info.ownerId) return true;
  let member;
  try {
    member = await discordGet(`/guilds/${guildId}/members/${userId}`, token);
  } catch {
    return false;
  }
  const memberRoles = new Set(member?.roles ?? []);
  return info.roles.some(
    (r) => memberRoles.has(r.id) && (BigInt(r.permissions ?? '0') & 8n) === 8n
  );
}

async function reviewModReactors(env, channelId, messageId, token) {
  const out = { approve: new Set(), reject: new Set() };
  for (const [key, emoji] of Object.entries(REVIEW_MOD_EMOJI)) {
    try {
      const users = await discordGet(
        `/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}?limit=100`,
        token
      );
      for (const u of Array.isArray(users) ? users : []) {
        if (u?.id) out[key].add(String(u.id));
      }
    } catch (err) {
      // 404 = message deleted → caller treats as gone; other errors just skip
      if (err?.status === 404) return null;
    }
  }
  return out;
}

async function discordAckReaction(channelId, messageId, emoji, token) {
  try {
    const res = await fetch(
      `${DISCORD_API}/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}/@me`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bot ${token}`,
          'User-Agent': 'DealProfit-Website/1.0 (https://goosiev.com)',
        },
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

async function checkReviewReactions(env) {
  const logs = await getLogsChannel(env);
  if (!logs) return;
  const info = await reviewModGuild(env, logs.guildId, logs.token);
  if (!info.roles) return;

  const all = await listReviews(env);
  const pending = all.filter((r) => r.status === 'pending' && r.discordMessageId);
  if (pending.length === 0) return;

  let changed = false;
  for (const review of pending) {
    let reactors;
    try {
      reactors = await reviewModReactors(env, logs.channelId, review.discordMessageId, logs.token);
    } catch {
      continue;
    }
    if (!reactors) continue; // message deleted — leave the record for dashboard triage

    const adminsFor = async (ids) => {
      const admins = [];
      for (const id of ids) {
        if (id === info.botId) continue; // never count our own ack reactions
        if (await isGuildAdmin(env, logs.guildId, id, logs.token)) admins.push(id);
      }
      return admins;
    };
    const rejecters = await adminsFor(reactors.reject);
    const approvers = rejecters.length === 0 ? await adminsFor(reactors.approve) : [];
    // Reject wins on conflict — safer default for public content
    const decision = rejecters.length > 0 ? 'rejected' : approvers.length > 0 ? 'approved' : null;
    if (!decision) continue;

    review.status = decision;
    review.updatedAt = new Date().toISOString();
    changed = true;
    await discordAckReaction(
      logs.channelId,
      review.discordMessageId,
      decision === 'approved' ? '✅' : '❌',
      logs.token
    );
    await postToLogsChannel(env, logsReviewDecisionMessage(review, decision));
    console.log(`[reviews] ${decision} ${review.id} via #logs reaction`);
  }
  if (changed) await saveReviews(env, all);
}

export { DealStore } from './store.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/admin')) {
      return handleAdmin(request, env);
    }
    if (url.pathname.startsWith('/api/reviews')) {
      return handleReviews(request, env);
    }
    if (url.pathname.startsWith('/api/success')) {
      return handleSuccess(request, env);
    }
    if (url.pathname.startsWith('/api/deals')) {
      // Preflight for the Whop storefront, which reads the feed cross-origin.
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Max-Age': '86400',
            Vary: 'Origin',
          },
        });
      }
      if (request.method === 'GET') return handleDeals(env);
    }
    if (url.pathname === '/api/user/subscription') {
      return handleUserSubscription(request, env);
    }
    if (url.pathname === '/api/stats') {
      return handleSiteStats(request, env);
    }
    if (url.pathname === '/api/discord/auth') {
      return handleDiscordAuth(request, env);
    }
    if (url.pathname === '/api/discord/interactions') {
      return handleDiscordInteractions(request, env);
    }
    if (url.pathname === '/api/discord/callback') {
      return handleDiscordCallback(request, env);
    }
    if (env.ASSETS) return env.ASETS.fetch(request);
    return new Response('Not found', { status: 404 });
  },

  async scheduled(event, env, ctx) {
    // Runs every 5 min ("*/5 * * * *"): #logs review-reaction moderation.
    // The heavy role-revocation sweep stays daily (gated on `cron:last_daily`).
    try {
      await checkReviewReactions(env);
    } catch (err) {
      console.error('[scheduled] review moderation error:', err);
    }

    try {
      const today = new Date().toISOString().slice(0, 10);
      const lastDaily = await kvGet(env, 'cron:last_daily');
      if (lastDaily === today) return;
      await kvPut(env, 'cron:last_daily', today);
      console.log('[scheduled] Running daily role revocation check');

      const store = await getSubscriptionStore(env);

      // Get expired subscriptions
      const expiredRes = await store.fetch('https://store.internal/subscriptions/expired');
      if (!expiredRes.ok) {
        console.error('[scheduled] Failed to fetch expired subscriptions');
        return;
      }

      const { subscriptions } = await expiredRes.json();
      if (!subscriptions || subscriptions.length === 0) {
        console.log('[scheduled] No expired subscriptions found');
        return;
      }
      
      console.log(`[scheduled] Found ${subscriptions.length} expired subscriptions`);
      
      // Process each expired subscription
      for (const sub of subscriptions) {
        if (sub.discord_id) {
          console.log(`[scheduled] Revoking role for user ${sub.user_id}, discord ${sub.discord_id}`);
          
          // Revoke Discord role
          const roleResult = await revokePremiumRole(env, sub.discord_id);
          if (!roleResult.ok) {
            console.error(`[scheduled] Failed to revoke role for ${sub.discord_id}:`, roleResult.error);
          }
        }

        // Always mark the record expired — even without a linked Discord,
        // so the status stops reading active/trialing after the period ends
        await store.fetch('https://store.internal/subscriptions/revoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: sub.user_id })
        });
      }
      
      console.log('[scheduled] Daily role revocation complete');
    } catch (err) {
      console.error('[scheduled] Error:', err);
    }
  }
};