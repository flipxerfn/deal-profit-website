// Public, read-only feed of member success posts.
//
// Why this exists: the server has 350+ members in Discord and 0 paying on
// Whop. The most persuasive asset in the business is the channel where members
// post their own wins — and it is invisible to anyone who has not joined. A
// stranger deciding whether $25 is worth it cannot see the one thing that
// would answer that question.
//
// The posts are mostly PHOTOS: an order confirmation, a screenshot of a
// locked-in price, the item in hand. That is the proof, and it is why this
// leads with the image and treats the caption as supporting detail. A
// text-only version of this page would reduce "here is my order" to the words
// "got it for $39.99", which is exactly the kind of thin, unverifiable-looking
// social proof the rest of this site works to avoid.
//
// The framing is deliberate and is the reason this is not a liability:
//
//  - It shows what people POSTED. It never states what anyone EARNED, because
//    nobody is tracking earnings and an invented number would be the exact
//    unverifiable-income claim that got a previous account flagged.
//  - The caveat travels with the feed, not buried in a footer. "Results are not
//    typical" is the sentence that makes showing wins defensible.
//  - Nothing is labelled "verified". Earlier this site applied a "Verified
//    member" badge to arbitrary posts, which is a claim about a person's
//    identity that nothing in Discord proves.
//
// The disclaimer is defined HERE, not in the React component, and success-posts
// .test.js fails if this sentence is deleted. If the caveat lived only in the
// UI, removing or breaking the component would silently strip the one thing
// that makes publishing member posts defensible, and the feed would keep
// working while making the same claim with nothing to qualify it.
import { stripDiscordPings } from './parseDeals.js';
export const CAVEAT =
  'Results are not typical and are not a promise of any income. These are ' +
  'individual posts from members. Judge each find on its own merits.';

const SUCCESS_WORDS = [
  'got it', 'got mine', 'secured', 'snagged', 'ordered', 'ordered mine',
  'bought', 'checked out', 'in cart', 'purchased', 'just got', 'i got',
  'finally got', 'success', 'worked', 'still available', 'at checkout',
  'in stock', 'succeeded', 'confirmed', 'mine arrived', 'it shipped',
  'arrived', 'delivered', 'thanks', 'thank you', 'works', 'legit',
];

// Posts that read as an announcement or a repost rather than someone showing
// their own result. Without this, the channel's own "🔥 NEW DEAL" style posts
// would fill a page that is supposed to show MEMBERS, not deals.
const NOT_SUCCESS = [
  'new deal', 'deal found', 'just dropped', 'price drop', 'ending soon',
  'today only', 'flash sale', 'restocked', 'back in stock', 'limited time',
  'deal alert', 'new listing', 'price error found', 'just posted',
];

const MONEY = /(?:\$\s?\d[\d,]*(?:\.\d{2})?)|(?:\b\d+\s?% off\b)/i;

const noise = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s%$]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * A post qualifies when it either shows an image or says something concrete.
 *
 * The image is the strong signal: a member posting a screenshot or a photo of
 * the item is showing an outcome, and that is the case worth featuring even
 * when the caption is just "mine got here 🎉" with no figure in it. A post with
 * only text needs the figure, because bare enthusiasm is not evidence.
 */
export function looksLikeSuccess(text, { hasImage = false } = {}) {
  const raw = String(text ?? '');
  const t = noise(raw);
  if (t.length < 3 && !hasImage) return false;

  // An announcement is not a member's win, even with an image attached — that
  // is just the deal feed posting, which the site already has.
  if (NOT_SUCCESS.some((p) => t.includes(p))) return false;

  if (hasImage) return true;

  if (t.length < 12) return false;
  if (!SUCCESS_WORDS.some((w) => t.includes(w))) return false;
  return MONEY.test(raw);
}

/** Trim to a single readable line without cutting a word in half. */
export function excerpt(text, max = 140) {
  const s = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).trimEnd()}…`;
}

/** Discord snowflake -> ISO date. Returns null rather than a wrong date. */
export function snowflakeDate(id) {
  const n = Number(String(id ?? '').split('-')[0]);
  if (!Number.isFinite(n) || n < 1e17) return null;
  const d = new Date((n / 4194304) + 1420070400000);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Every image URL on a message: attachments first, then embed thumbnails. */
function imageUrls(message) {
  const urls = [];
  for (const a of message.attachments ?? []) {
    if (a?.content_type?.startsWith('image/') && a.url) urls.push(a.url);
  }
  for (const e of message.embeds ?? []) {
    if (e?.image?.url) urls.push(e.image.url);
    else if (e?.thumbnail?.url) urls.push(e.thumbnail.url);
  }
  return urls;
}

/**
 * Turn raw Discord messages into feed entries.
 *
 * Bots are excluded outright: they are the feed, not the proof. Posts older
 * than a year are dropped — an ancient result presented as current is the same
 * credibility failure as a fabricated one, just slower.
 */
export function toSuccessPosts(messages, { limit = 9, now = Date.now() } = {}) {
  const out = [];
  const seen = new Set();

  for (const m of Array.isArray(messages) ? messages : []) {
    if (!m || typeof m !== 'object') continue;
    if (m.author?.bot) continue;

    // Same unterminated-mention problem as deal titles, and the same shared
    // fix. The live API was serving 'thank you <@1361808798402216017' in a
    // public caption because this path never got the treatment deal titles
    // did. Importing the helper rather than copying the regex is the point:
    // the two paths had already drifted once.
    const text = stripDiscordPings(String(m.content ?? '')).trim();
    const images = imageUrls(m);
    if (!text && images.length === 0) continue;
    if (!looksLikeSuccess(text, { hasImage: images.length > 0 })) continue;

    const ts = snowflakeDate(m.id);
    const tsMs = ts ? Date.parse(ts) : NaN;
    const ageDays = Number.isFinite(tsMs) ? (now - tsMs) / 86400000 : Infinity;
    if (ageDays > 365) continue;

    // Same body posted repeatedly must not fill the page.
    const key = noise(text).slice(0, 100) || images[0];
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      id: m.id,
      author: m.author?.username ?? 'member',
      text: excerpt(text),
      image: images[0] ?? null,
      // Second image is kept: members often post "confirmation + the item".
      imageAlt: text ? excerpt(text, 90) : 'Posted by a community member',
      postedAt: ts,
      // Left null deliberately. See the file header.
      earnings: null,
    });
  }

  // An image is the stronger signal, so picture posts lead. Within a group the
  // newest still wins.
  out.sort((a, b) => {
    const pa = a.image ? 1 : 0;
    const pb = b.image ? 1 : 0;
    if (pa !== pb) return pb - pa;
    return (b.postedAt ?? '').localeCompare(a.postedAt ?? '');
  });
  return out.slice(0, limit);
}

// ---- network -----------------------------------------------------------------

const DISCORD_API = 'https://discord.com/api/v10';

/**
 * Resolve the success channel from KV config, tolerating a pasted URL.
 *
 * Kept out of env deliberately: the channel is discovered, not known up front,
 * and moving a channel in Discord should not need a redeploy. Falls back to
 * an env var for deployments that prefer configuration-as-code.
 */
export function resolveSuccessChannel(cfg, env = {}) {
  const raw = cfg?.successChannelId || env.SUCCESS_CHANNEL_ID || '';
  const m = String(raw).match(/(\d{15,25})/);
  return m ? m[1] : null;
}

/**
 * Fetch and shape the feed.
 *
 * Fails quietly on purpose: this is a credibility surface, and serving stale
 * member posts as if they were current would be worse than serving none. An
 * empty feed is a normal state the UI handles, so callers get
 * `{ ok, configured, posts, reason }` and never an exception.
 */
export async function fetchSuccessPosts(env, { limit = 9 } = {}) {
  const cfg = await env.loadConfig();
  const channelId = resolveSuccessChannel(cfg, env);
  if (!channelId) {
    return { ok: false, configured: false, posts: [], reason: 'no_channel_configured' };
  }
  const token = cfg?.token || env.DISCORD_BOT_TOKEN || '';
  if (!token) return { ok: false, configured: true, posts: [], reason: 'no_bot_token' };

  try {
    // 50 is Discord's cap for this endpoint and is plenty: the filter is
    // strict, so a busy channel fills the page from the most recent page.
    const res = await fetch(
      `${DISCORD_API}/channels/${encodeURIComponent(channelId)}/messages?limit=50`,
      { headers: { Authorization: `Bot ${token}` } }
    );
    if (!res.ok) {
      return { ok: false, configured: true, posts: [], reason: `discord_${res.status}` };
    }
    const messages = await res.json();
    return { ok: true, configured: true, posts: toSuccessPosts(messages, { limit }) };
  } catch {
    return { ok: false, configured: true, posts: [], reason: 'unreachable' };
  }
}
