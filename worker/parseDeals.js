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
  // Business desktops were landing in "other": "HP EliteDesk 800 G6 Mini PC"
  // matched nothing, not even "desktop".
  'mini pc', 'micro pc', 'all-in-one', 'aio pc', 'elitedesk', 'thinkcentre',
  'optiplex', 'elitebook', 'power supply', 'wifi adapter', 'smart watch',
];

// Categories chosen from what the feed actually posts, measured across the live
// feed rather than guessed. Every list is checked against a sample of real
// posts in worker/feed-categories.test.js, and every id must exist in
// src/data/deals.js CATEGORIES or the chip is invisible in the UI.
const CATEGORY_KEYWORDS = {
  grocery: [
    'grocery', 'groceries', 'food', 'snack', 'drink', 'beverage', 'coffee', 'tea', 'candy',
    'chocolate', 'pizza', 'sauce', 'soda', 'water bottle', 'canned', 'cereal', 'snacks',
    'refreshers', 'juice', 'energy drink', 'protein', 'gum', 'cracker', 'pasta', 'rice',
  ],
  home: [
    'kitchen', 'martini', 'blender', 'mixer', 'cookware', 'pan', 'pot ', 'knife', 'appliance',
    'vacuum', 'lamp', 'light', 'furniture', 'bed', 'pillow', 'towel', 'curtain', 'sofa',
    'couch', 'mattress', 'storage bin', 'home depot event', 'lowes', 'wayfair', 'dining',
    'coffee maker', 'air fryer', 'toaster', 'blender', 'floor cleaner',
    'vacuum cleaner', 'humidifier', 'dehumidifier', 'air purifier', 'space heater',
    'ceiling fan', 'water pitcher', 'airpot', 'instapot', 'dishwasher',
  ],
  tools: [
    'tool', 'drill', 'saw', 'wrench', 'screw', 'bolt', 'nut ', 'fastener', 'hose', 'chuck',
    'clamp', 'sander', 'grinder', 'plier', 'hardware', 'paint', 'adhesive', 'epoxy',
    'fittings', 'valve', 'tube', 'reducer', 'adapter', 'hydraulic', 'lumber', 'plywood',
    'air cap', 'needle', 'nozzle', 'airbrush', 'sharpie', 'marker', 'tape measure',
    'utility knife', 'cement mixer', 'miter saw', 'socket set', 'extension cord',
  ],
  automotive: [
    'spark plug', 'oil filter', 'air filter', 'brake pad', 'brake ', 'wiper', 'battery',
    'alternator', 'radiator', 'transmission', 'car ', 'truck', 'auto ', 'vehicle',
    'motorcycle', 'tire', 'tyre', 'wheel', 'bumper', 'headlight', 'tail light', 'mobil 1',
    'motor oil', 'antifreeze', 'wiper blade', 'cabin filter',
    'running board', 'step bar', 'manifold', 'gasket', 'spark plug wire',
    'catalytic', 'hitch', 'tow hook', 'floor mat', 'seat cover', 'touch up paint',
  ],
  sports: [
    'batting glove', 'baseball', 'basketball', 'football', 'soccer', 'tennis', 'golf',
    'fishing', 'hunting', 'camping', 'tent', 'gym', 'yoga', 'fitness', 'workout',
    'bike', 'bicycle', 'skateboard', 'helmet', 'cleat', 'sneaker', 'jersey', 'racket',
  ],
  apparel: [
    'shirt', 't-shirt', 'hoodie', 'sweater', 'jacket', 'coat', 'jeans', 'pants', 'dress',
    'shoe', 'sneaker', 'boot', 'hat', 'cap ', 'sock', 'underwear', 'swim', 'sweatpants',
    'leggings', 'fashion', 'apparel', 'clothing', 'uniform', 'sweater vest',
  ],
  beauty: [
    'lotion', 'shampoo', 'conditioner', 'serum', 'moisturizer', 'makeup', 'lipstick',
    'foundation', 'cologne', 'perfume', 'deodorant', 'sunscreen', 'spf', 'razor', 'toothbrush',
    'toothpaste', 'vitamin', 'supplement', 'skincare', 'nail', 'blush',
  ],
  pets: [
    'litter box', 'litter', 'pet ', 'dog ', 'cat ', 'cat food', 'dog food', 'puppy',
    'kitten', 'aquarium', 'fish tank', 'bird cage', 'hamster', 'rabbit', 'leash',
    'collar', 'grooming', 'flea ', 'chew toy', 'bird feeder', 'pet bed',
  ],
  toys: [
    'funko', 'pop!', 'vinyl figure', 'figure', 'doll', 'lego', 'action figure',
    'board game', 'puzzle', 'o gauge', 'model train', 'nECA', 'diecast',
    'collectible', 'blind box', 'play set', 'toy ', 'plush', 'stuffed animal',
  ],
  crafts: [
    'craft', 'yarn', 'crochet', 'knit', 'sewing', 'paint by number', 'canvas', 'bead',
    'scrapbook', 'origami', 'model kit', 'puzzle', 'diamond painting', 'embroidery',
    'blank', 'wood blank', 'resin', 'cardstock', 'scrapbook',
  ],
};

// The Discord bots that post this feed prefix messages with a single Unicode
// symbol (U+1CBC) as a separator. 42 of 200 live posts had a title of literally
// that one character, which made them unreadable and left nothing to
// categorise — 181 of 200 fell through to "other" as a result.
//
// A usable title needs enough letters and digits to be a product name, so walk
// the lines until one qualifies instead of trusting the first one.
const isJunkLine = (text) => {
  const s = String(text ?? '').trim();
  if (s.length < 4) return true;
  if (isBannerLine(s)) return true;
  const wordish = (s.match(/[\p{L}\p{N}]/gu) ?? []).length;
  return wordish < Math.max(3, Math.ceil(s.length * 0.4));
};

// The shape test above cannot tell a product name from an announcement: both
// are mostly letters. Nine live posts led with "🔥 NEW DEAL" or "🔔 JUST
// DROPPED", and those reached the front page as though they were the product.
// A line is an announcement if every word in it is banner vocabulary, which
// real product names essentially never are — "Marucci Remx Batting Gloves" and
// "Penny Deals" both survive on the words that are not in the set.
//
// Capped at five words so a sentence that merely mentions "deal" is left alone.
const BANNER_WORDS = new Set([
  'new', 'deal', 'deals', 'hot', 'flash', 'sale', 'price', 'drop', 'dropped',
  'cut', 'just', 'ending', 'soon', 'today', 'only', 'found', 'post', 'limited',
  'time', 'free', 'shipping', 'restocked', 'back', 'in', 'stock', 'alert',
  'update', 'newest', 'available', 'here', 'checkout', 'link', 'error',
]);

const isBannerLine = (text) => {
  // Strip emoji and punctuation first: "🔥 NEW DEAL" is only two words once the
  // fire is removed, and the emoji is the whole reason it looked word-rich.
  const core = String(text ?? '')
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0F\u200D]/gu, ' ')
    .replace(/[^\p{L}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  if (!core) return true;
  const words = core.split(' ');
  if (words.length > 5) return false;
  return words.every((w) => BANNER_WORDS.has(w));
};

// Ad-platform residue that rides along in the description. "$34.51 MR. COFFEE
// MAKER" is a price glued to a product name, and a trailing "ad" marks the
// promo block. Neither belongs in a title we show as the product.
const stripAdArtifacts = (text) =>
  String(text ?? '')
    .replace(/^[\s$€£]*\d[\d,]*(?:\.\d{1,2})?\s+(?=[A-Za-z])/, '')
    .replace(/\s+ad\b\s*$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

// First line that reads like a product name, or null if the message has none.
const firstUsefulLine = (text) => {
  const lines = String(text ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.find((l) => !isJunkLine(l)) ?? null;
};

const CATEGORY_LABELS = {
  tech: 'Tech',
  grocery: 'Grocery',
  home: 'Home',
  tools: 'Tools & Hardware',
  automotive: 'Automotive',
  sports: 'Sports',
  apparel: 'Apparel',
  beauty: 'Beauty',
  crafts: 'Crafts',
  pets: 'Pets',
  toys: 'Toys',
  penny: 'Penny Deals',
  other: 'Other',
};

// Returns the best category id for a blob of text, or null if nothing matches.
// Longest keyword wins so a specific term beats a generic substring.
const categorise = (lower) => {
  let best = null;
  let bestLen = 0;
  for (const [id, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const k of keywords) {
      if (k.length > bestLen && lower.includes(k)) {
        best = id;
        bestLen = k.length;
      }
    }
  }
  return best;
};

// Tracking/affiliate hops observed in the live feed. A deal card whose button
// sends the reader through one of these is not a verifiable listing, so the
// post is dropped entirely rather than filed under "Other".
const AFFILIATE_HOSTS =
  /(^|\/\/|\.)(mavely\.app\.link|bit\.ly|tinyurl\.com|shorte\.st|lnkd\.in|redirect\.is|go\.linkbux|oneclick\.me|awesometele\.com|couponenabled\.com|dealsplusr\.com)\b/i;

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
  // The source link is ground truth: label the card with the host people will
  // actually visit, so "Amazon" never labels a link to dmflip.com.
  if (dealUrl) {
    try {
      const host = new URL(dealUrl).hostname.replace(/^www\./, '');
      if (host && !/(^|\.)(discord\.(gg|com|me)|cdn\.discordapp\.com)$/i.test(host)) {
        return host;
      }
    } catch {
      // fall through to text detection
    }
  }
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

  // Quality gate: a product name that happens to contain a number ("Hangar 9
  // Fuselage Hatch", "BRUTE 44 Gal") is not a deal. Require a real source link
  // or explicit deal language, otherwise the feed fills with fake-looking posts.
  const DEAL_LANGUAGE =
    /\b(price error|price drop|price cut|mis-?price|system price|oops|glitch|stack(able|ed)?|coupon|promo code|\bdeal\b|\bdeals\b|\bsale\b|discount|clearance|markdown|now \$|was \$|off\b|free shipping|bogo|% ?off|under \$)/i;
  if (!dealUrl && !DEAL_LANGUAGE.test(raw)) return null;

  // Affiliate redirects are not listings. A mavely.app.link hop carries a price
  // and a URL so it clears the gate above, but there is no product and no
  // retailer page behind it — the reader lands on a tracking redirect. Posts
  // like "CHECK FOR STOCK $7.98 WalmartPartner ad" were the worst-looking
  // entries in the feed, so they are dropped rather than categorised.
  if (dealUrl && AFFILIATE_HOSTS.test(dealUrl)) return null;

  const retailer = detectRetailer(raw, dealUrl);

  let title = cleanMarkdown(titleRaw).trim();
  let description = descriptionRaw ? cleanMarkdown(descriptionRaw).trim() : '';
  const para = cleanMarkdown(content).trim() || cleanMarkdown(fieldText).trim();

  // Promote the first line that reads like a product name. The bots' separator
  // symbol, a stray "@everyone", a URL on its own line and a bare "🔥 NEW DEAL"
  // banner are all junk titles that hide the real one sitting underneath.
  if (isJunkLine(title)) {
    const useful = firstUsefulLine(para) ?? firstUsefulLine(description);
    if (useful) title = useful;
  }
  if (!title) {
    const firstLine = (para.match(/^[^\n]*/) || [para])[0] ?? '';
    const rest = para.replace(/^[^\n]*/, '').replace(/^\n+/, '').trim();
    title = firstLine || (retailer ? `New deal at ${retailer}` : 'New deal found');
    if (!description) description = rest;
  }
  // Belt and braces: never render a title that is mostly punctuation.
  if (isJunkLine(title)) {
    title = retailer ? `New deal at ${retailer}` : 'Deal posted to the server';
  }

  title = stripAdArtifacts(title)
    .slice(0, 80)
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/[:|>-]\s*$/, '')
    .trim();
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
  } else {
    // Title wins over description: a "Home Depot" mention in the body should
    // not pull a car part into Home. Ties break on the longest keyword, which
    // is the more specific one ("spark plug" over "plug").
    const inTitle = categorise(title.toLowerCase());
    const found = inTitle ?? categorise(description.toLowerCase());
    if (found) {
      category = found;
      categoryLabel = CATEGORY_LABELS[found] ?? 'Other';
    }
  }

  let badge = null;
  if (isPenny) badge = 'Penny find';
  else if (/(price error|mis price|misprice|glitch|system price|oops)/i.test(lower) && referencePrice != null)
    badge = 'Price error';
  else if (/\bglitch\b/i.test(lower)) badge = 'Glitch';

  const displayPrice = price < 1 ? 'As low as $0.01' : null;
  const meta = dealUrl
    ? [retailer ?? 'Listing', 'Live now']
    : [retailer ?? 'Community post', 'No listing attached'];

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
    url: dealUrl ?? null,
    retailer: retailer ?? null,
    postedAt: message.timestamp ?? null,
    messageId: message.id,
    channelId: channelId ?? message.channel_id ?? null,
  };
}