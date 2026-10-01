// Corner badge: evidence the feed is working, not a census of traffic.
//
// This used to read "96 visitors · 2 online", pinned to the bottom-left of
// every page — including the pages asking for $25. Both numbers hurt:
//
//   "96 visitors" is a lifetime count of distinct first-party identifiers. It
//   is accurate, and on a site with roughly 75 unique visitors the accurate
//   headline is "small".
//
//   "2 online" is a live sample that is near-zero most of the time by the
//   nature of live samples. It cannot read as anything but dead.
//
// Together they are negative social proof in the exact spot where the reader
// is deciding whether to pay you.
//
// What belongs here is evidence the product works. The feed measures 200 finds
// at a 67% median off, and it is computed from the same live endpoint the rest
// of the page uses, so it cannot drift out of date the way a hardcoded
// snapshot does.
//
// Still non-interactive and still out of the tab order: it is a status readout,
// and a tab stop for information nobody can act on is just noise for keyboard
// users.
import { useEffect, useState } from 'react';
import { FaBolt } from 'react-icons/fa6';
import { measurableCatches, discountStats } from '../lib/proof';

const ENDPOINT = '/api/deals';

export default function SiteCounter() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(ENDPOINT, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        const list = Array.isArray(data?.deals) ? data.deals : [];
        if (!alive) return;

        // Only catches with a genuine reference price can carry a discount, so
        // the median is measured over that subset and labelled as such.
        const measured = discountStats(list);
        if (!measured || measured.total < 5) {
          // Too little to say anything true. Rendering "0 finds" would be the
          // same self-own as the old counter.
          setStats(null);
          return;
        }
        setStats({
          finds: list.length,
          median: Math.round(measured.median),
          halfOff: measured.atLeast50,
        });
      } catch {
        if (alive) setStats(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!stats) return null;

  return (
    <div
      className="surface-raised pointer-events-none fixed bottom-3 left-3 z-40 flex select-none items-center gap-2.5 rounded-full border border-white/10 bg-charcoal/90 px-3.5 py-1.5 text-[11px] font-medium text-zinc-300 backdrop-blur"
      aria-label={`${stats.finds} finds posted, median saving ${stats.median} percent`}
    >
      <span className="flex items-center gap-1.5">
        <FaBolt className="h-2.5 w-2.5 text-brand" aria-hidden="true" />
        <span className="font-bold tabular-nums text-white">
          {stats.finds.toLocaleString()}
        </span>{' '}
        finds posted
      </span>
      <span className="h-3 w-px bg-white/10" aria-hidden="true" />
      <span>
        median{' '}
        <span className="font-bold tabular-nums text-brand-2">{stats.median}%</span>{' '}
        off
      </span>
    </div>
  );
}