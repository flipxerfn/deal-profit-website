// How much of the feed actually links to a listing — measured, not remembered.
//
// The site claims its posts link to real listings, and that claim is doing real
// work: it is the reason the feed can be trusted at all. It was a constant
// written once into a data file:
//
//   postsWithSourceLink: 197 / dealsInFeed: 200  ->  99%
//
// Nine posts have no retailer URL at all. Their only link is a Discord channel
// — titles include "FREE SHACKBURGER AT SHAKE SHACK" and one that is literally
// "🚨 CHECK". Counting those as a link to a listing overstates it by three
// points.
//
// Two further problems, and they are the reason this is computed:
//
//   The figure was a snapshot taken on a fixed date against a feed that
//   changes every five minutes, so it drifted silently and continuously.
//
//   Nothing could contradict it. It sat in a data file next to the copy, so no
//   test could compare the claim against the feed and no reviewer could check
//   it either.
//
// The rule is deliberately the same one the deal cards use — isSourceLink,
// which already excludes Discord hosts. One rule in two places means the
// headline and the cards cannot disagree with each other.
//
// Returns null when there is nothing to measure, so the caller renders nothing
// rather than falling back to a cached number. Falling back is precisely how
// a claim goes stale.
import { useEffect, useState } from 'react';
import { isSourceLink } from './dealSource';

const ENDPOINT = '/api/deals';

/**
 * @returns {{pct:number, linked:number, total:number}|null}
 */
export function useLinkability() {
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

        const total = list.length;
        if (total < 10) {
          setStats(null);
          return;
        }

        // The same predicate the cards use, so "Check the live listing" and
        // the headline percentage are always describing the same set of posts.
        const linked = list.filter((d) => isSourceLink(d?.url ?? d?.cta?.href)).length;

        setStats({
          pct: Math.round((linked / total) * 100),
          linked,
          total,
        });
      } catch {
        if (alive) setStats(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return stats;
}