// Deal Profit — server-side duplicate detection + normalization.
// Runs on the Worker while the feed is normalized (never ships to the browser).
//
// Strategy:
//   - Compute a small set of "signals" per deal once: canonicalized URL, Amazon ASIN,
//     canonicalized image id, normalized title tokens, retailer host, parsed price,
//     and explicit variant tokens (sizes/quantities/colors).
//   - Two deals are duplicates when a STRONG identifier matches (same ASIN, same
//     canonical URL) or when a combination of weaker signals agree (same retailer +
//     very similar title, same image + similar title, title + price).
//   - Genuinely different variants (different size/quantity/color/model tokens) are
//     never merged, and different ASINs / different canonical URLs with different
//     images are treated as distinct products even when titles look alike.
//   - When duplicates are found, the "best" version survives (valid URL + valid price
//     + image + description, manual deals preferred, newest post breaks ties).

const EMOJI_RE = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu;

// Query params that are pure tracking/affiliate noise and can be dropped safely.
const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
  'gclid', 'gclsrc', 'dclid', 'fbclid', 'igshid', 'mc_cid', 'mc_eid', 'msclkid',
  'ko_click_id', 'ref', 'ref_', 'spm', 'sca_esv', 'psr', 'psc', 'ps', 'qid', 'sr',
  'snr', 's', 'smid', 'tag', 'ascsubtag', 'linkcode', 'linkid', 'dyn_id',
  'aod', 'pf_rd_m', 'pf_rd_p', 'pf_rd_r', 'pf_rd_s', 'pf_rd_t',
  'pd_rd_w', 'pd_rd_r', 'pd_rd_wg', 'pd_rd_i',
  'naas_au', 'naas_smp', 'naas_pt', 'naas_sap', 'naas_su', 'ap_id', 'ap_query',
  'th', 'psc', 'currency', 'crid', 'pnref', 'r_ed', 'r_owie', 'r_os', 'r_pvm',
  'irclickid', 'ranmid', 'aff', 'aff_id', 'affclick', 'click_id', 'cid', 'of',
  'affclickid', 'afl', 'akid', 'bypass', 'cvosrc', 'cvocid', 'dynid', 'source',
  'sourceid', 'token',
]);

const EBAY_TRACKING = new Set(['_trkparms', '_trksid', 'itm', 'hash', 'nordt', 'tk', 'mkcid', 'mkevt']);
const WALMART_TRACKING = new Set(['wmlspartner', 'veh', 'wl4', 'wl7', 'wl8', 'wl9', 'pg', 'affimpadid', 'poc_id']);
const AMAZON_TRACKING = new Set(['adid', 'cvct', 'language', 'ref_', 'smid', 'token']);

const AMAZON_ASIN_RE = /(?:\/(?:dp|gp\/product|product|dp\/aw\/d|gp\/aw\/d)\/|(?:^\|&)[\w-]*[?&]?(?:asin=))([A-Z0-9]{10})/i;
const ASIN_PARAM_RE = /(?:^|[?&])asin=([A-Z0-9]{10})/i;
const ASIN_SHORT_RE = /\bB[0-9A-Z]{9}\b/i;
const IMG_ID_RE = /\/images\/I\/([A-Za-z0-9._~-]+)/;

// Quantity variants like "24-pack", "3 pack", "16-oz", "48pk", "2-count".
// The separator between the number and the unit may be whitespace or a hyphen
// ("4-Pack"), or nothing ("64GB").
const VARIANT_QTY_RE = /\b(\d+(?:\.\d+)?)\s*(?:-)?\s*(gb|tb|mb|kb|ml|oz|lb|kg|pack|packs|pk|pair|pairs|count|ct|pcs|in|inch|inches)\b/gi;

// Collapse equivalent unit spellings onto one token ("27in" == "27 inch" == "27inches").
const VARIANT_UNIT = {
  in: 'inch',
  inches: 'inch',
  packs: 'pack',
  pks: 'pk',
  pairs: 'pair',
  pcs: 'ct',
};
const SIZE_TOKENS = new Set(['xs', 'sm', 's', 'm', 'l', 'xl', 'xxl', 'xxxl', '2xl', '3xl', '4xl', '5xl', '6xl']);
const COLOR_TOKENS = new Set([
  'black', 'white', 'gray', 'grey', 'blue', 'red', 'green', 'pink', 'purple', 'gold',
  'silver', 'navy', 'teal', 'orange', 'yellow', 'brown', 'beige', 'cream', 'tan',
  'clear', 'multicolor', 'graphite', 'spacegray', 'space gray', 'midnight',
]);

const normPrice = (n) => {
  if (n == null || !Number.isFinite(Number(n))) return null;
  return Math.round(Number(n) * 100) / 100;
};

function extractAsin(urlHostname, href) {
  const fromPath = AMAZON_ASIN_RE.exec(href)?.[1];
  const fromParam = ASIN_PARAM_RE.exec(href)?.[1];
  const fromShort = ASIN_SHORT_RE.exec(href)?.[0];
  const asin = (fromPath ?? fromParam ?? fromShort ?? '').trim().toUpperCase();
  if (asin && /^[A-Z0-9]{10}$/.test(asin)) return asin;
  return null;
}

export function canonicalizeUrl(url) {
  if (!url) return null;
  let href = String(url).trim();
  if (!/^https?:\/\//i.test(href)) href = `https://${href}`;
  let parsed;
  try {
    parsed = new URL(href);
  } catch {
    return null;
  }
  const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const isAmazon = hostname === 'amazon.com' || hostname.endsWith('.amazon.com') || hostname === 'amzn.to' || hostname === 'a.co';

  const asin = isAmazon ? extractAsin(hostname, parsed.href) : null;
  if (asin) return { key: `asin::${asin}`, asin, hostname, isAmazon };

  const path = (() => {
    try {
      return decodeURIComponent(parsed.pathname).toLowerCase().replace(/\/+$/, '');
    } catch {
      return parsed.pathname.toLowerCase().replace(/\/+$/, '');
    }
  })();
  const params = [...parsed.searchParams.entries()]
    .filter(([k]) => {
      const key = k.toLowerCase();
      if (TRACKING_PARAMS.has(key) || AMAZON_TRACKING.has(key)) return false;
      if (hostname.includes('ebay.')) return EBAY_TRACKING.has(key) ? false : true;
      if (hostname.includes('walmart')) return WALMART_TRACKING.has(key) ? false : true;
      return true;
    })
    .map(([k, v]) => `${k.toLowerCase()}=${v}`)
    .sort()
    .join('&');

  return { key: `${hostname}${path}${params ? `?${params}` : ''}`, asin, hostname, isAmazon };
}

export function canonicalizeImage(url) {
  if (!url) return null;
  let parsed;
  try {
    parsed = new URL(String(url));
  } catch {
    return null;
  }
  const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
  if (hostname.includes('amazon')) {
    const id = IMG_ID_RE.exec(parsed.pathname)?.[1];
    if (id) return `amazonimg::${id.split('._')[0]}`;
  }
  try {
    const path = decodeURIComponent(parsed.pathname).toLowerCase().replace(/\/+$/, '');
    return `img::${hostname}${path}`;
  } catch {
    return `img::${hostname}${parsed.pathname}`;
  }
}

export function normalizeTitle(raw) {
  const t = String(raw ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(EMOJI_RE, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return t;
}

export function titleTokens(normalized) {
  if (!normalized) return new Set();
  return new Set(normalized.split(' ').filter(Boolean));
}

export function variantTokens(rawTitle) {
  const title = String(rawTitle ?? '').toLowerCase();
  const set = new Set();
  for (const [_, num, unit] of title.matchAll(VARIANT_QTY_RE)) {
    if (num && unit) {
      const norm = VARIANT_UNIT[unit.toLowerCase()] || unit.toLowerCase().replace(/s$/, '');
      set.add(`${num}${norm}`);
    }
  }
  const words = title.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  for (const w of words) {
    if (SIZE_TOKENS.has(w)) set.add(`size:${w}`);
    if (COLOR_TOKENS.has(w)) set.add(`color:${w}`);
  }
  return set;
}

export function titleSimilarity(aTokens, bTokens) {
  if (!aTokens || !bTokens || aTokens.size === 0 || bTokens.size === 0) return 0;
  let inter = 0;
  for (const t of aTokens) if (bTokens.has(t)) inter += 1;
  return (2 * inter) / (aTokens.size + bTokens.size);
}

const priceEqual = (a, b) => {
  if (a == null || b == null) return false;
  const pa = normPrice(a);
  const pb = normPrice(b);
  return pa != null && pb != null && Math.abs(pa - pb) <= 0.005;
};

function dealSignals(deal) {
  const urlInfo = canonicalizeUrl(deal.url);
  const imageKey = canonicalizeImage(deal.image);
  const normalized = normalizeTitle(deal.title);
  return {
    asin: urlInfo?.asin ?? null,
    urlKey: urlInfo?.key ?? null,
    retailer: urlInfo?.hostname ?? null,
    titleNorm: normalizeTitle(deal.title),
    titleSet: titleTokens(normalized),
    titleSimilarityCache: null,
    variants: variantTokens(deal.title),
    price: normPrice(deal.price),
    imageKey,
  };
}

function isDuplicate(a, b) {
  const sa = a._signals;
  const sb = b._signals;

  // Distinct variants (size / quantity / color) that are not the same variant are never
  // merged — even when the canonical URL matches (e.g. a 3-pack vs a 5-pack post).
  if (sa.variants.size > 0 && sb.variants.size > 0) {
    const hasDiff = [...sa.variants].some((v) => !sb.variants.has(v));
    const hasShared = [...sa.variants].some((v) => sb.variants.has(v));
    const countsEqual = sa.variants.size === sb.variants.size;
    if (hasDiff || !hasShared || !countsEqual) return false;
  }

  if (sa.asin && sb.asin) return sa.asin === sb.asin;

  if (sa.urlKey && sb.urlKey && sa.urlKey === sb.urlKey) return true;
  if (sa.urlKey && sb.urlKey && sa.urlKey !== sb.urlKey && sa.imageKey && sb.imageKey && sa.imageKey !== sb.imageKey) {
    return false;
  }

  const sim = titleSimilarity(sa.titleSet, sb.titleSet);

  if (sa.retailer && sb.retailer && sa.retailer === sb.retailer) {
    if (sim >= 0.95) return true;
    if (priceEqual(sa.price, sb.price) && sim >= 0.83) return true;
    if (sa.titleNorm && sb.titleNorm && sa.titleNorm === sb.titleNorm && sim >= 0.83) return true;
  }

  if (sa.imageKey && sb.imageKey && sa.imageKey === sb.imageKey && sim >= 0.65) return true;

  return false;
}

function dealScore(deal) {
  let score = 0;
  if (deal.url) score += 3;
  if (deal.image) score += 2;
  if (deal.referencePrice != null || (deal.description && deal.description.length > 4)) score += 1;
  if (deal.source === 'manual') score += 4;
  if (deal.price != null && deal.price > 0) score += 1;
  return score;
}

// Highest score first; newest postedAt breaks ties so actively-updated posts win.
function rankForSurvival(deals) {
  return [...deals].sort((a, b) => {
    const diff = dealScore(b) - dealScore(a);
    if (diff !== 0) return diff;
    const ta = a.postedAt ? new Date(a.postedAt).getTime() : 0;
    const tb = b.postedAt ? new Date(b.postedAt).getTime() : 0;
    return tb - ta;
  });
}

export function dedupeDeals(deals) {
  const list = Array.isArray(deals) ? deals.filter(Boolean) : [];
  if (list.length === 0) return [];

  const ranked = rankForSurvival(list);
  for (const deal of ranked) deal._signals = dealSignals(deal);

  const groups = [];
  for (const deal of ranked) {
    let group = null;
    for (const g of groups) {
      if (isDuplicate(deal, g.rep)) {
        group = g;
        break;
      }
    }
    if (group) {
      group.duplicates += 1;
    } else {
      groups.push({ rep: deal, duplicates: 0 });
    }
  }

  const output = groups.map((g) => g.rep);
  for (const deal of output) delete deal._signals;
  return output;
}