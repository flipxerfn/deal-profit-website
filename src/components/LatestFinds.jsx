// The "Latest finds" band on the home page.
//
// This rendered a section headed "LIVE FINDS" whose cards each said "Archived
// example" and "EXAMPLE — NO LIVE LISTING". The header made a claim the content
// immediately contradicted, three screens below a hero that was already fixed
// for exactly this reason. Two archived cards cannot be the latest finds.
//
// So this pulls the same live feed the hero does and shows real, recent posts
// with real ages. The eyebrow only says "Live finds" when the feed is actually
// live, and says so plainly when it isn't rather than dressing examples up as
// them. DealCard already renders the "Archived example" state honestly, so the
// fallback stays truthful — it just is no longer presented as the latest.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaArrowRight, FaBolt } from 'react-icons/fa';
import DealCard from './DealCard';
import { DEALS as FALLBACK } from '../data/deals';
import { isSourceLink } from '../lib/dealSource';
import { useReducedMotion, motionVariants, getMotionProps, useScrollReveal } from '../lib/motion';

const ENDPOINT = '/api/deals';
const COUNT = 4;

export default function LatestFinds() {
  const prefersReduced = useReducedMotion();
  const reveal = useScrollReveal();
  const [deals, setDeals] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(ENDPOINT, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        const list = Array.isArray(data?.deals) ? data.deals : [];
        if (!alive) return;
        // A find a reader cannot open is worse than no find here, since the
        // whole point of the band is "here is something you can go and buy".
        const usable = list.filter((d) => isSourceLink(d?.url ?? d?.cta?.href));
        setDeals((usable.length >= COUNT ? usable : list).slice(0, COUNT));
      } catch {
        if (alive) setDeals(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const live = Boolean(deals?.length);
  const shown = live ? deals : FALLBACK.slice(0, 2);

  return (
    <section className="band-full band-bleed tint-glow relative pb-4" aria-labelledby="finds-title">
      <motion.div
        ref={reveal.ref}
        {...getMotionProps(
          prefersReduced,
          reveal.isVisible ? motionVariants.scrollReveal : { initial: false, animate: { opacity: 1, y: 0 } }
        )}
        className="mx-auto w-full max-w-[1800px] px-4 py-8 sm:px-6 md:py-12 lg:px-8"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-brand/20 to-transparent"
          aria-hidden="true"
        />
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {/* The eyebrow must not claim "live" while the cards below are the
                archived set. Same rule the hero follows. */}
            <p className="text-xs font-semibold uppercase tracking-wider text-brand">
              {live ? 'Live finds' : 'Examples'}
            </p>
            <h2 id="finds-title" className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              {live ? 'Latest finds' : 'What a find looks like'}
            </h2>
            {live && (
              <p className="mt-1.5 text-xs text-zinc-500">
                Posted as they were caught — ages are live, not estimates.
              </p>
            )}
          </div>
          <Link
            to="/deals"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-400 transition-colors hover:text-brand"
          >
            View all deals
            <FaArrowRight className="text-xs" />
          </Link>
        </div>

        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.staggerContainer)}
          className="grid gap-5 sm:grid-cols-2"
        >
          {shown.map((deal) => (
            <motion.div
              key={deal.id}
              className="min-w-0"
              {...getMotionProps(prefersReduced, motionVariants.staggerItem)}
            >
              <DealCard deal={deal} spotlight={deal.id === 'penny-cpu'} />
            </motion.div>
          ))}
        </motion.div>

        {!live && (
          <p className="mt-6 flex items-center gap-2 text-sm text-zinc-500">
            <FaBolt className="h-3 w-3 shrink-0 text-brand" aria-hidden="true" />
            Live feed unavailable right now — these are worked examples.
          </p>
        )}
      </motion.div>
    </section>
  );
}
