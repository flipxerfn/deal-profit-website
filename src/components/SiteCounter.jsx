import { useEffect, useState } from 'react';

// Live site counter, bottom-left: total unique visitors + online now.
// - Total counts each browser once, ever (first-party localStorage id)
// - "Online" is server-side: visitors who pinged within the last 5 minutes

const REFRESH_MS = 30000;

function getVisitorId() {
  try {
    let vid = localStorage.getItem('dp_vid');
    if (!vid) {
      vid =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem('dp_vid', vid);
    }
    return vid;
  } catch {
    // Storage blocked (privacy mode) — don't count, don't render
    return null;
  }
}

const SiteCounter = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const vid = getVisitorId();
    if (!vid) return undefined;
    let alive = true;

    const apply = (data) => {
      if (alive && data && typeof data.total === 'number') {
        setStats({ total: data.total, online: data.online ?? 0 });
      }
    };

    // Count this visit (keepalive so it survives instant redirects to Stripe)
    fetch('/api/stats', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ vid }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then(apply)
      .catch(() => {
        // offline — retry on the regular refresh below
      });

    // Refresh the online count periodically and on tab focus
    const refresh = () => {
      fetch('/api/stats', { headers: { Accept: 'application/json' } })
        .then((res) => (res.ok ? res.json() : null))
        .then(apply)
        .catch(() => {});
    };
    const timer = setInterval(refresh, REFRESH_MS);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);

    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  if (!stats) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-3 left-3 z-40 flex select-none items-center gap-2.5 rounded-full border border-white/10 bg-charcoal/85 px-3.5 py-1.5 text-[11px] font-medium text-zinc-400 shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur"
      aria-label={`${stats.total} total visitors, ${stats.online} online now`}
    >
      <span>
        <span className="text-zinc-500">👁</span>{' '}
        <span className="font-bold text-zinc-200">{stats.total.toLocaleString()}</span>{' '}
        visitors
      </span>
      <span className="h-3 w-px bg-white/10" aria-hidden="true" />
      <span className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <span className="font-bold text-emerald-300">{stats.online}</span> online
      </span>
    </div>
  );
};

export default SiteCounter;
