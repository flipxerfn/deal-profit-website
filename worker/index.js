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

const DISCORD_API = 'https://discord.com/api/v10';
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

const adminRoutes = {
  '/api/admin/login': handleLogin,
  '/api/admin/logout': handleLogout,
  '/api/admin/status': handleStatus,
  '/api/admin/sync': handleSync,
  '/api/admin/config': handleConfig,
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
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Not found', { status: 404 });
  },
};