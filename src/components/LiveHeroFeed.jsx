// The live feed in the hero.
//
// This replaces a "Recent finds — examples" ticker that was fed by src/data/
// deals.js — the archived demo set. The most prominent thing on the page was
// captioned "example post", which is precisely the impression the credibility
// work has been trying to remove. If someone lands and the hero is showing
// labelled fake data, nothing else on the page gets read.
//
// So the hero now shows the real feed: real titles, real prices, and a real
// "caught 4m ago" derived from postedAt. That is the whole retention pitch —
// proof that the thing is alive, on a page the visitor is already looking at.
//
// Falls back to the archived set if the feed is unreachable, and says so. A
// silent fallback would put the fake data back without the reader knowing.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBolt, FaArrowRight } from 'react-icons/fa';
import { DEALS as FALLBACK } from '../data/deals';
import { timeAgo, isSourceLink } from '../lib/dealSource';
import { useReducedMotion } from '../lib/motion';

const ENDPOINT = '/api/deals';
const ROTATE_MS = 5000;
const VISIBLE = 4;

export default function LiveHeroFeed() {
  const prefersReduced = useReducedMotion();
  const [deals, setDeals] = useState(null);
  const [live, setLive] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(ENDPOINT, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        const list = Array.isArray(data?.deals) ? data.deals : [];
        // `alive` is a plain binding, not a ref — `alive.current` is always
        // undefined, which made this return early on every run.
        if (!alive) return;
        // Prefer posts that carry a listing a reader can open.
        const verified = list.filter((d) => isSourceLink(d?.url ?? d?.cta?.href));
        setDeals((verified.length >= VISIBLE ? verified : list).slice(0, 20));
        setLive(list.length > 0);
      } catch {
        if (alive) setDeals(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const rows = deals?.length
    ? deals
    : FALLBACK.map((d) => ({ ...d, url: d.cta?.href ?? null, postedAt: null }));

  useEffect(() => {
    if (prefersReduced || !deals?.length) return undefined;
    const t = setInterval(() => setIndex((i) => (i + 1) % rows.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [prefersReduced, deals, rows.length]);

  const newest = rows[0]?.postedAt ? timeAgo(rows[0].postedAt) : null;
  const shown = rows.slice(index, index + VISIBLE);
  const wrap = shown.length < VISIBLE ? [...shown, ...rows.slice(0, VISIBLE - shown.length)] : shown;

  return (
    <div className="border-t border-white/10 px-2 pb-2 pt-3">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
          <span className="relative flex h-1.5 w-1.5">
            {live ? (
              <>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
              </>
            ) : (
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-zinc-500" />
            )}
          </span>
          {live ? 'Caught just now' : 'Examples'}
        </p>
        {newest && <p className="text-[10px] text-zinc-500">newest {newest}</p>}
      </div>

      <div className="space-y-1.5">
        <AnimatePresence initial={false} mode="popLayout">
          {wrap.map((deal, i) => (
            <motion.div
              key={`${deal.id}-${i}`}
              initial={prefersReduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReduced ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: 'easeOut', delay: i * 0.03 }}
              className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2 transition-colors hover:bg-white/[0.06]"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">{deal.title}</p>
                <p className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                  {deal.retailer ?? deal.categoryLabel}
                  {deal.postedAt ? (
                    <>
                      <span aria-hidden="true">·</span>
                      caught {timeAgo(deal.postedAt)}
                    </>
                  ) : (
                    <>
                      <span aria-hidden="true">·</span>
                      archived example
                    </>
                  )}
                </p>
              </div>
              {typeof deal.price === 'number' && (
                <span className="shrink-0 text-xs font-bold text-brand">
                  {deal.displayPrice ?? `$${deal.price.toFixed(2)}`}
                </span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 px-1">
        <p className="text-[10px] text-zinc-600">
          {live ? 'Pulled live from Discord' : 'Live feed unreachable'}
        </p>
        <Link
          to="/deals"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
        >
          <FaBolt className="h-2.5 w-2.5" aria-hidden="true" />
          All finds
          <FaArrowRight className="h-2.5 w-2.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
