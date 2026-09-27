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
import Stripe from 'stripe';

const DISCORD_API = 'https://discord.com/api/v10';
const STRIPE_API = 'https://api.stripe.com/v1';
const PRICE_MONTHLY_CENTS = 2500; // $25.00
const SUBSCRIPTION_PRICE_ID = 'price_deal_profit_monthly'; // Will be created in Stripe dashboard
const PREMIUM_ROLE_NAME = 'deal-profit'; // Role name to grant/revoke
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

async function saveConfig(env, { token, categories }) {
  const prev = await loadConfig(env);
  const cfg = {
    token: typeof token === 'string' && token.trim() ? token.trim() : prev.token,
    categories: Array.isArray(categories) ? categories : prev.categories,
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
  const { title, url, image, price, referencePrice, category, categoryLabel, description, badge, displayPrice, meta, imageAlt, imagePosition, cta, source, postedAt } = deal;
  return { id: deal.id, title, url, image, price, referencePrice, category, categoryLabel, description, badge, displayPrice, meta, imageAlt, imagePosition, cta, source, postedAt };
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
  const serve = (payload, extra = {}) =>
    json({ ...payload }, 200, { 'Cache-Control': EDGE_CACHE, ...extra });

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
    let cfg;
    try {
      cfg = await saveConfig(env, { token: body.token, categories });
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

const TRIAL_PERIOD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function readTrialDiscordId(body) {
  const id = String(body?.discord_id ?? '').trim();
  return /^\d{17,25}$/.test(id) ? id : null;
}

const TRIAL_ID_HINT =
  'Enter a Discord user ID (17-25 digits). Enable Developer Mode in Discord (Settings → Advanced), right-click the user → Copy User ID.';

// Admin grants the free 7-day trial after approving a #trials ticket.
async function handleGrantTrial(request, env) {
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);
  const session = await getSession(request, env);
  if (!session) return json({ ok: false, authenticated: false, error: 'unauthorized' }, 401);

  let body = {};
  try {
    body = await request.json();
  } catch {
    // fall through to id validation
  }
  const discordId = readTrialDiscordId(body);
  if (!discordId) return json({ ok: false, error: 'invalid_discord_id', message: TRIAL_ID_HINT }, 400);

  const store = await getSubscriptionStore(env);
  const now = Date.now();

  const existingRes = await store.fetch(
    'https://store.internal/subscriptions/get?user_id=' + encodeURIComponent(discordId)
  );
  const existing = existingRes.ok ? (await existingRes.json())?.subscription ?? null : null;
  if (
    existing &&
    (existing.status === 'active' || existing.status === 'trialing') &&
    (existing.current_period_end ?? 0) > now
  ) {
    return json(
      { ok: false, error: 'already_has_access', status: existing.status, current_period_end: existing.current_period_end },
      409
    );
  }

  const upsertRes = await store.fetch('https://store.internal/subscriptions/upsert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: discordId,
      discord_id: discordId,
      status: 'trialing',
      current_period_end: now + TRIAL_PERIOD_MS,
    }),
  });
  if (!upsertRes.ok) return json({ ok: false, error: 'trial_upsert_failed' }, 500);
  const { subscription } = await upsertRes.json();

  // Best-effort role grant — the trial record stands even if Discord rejects the call
  const role = await grantPremiumRole(env, discordId);
  await postToLogsChannel(
    env,
    `🎟️ <@${discordId}> granted a **manual 7-day trial** by admin — first $25 charge <t:${Math.floor((subscription?.current_period_end ?? now + TRIAL_PERIOD_MS) / 1000)}:D>`
  );
  return json({ ok: true, subscription, role: { ok: role.ok, error: role.error ?? null } });
}

// Admin manually revokes access (trial abuse / early cut-off).
async function handleRevokeTrial(request, env) {
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);
  const session = await getSession(request, env);
  if (!session) return json({ ok: false, authenticated: false, error: 'unauthorized' }, 401);

  let body = {};
  try {
    body = await request.json();
  } catch {
    // fall through to id validation
  }
  const discordId = readTrialDiscordId(body);
  if (!discordId) return json({ ok: false, error: 'invalid_discord_id', message: TRIAL_ID_HINT }, 400);

  const store = await getSubscriptionStore(env);
  const revokeRes = await store.fetch('https://store.internal/subscriptions/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: discordId }),
  });
  if (!revokeRes.ok) return json({ ok: false, error: 'revoke_failed' }, 500);
  const { subscription } = await revokeRes.json();
  if (!subscription) return json({ ok: false, error: 'not_found' }, 404);

  const role = await revokePremiumRole(env, discordId);
  return json({ ok: true, subscription, role: { ok: role.ok, error: role.error ?? null } });
}

const adminRoutes = {
  '/api/admin/login': handleLogin,
  '/api/admin/logout': handleLogout,
  '/api/admin/status': handleStatus,
  '/api/admin/sync': handleSync,
  '/api/admin/config': handleConfig,
  '/api/admin/grant-trial': handleGrantTrial,
  '/api/admin/revoke-trial': handleRevokeTrial,
};

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
    all.push(makeReview(value, id));
    await saveReviews(env, all);
    return json({ ok: true, id }, 201);
  }

  return json({ ok: false, error: 'method_not_allowed' }, 405);
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
        review.status = body.status;
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

function getStripe(env) {
  if (!env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not configured');
  // Workers have no Node http/crypto — use fetch + WebCrypto
  return new Stripe(env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  });
}

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
async function resolveCheckoutSession(stripe, event) {
  const cs = event.data?.object ?? {};
  if (cs.customer || cs.subscription || cs.payment_status) return cs;
  if (!cs.id) return cs;
  return stripe.checkout.sessions.retrieve(cs.id, { expand: ['subscription'] });
}

async function resolveSubscription(stripe, event) {
  const sub = event.data?.object ?? {};
  if (sub.items || sub.current_period_end || sub.status) return sub;
  if (!sub.id) return sub;
  return stripe.subscriptions.retrieve(sub.id);
}

async function getSubscriptionStore(env) {
  if (!env.DEAL_STORE) throw new Error('DEAL_STORE binding not available');
  const id = env.DEAL_STORE.idFromName('main');
  return env.DEAL_STORE.get(id);
}

const TRIAL_DAYS = 7;

async function createCheckoutSession(env, userId, origin, { trial = false } = {}) {
  const stripe = getStripe(env);
  const store = await getSubscriptionStore(env);

  // Get or create Stripe customer
  let subscription = await store.fetch('https://store.internal/subscriptions/get?user_id=' + encodeURIComponent(userId));
  let customerId;
  if (subscription.ok) {
    const data = await subscription.json();
    if (data.subscription?.stripe_customer_id) {
      customerId = data.subscription.stripe_customer_id;
    }
  }

  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { user_id: userId }
    });
    customerId = customer.id;
    // Update subscription record with customer ID (user_id IS the discord id,
    // so record the link at the same time)
    await store.fetch('https://store.internal/subscriptions/upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        stripe_customer_id: customerId,
        discord_id: /^\d{17,25}$/.test(String(userId)) ? String(userId) : null,
      })
    });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Deal Profit Premium',
          description: 'Monthly subscription for premium deal alerts and Discord access'
        },
        unit_amount: PRICE_MONTHLY_CENTS,
        recurring: { interval: 'month' }
      },
      quantity: 1
    }],
    success_url: `${origin}/upgrade?session_id={CHECKOUT_SESSION_ID}&success=true`,
    cancel_url: `${origin}/upgrade?canceled=true`,
    metadata: { user_id: userId },
    subscription_data: {
      metadata: { user_id: userId },
      // Free 7-day trial: card on file, first $25 charge happens automatically
      // on day 7 unless the subscription is canceled before then
      ...(trial ? { trial_period_days: TRIAL_DAYS } : {}),
    }
  });

  return { sessionId: session.id, url: session.url };
}

async function handleStripeCheckout(request, env) {
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);

  // Discord OAuth is this site's login — checkout requires a linked identity
  const user = await getDiscordSession(request, env);
  if (!user) {
    return json({ ok: false, error: 'discord_required' }, 401);
  }

  const origin = new URL(request.url).origin;
  let body = {};
  try {
    body = await request.json();
  } catch {
    // no body — plain subscription
  }
  try {
    const result = await createCheckoutSession(env, user.id, origin, { trial: body?.trial === true });
    return json({ ok: true, ...result });
  } catch (err) {
    return json({ ok: false, error: sanitizeError(err) }, 500);
  }
}

async function upsertSubscriptionRecord(store, fields) {
  const res = await store.fetch('https://store.internal/subscriptions/upsert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`subscription_upsert_failed: ${detail}`);
  }
  return res.json();
}

// ---- Discord #logs channel notifications --------------------------------------
// Every trial start and paid subscription posts a message to the guild's
// #logs text channel. Best-effort: failures are logged but never block the
// webhook or admin action that triggered them.

let logsChannelCache = { id: null, at: 0, resolved: false };
const LOGS_CHANNEL_TTL_MS = 5 * 60 * 1000;

async function postToLogsChannel(env, content) {
  try {
    const { token } = await resolveDiscordConfig(env);
    if (!token) {
      console.warn('[logs] no bot token — skipping #logs message');
      return false;
    }
    const guildId = await getGuildId(env);
    if (!guildId) {
      console.warn('[logs] no guild id — skipping #logs message');
      return false;
    }
    if (!logsChannelCache.resolved || Date.now() - logsChannelCache.at > LOGS_CHANNEL_TTL_MS) {
      const channels = await discordGet(`/guilds/${guildId}/channels`, token);
      const logs = Array.isArray(channels)
        ? channels.find((c) => c.type === 0 && c.name === 'logs')
        : null;
      logsChannelCache = { id: logs?.id ?? null, at: Date.now(), resolved: true };
      if (!logs?.id) console.warn('[logs] #logs channel not found in guild');
    }
    const channelId = logsChannelCache.id;
    if (!channelId) return false;

    const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'DealProfit-Website/1.0 (https://goosiev.com)',
        Accept: 'application/json',
      },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) console.error('[logs] #logs post failed:', res.status, await res.text().catch(() => ''));
    return res.ok;
  } catch (err) {
    console.error('[logs] #logs post error:', err);
    return false;
  }
}

function logsTrialMessage(userId, periodEndMs) {
  const when = periodEndMs ? ` — first $25 charge <t:${Math.floor(periodEndMs / 1000)}:D>` : '';
  return `🎟️ <@${userId}> started a **7-day free trial**${when}`;
}

function logsPurchaseMessage(userId, periodEndMs) {
  const when = periodEndMs ? ` — renews <t:${Math.floor(periodEndMs / 1000)}:D>` : '';
  return `👑 <@${userId}> subscribed to **Deal Profit Premium** — $25/mo${when}`;
}

// Grant the premium Discord role once the subscription is (or becomes) paid.
async function maybeGrantPremiumRole(env, store, userId, status) {
  if (status !== 'active' && status !== 'trialing') return;
  try {
    const res = await store.fetch(
      'https://store.internal/subscriptions/get?user_id=' + encodeURIComponent(userId)
    );
    const data = await res.json();
    const record = data.subscription;
    const discordId =
      record?.discord_id ??
      (/^\d{17,25}$/.test(String(userId)) ? String(userId) : null);
    if (!discordId) {
      console.warn('[stripe] no discord id linked for user', userId);
      return;
    }
    const role = await grantPremiumRole(env, discordId);
    if (!role.ok) console.error('[stripe] grantPremiumRole failed:', role);
    else console.log('[stripe] premium role granted to', discordId);
  } catch (err) {
    console.error('[stripe] grantPremiumRole error:', err);
  }
}

async function revokeForSubscription(env, store, userId) {
  try {
    const res = await store.fetch(
      'https://store.internal/subscriptions/get?user_id=' + encodeURIComponent(userId)
    );
    const data = await res.json();
    const discordId =
      data.subscription?.discord_id ??
      (/^\d{17,25}$/.test(String(userId)) ? String(userId) : null);
    if (!discordId) return;
    const role = await revokePremiumRole(env, discordId);
    if (!role.ok) console.error('[stripe] revokePremiumRole failed:', role);
  } catch (err) {
    console.error('[stripe] revokePremiumRole error:', err);
  }
}

async function userForSubscription(store, sub) {
  if (sub.metadata?.user_id) return String(sub.metadata.user_id);
  const res = await store.fetch(
    'https://store.internal/subscriptions/by-stripe?stripe_subscription_id=' +
      encodeURIComponent(sub.id)
  );
  if (res.ok) {
    const data = await res.json();
    if (data.subscription?.user_id) return String(data.subscription.user_id);
  }
  return null;
}

async function handleStripeWebhook(request, env) {
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);

  const secrets = webhookSecrets(env);
  if (secrets.length === 0) {
    return json({ ok: false, error: 'webhook_not_configured' }, 500);
  }

  const sig = request.headers.get('stripe-signature');
  if (!sig) {
    return json({ ok: false, error: 'missing_signature' }, 400);
  }

  const body = await request.text();
  const stripe = getStripe(env);
  const cryptoProvider = Stripe.createSubtleCryptoProvider();

  let event = null;
  for (const secret of secrets) {
    try {
      event = await stripe.webhooks.constructEventAsync(body, sig, secret, undefined, cryptoProvider);
      break;
    } catch {
      // wrong secret (multiple Stripe destinations) — try the next one
    }
  }
  if (!event) {
    return json({ ok: false, error: 'invalid_signature' }, 400);
  }

  const store = await getSubscriptionStore(env);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const cs = await resolveCheckoutSession(stripe, event);
        let sub = cs.subscription;
        if (sub && typeof sub !== 'object') {
          sub = await stripe.subscriptions.retrieve(sub);
        }
        if (!sub) break; // one-time payment — nothing to manage

        const userId = cs.metadata?.user_id ?? sub.metadata?.user_id;
        if (!userId) {
          console.warn('[stripe] checkout completed without user_id metadata');
          break;
        }

        await upsertSubscriptionRecord(store, {
          user_id: String(userId),
          stripe_customer_id: typeof cs.customer === 'string' ? cs.customer : cs.customer?.id ?? null,
          stripe_subscription_id: sub.id,
          discord_id: /^\d{17,25}$/.test(String(userId)) ? String(userId) : null,
          status: sub.status,
          current_period_end: subscriptionPeriodEndMs(sub),
        });
        await maybeGrantPremiumRole(env, store, String(userId), sub.status);

        // #logs channel: trial starts and new paid subscriptions
        const periodEnd = subscriptionPeriodEndMs(sub);
        await postToLogsChannel(
          env,
          sub.status === 'trialing'
            ? logsTrialMessage(String(userId), periodEnd)
            : logsPurchaseMessage(String(userId), periodEnd)
        );
        break;
      }
      case 'customer.subscription.updated': {
        const sub = await resolveSubscription(stripe, event);
        const userId = await userForSubscription(store, sub);
        if (!userId) break;

        await upsertSubscriptionRecord(store, {
          user_id: userId,
          stripe_subscription_id: sub.id,
          status: sub.status,
          current_period_end: subscriptionPeriodEndMs(sub),
        });
        if (sub.status === 'active' || sub.status === 'trialing') {
          await maybeGrantPremiumRole(env, store, userId, sub.status);
        } else if (sub.status === 'canceled' || sub.status === 'incomplete_expired') {
          await store.fetch('https://store.internal/subscriptions/revoke', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId }),
          });
          await revokeForSubscription(env, store, userId);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = await resolveSubscription(stripe, event);
        const userId = await userForSubscription(store, sub);
        if (!userId) break;

        await store.fetch('https://store.internal/subscriptions/revoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId }),
        });
        await revokeForSubscription(env, store, userId);
        break;
      }
      default:
        // Other events (invoice.*, payment events, …) — nothing to do
        break;
    }
  } catch (err) {
    console.error('Stripe webhook error:', err);
    return json({ ok: false, error: 'webhook_processing_failed' }, 500);
  }

  return json({ ok: true });
}

async function handleUserSubscription(request, env) {
  if (request.method !== 'GET') return json({ ok: false, error: 'method_not_allowed' }, 405);

  const user = await getDiscordSession(request, env);
  if (!user) {
    return json({ ok: false, error: 'discord_required' }, 401);
  }

  const store = await getSubscriptionStore(env);
  const sub = await store.fetch('https://store.internal/subscriptions/get?user_id=' + encodeURIComponent(user.id));
  if (!sub.ok) return json({ ok: false, error: 'not_found' }, 404);
  const data = await sub.json();

  return json({
    ok: true,
    subscription: data.subscription,
    discord: { id: user.id, username: user.username },
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

async function grantPremiumRole(env, discordId) {
  const { token } = await resolveDiscordConfig(env);
  if (!token) return { ok: false, error: 'no_bot_token' };
  const guildId = await getGuildId(env);
  if (!guildId) return { ok: false, error: 'no_guild' };
  const roleId = await getRoleId(env, guildId);
  if (!roleId) return { ok: false, error: 'role_not_found' };
  return discordRoleRequest('PUT', guildId, discordId, roleId, token);
}

async function revokePremiumRole(env, discordId) {
  const { token } = await resolveDiscordConfig(env);
  if (!token) return { ok: false, error: 'no_bot_token' };
  const guildId = await getGuildId(env);
  if (!guildId) return { ok: false, error: 'no_guild' };
  const roleId = await getRoleId(env, guildId);
  if (!roleId) return { ok: false, error: 'role_not_found' };
  return discordRoleRequest('DELETE', guildId, discordId, roleId, token);
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

// ---- entrypoint ---------------------------------------------------------------

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
    if (request.method === 'GET' && url.pathname.startsWith('/api/deals')) {
      return handleDeals(env);
    }
    if (url.pathname === '/api/stripe/create-checkout') {
      return handleStripeCheckout(request, env);
    }
    if (url.pathname === '/api/stripe/webhook') {
      return handleStripeWebhook(request, env);
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
    if (url.pathname === '/api/discord/callback') {
      return handleDiscordCallback(request, env);
    }
    if (env.ASSETS) return env.ASETS.fetch(request);
    return new Response('Not found', { status: 404 });
  },

  async scheduled(event, env, ctx) {
    // Cron: "0 3 * * *" (3 AM UTC daily)
    console.log('[scheduled] Running daily role revocation check');
    
    try {
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