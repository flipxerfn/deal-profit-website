// Worker-side Discord message parser.
// Takes a message object from the Discord REST API (v10, GET /channels/{id}/messages)
// and normalizes it into a deal record consumed by the frontend.
// Runs on the server only — never ships to the browser.

const URL_RE = /\bhttps?:\/\/[^\s<>"'`)\]]+/gi;
const PRICE_RE = /\$[0-9][0-9,.]*/g;
const STRIKE_RE = /~~\s*\$([0-9][0-9,.]*)\s*~~/;
const REF_TAG_RE =
  /(?:was|retail|original|msrp|list price|before|regular|r\.?p\.?\b|struck at)\s*[:=]?\s*\$([0-9][0-9,.]*)/i;
const CUR_TAG_RE =
  /(?:now|today|deal price|your price|only|shows? at|current price|priced? at)\s*[:=]?\s*\$([0-9][0-9,.]*)/i;

const RETAILERS = {
  amazon: 'Amazon',
  walmart: 'Walmart',
  bestbuy: 'Best Buy',
  'best buy': 'Best Buy',
  newegg: 'Newegg',
  ebay: 'eBay',
  etsy: 'Etsy',
  target: 'Target',
  costco: 'Costco',
  temu: 'Temu',
  aliexpress: 'AliExpress',
  tiktok: 'TikTok Shop',
  hobbylobby: 'Hobby Lobby',
  homedepot: 'Home Depot',
  lowes: "Lowe's",
  kohls: "Kohl's",
  nordstrom: 'Nordstrom',
  macys: "Macy's",
  staples: 'Staples',
  samsclub: "Sam's Club",
  dell: 'Dell',
  hp: 'HP',
  lenovo: 'Lenovo',
  microsoft: 'Microsoft',
  google: 'Google',
};

const TECH_KEYWORDS = [
  'gpu', 'graphics card', 'rtx', 'gtx', 'rx ', 'gaming pc', 'console', 'playstation', 'xbox',
  'switch', 'laptop', 'notebook', 'desktop', 'monitor', 'tv', 'television', 'headphone', 'headset',
  'earbud', 'speaker', 'soundbar', 'phone', 'iphone', 'android', 'samsung', 'ssd', 'nvme', 'hard drive',
  'cpu', 'processor', 'ram ', 'motherboard', 'keyboard', 'mouse', 'camera', 'drone',
  'tablet', 'ipad', 'apple', 'macbook', 'airpods', 'charger', 'router', 'watch',
];

const toNum = (raw) => {
  if (raw == null) return null;
  const n = parseFloat(String(raw).replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n : null;
};

const cleanMarkdown = (text = '') =>
  text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*(?:__)?([^*]+?)(?:__)?\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/[*_>#]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export function extractPrices(raw) {
  const refs = [];
  const struck = toNum(STRIKE_RE.exec(raw)?.[1]);
  const tagged = toNum(REF_TAG_RE.exec(raw)?.[1]);
  if (struck != null) refs.push(struck);
  if (tagged != null) refs.push(tagged);
  const reference = refs[0] ?? null;

  const stated = [];
  for (const m of raw.matchAll(PRICE_RE)) {
    const n = toNum(m[0]);
    if (n != null) stated.push(n);
  }
  const distinct = [...new Set(stated)].sort((a, b) => a - b);

  let price = toNum(CUR_TAG_RE.exec(raw)?.[1]);
  if (price == null) {
    const candidates = distinct.filter((n) => n !== reference);
    price = candidates[0] ?? null;
  }

  let referencePrice = reference;
  if (referencePrice == null && distinct.length >= 2) {
    referencePrice = distinct[distinct.length - 1];
  }
  if (price == null && distinct.length) price = distinct[0];
  if (referencePrice != null && !distinct.includes(referencePrice)) {
    referencePrice = null;
  }
  if (referencePrice === price && distinct.length >= 2) {
    referencePrice = distinct[distinct.length - 1];
  }

  return { price, referencePrice };
}

export function detectRetailer(text, dealUrl) {
  const hay = `${text ?? ''} ${dealUrl ?? ''}`.toLowerCase();
  for (const [key, label] of Object.entries(RETAILERS)) {
    if (hay.includes(key)) return label;
  }
  if (dealUrl) {
    const m = dealUrl.match(/^https?:\/\/(?:www\.|m\.)?([a-z0-9-]+)\.[a-z]{2,}/i);
    if (m) {
      const host = m[1].toLowerCase();
      if (host === 'discord' || host === 'cdn') return null;
      return (host[0] || '').toUpperCase() + host.slice(1);
    }
  }
  return null;
}

const pickDealUrl = (urls) => {
  for (const u of urls) {
    try {
      const parsed = new URL(u);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue;
      const host = parsed.hostname.toLowerCase();
      if (host.includes('discord') || host === 'whop.com') continue;
      return parsed.href;
    } catch {
      // ignore unparseable URLs
    }
  }
  return null;
};

const pickCdnUrl = (urls) => {
  for (const u of urls) {
    try {
      if (new URL(u).hostname.toLowerCase().includes('discordapp')) return u;
    } catch {
      // ignore
    }
  }
  return null;
};

export function parseDealMessage(message, channelId) {
  if (!message || typeof message !== 'object') return null;
  const type = message.type ?? 0;
  if (type !== 0 && type !== 19) return null;

  const content = message.content ?? '';
  const embeds = Array.isArray(message.embeds) ? message.embeds : [];
  const attachments = Array.isArray(message.attachments) ? message.attachments : [];
  const embed = embeds.find((e) => e) ?? null;

  const titleRaw = embed?.title ?? '';
  const descriptionRaw = embed?.description ?? '';
  const fieldText = (embed?.fields ?? []).map((f) => `${f.name}: ${f.value}`).join(' ');
  const footerText = embed?.footer?.text ?? '';
  const embedText = [titleRaw, descriptionRaw, fieldText, footerText].join(' ');
  const raw = `${content} ${embedText}`;

  const image =
    embed?.image?.url ||
    embed?.thumbnail?.url ||
    attachments.find((a) => a?.content_type?.startsWith('image/'))?.url ||
    pickCdnUrl([...raw.matchAll(URL_RE)].map((m) => m[0]));

  const urlCandidates = [];
  if (embed?.url) urlCandidates.push(embed.url);
  for (const m of raw.matchAll(URL_RE)) urlCandidates.push(m[0]);
  const dealUrl = pickDealUrl(urlCandidates);

  const { price, referencePrice } = extractPrices(`${content} ${embedText}`);
  if (price == null) return null;

  const retailer = detectRetailer(raw, dealUrl);

  let title = cleanMarkdown(titleRaw).trim();
  let description = descriptionRaw ? cleanMarkdown(descriptionRaw).trim() : '';
  if (!title) {
    const para = cleanMarkdown(content).trim() || cleanMarkdown(fieldText).trim();
    const firstLine = (para.match(/^[^\n]*/) || [para])[0] ?? '';
    const rest = para.replace(/^[^\n]*/, '').replace(/^\n+/, '').trim();
    title = firstLine || (retailer ? `New deal at ${retailer}` : 'New deal found');
    if (!description) description = rest;
  }

  title = title.slice(0, 80).replace(/https?:\/\/\S+/gi, '').replace(/[:|>-]\s*$/, '').trim();
  description = description.slice(0, 200);

  const lower = `${title} ${description}`.toLowerCase();
  const isPenny = (price ?? 0) < 1 || /\bpenny\b/.test(lower);
  const isTech = TECH_KEYWORDS.some((k) => lower.includes(k));

  let category = 'other';
  let categoryLabel = 'Other';
  if (isPenny) {
    category = 'penny';
    categoryLabel = 'Penny Deals';
  } else if (isTech) {
    category = 'tech';
    categoryLabel = 'Tech';
  }

  let badge = null;
  if (isPenny) badge = 'Penny find';
  else if (/(price error|mis price|misprice|glitch|system price|oops)/i.test(lower) && referencePrice != null)
    badge = 'Price error';
  else if (/\bglitch\b/i.test(lower)) badge = 'Glitch';

  const displayPrice = price < 1 ? 'As low as $0.01' : null;
  const meta = retailer ? [retailer, 'Live now'] : ['Live now'];

  const messageUrl = `https://discord.com/channels/${
    message.guild_id ?? message.channel_id ?? '@me'
  }/${channelId ?? message.channel_id ?? ''}/${message.id}`;

  return {
    id: `discord-${message.id}`,
    title: title || 'New deal found',
    category,
    categoryLabel,
    badge,
    price,
    referencePrice,
    displayPrice,
    description,
    meta,
    image: image || null,
    imageAlt: title || 'New deal found',
    imagePosition: null,
    cta: {
      label: dealUrl ? 'View Deal' : 'Open in Discord',
      href: dealUrl || messageUrl,
    },
    source: 'discord',
    postedAt: message.timestamp ?? null,
    messageId: message.id,
    channelId: channelId ?? message.channel_id ?? null,
  };
}