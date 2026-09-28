// Shared "is this real?" helpers: honest source attribution for deal cards.
// A deal is only presented as verifiable when it actually carries a source
// link to a retailer listing — never faked.
export const hostOf = (url) => {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return host || null;
  } catch {
    return null;
  }
};

export const isSourceLink = (url) => {
  const host = hostOf(url);
  if (!host) return false;
  // Discord invites aren't evidence of a deal
  return !/(^|\.)discord\.(gg|com|me)$/i.test(host);
};

export const timeAgo = (value) => {
  const ts = typeof value === 'number' ? value : Date.parse(String(value ?? ''));
  if (!Number.isFinite(ts)) return null;
  const secs = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
};
