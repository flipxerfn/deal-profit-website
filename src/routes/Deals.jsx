import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FaArrowsRotate,
  FaMagnifyingGlass,
  FaTriangleExclamation,
  FaXmark,
  FaBolt,
} from 'react-icons/fa6';
import { motion } from 'framer-motion';
import DealCard from '../components/DealCard';
import SpotlightDeal from '../components/SpotlightDeal';
import { Button, Input, Select, Badge, SkeletonCard } from '../components/ui';
import { CATEGORIES, DEALS as DEMO_DEALS } from '../data/deals';
import { useReducedMotion, motionVariants, getMotionProps } from '../lib/motion';

const SORT_OPTIONS = [
  { id: 'newest', label: 'Sort: Newest' },
  { id: 'price-low', label: 'Sort: Price Low to High' },
  { id: 'price-high', label: 'Sort: Price High to Low' },
  { id: 'discount', label: 'Sort: Discount %' },
];

const REFRESH_INTERVAL_MS = 120_000;

const dealDiscount = (deal) =>
  deal.referencePrice ? (100 - (deal.price / deal.referencePrice) * 100).toFixed(0) : 0;

const timeAgo = (iso) => {
  if (!iso) return null;
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

const prepareLiveDeals = (deals) =>
  deals.map((deal) => {
    const ago = timeAgo(deal.postedAt);
    const meta = ago ? [`Posted ${ago}`, ...(deal.meta ?? [])] : (deal.meta ?? []);
    return { ...deal, meta };
  });

const DealStates = {
  loading: 'loading',
  ready: 'ready',
  error: 'error',
};

const statusPill = {
  discord: { label: 'Live deals', cls: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' },
  demo: { label: 'Sample data', cls: 'border-amber-400/40 bg-amber-400/10 text-amber-300' },
  waiting: { label: 'No deals yet', cls: 'border-zinc-500/40 bg-zinc-500/10 text-zinc-300' },
};

const Deals = () => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('newest');
  const [feed, setFeed] = useState({
    state: DealStates.loading,
    source: 'demo',
    deals: [],
    notice: null,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const searchRef = useRef(null);
  const prefersReduced = useReducedMotion();

  // Keyboard shortcuts: "/" focuses the search box (unless the user is typing
  // somewhere else), "Escape" clears the query while search is focused.
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      const typing =
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable;
      if (e.key === '/' && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === 'Escape' && document.activeElement === searchRef.current) {
        setQuery('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const loadFeed = useCallback(async ({ background = false } = {}) => {
    if (background) setRefreshing(true);
    try {
      const res = await fetch('/api/deals', { headers: { Accept: 'application/json' } });
      const data = res.ok ? await res.json().catch(() => null) : null;
      if (!data || data.ok === false || !Array.isArray(data.deals)) {
        throw new Error('unexpected payload');
      }
      if (!data.configured) {
        setFeed({
          state: DealStates.ready,
          source: 'demo',
          deals: DEMO_DEALS,
          notice:
            'The live Discord feed is not connected yet — showing sample deals. Set DISCORD_BOT_TOKEN and DISCORD_CHANNEL_IDS in Settings → Variables and Secrets to go live.',
        });
      } else if (data.deals.length === 0) {
        setFeed({
          state: DealStates.ready,
          source: 'waiting',
          deals: [],
          notice: 'Waiting for the first deal post — nothing in the feed right now.',
        });
      } else {
        setFeed({
          state: DealStates.ready,
          source: 'discord',
          deals: prepareLiveDeals(data.deals),
          notice: null,
        });
      }
    } catch {
      setFeed({
        state: DealStates.ready,
        source: 'demo',
        deals: DEMO_DEALS,
        notice: 'Could not load the live feed right now — showing sample deals instead.',
      });
    } finally {
      setRefreshing(false);
      setLastRefreshed(new Date().toISOString());
    }
  }, []);

  useEffect(() => {
    loadFeed();
    const timer = setInterval(() => loadFeed({ background: true }), REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [loadFeed]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = feed.deals.filter((deal) => {
      const matchesCategory = category === 'all' || deal.category === category;
      const haystack = [deal.title, deal.description, deal.categoryLabel, deal.badge]
        .join(' ')
        .toLowerCase();
      const matchesQuery = !q || haystack.includes(q);
      return matchesCategory && matchesQuery;
    });

    const sorted = [...list];
    switch (sort) {
      case 'price-low':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        sorted.sort((a, b) => b.price - a.price);
        break;
      case 'discount':
        sorted.sort((a, b) => dealDiscount(b) - dealDiscount(a));
        break;
      default:
        break;
    }
    return sorted;
  }, [feed.deals, query, category, sort]);

  const activeLabel = CATEGORIES.find((c) => c.id === category)?.label;
  const pill = statusPill[feed.source];

  // Per-category counts for the filter chips.
  const counts = useMemo(() => {
    const map = { all: feed.deals.length };
    for (const deal of feed.deals) map[deal.category] = (map[deal.category] ?? 0) + 1;
    return map;
  }, [feed.deals]);

  const spotlight = DEMO_DEALS.find((d) => d.id === 'penny-cpu');
  const showSpotlight =
    spotlight &&
    !query.trim() &&
    category === 'all' &&
    (feed.source !== 'discord' || feed.deals.some((d) => d.id === 'penny-cpu'));

  return (
    <section className="pb-4" aria-labelledby="deals-title">
      <motion.header
        {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
        className="mb-8"
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand">Deal feed</p>
            {feed.state === DealStates.ready && pill && (
              <Badge variant="outline" className={pill.cls}>
                {pill.label}
              </Badge>
            )}
          </div>
        </div>
        <h1 id="deals-title" className="mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Latest deals
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-zinc-400">
          {feed.source === 'discord'
            ? 'Pulled straight from the Deal Profit Discord — price errors, penny deals and profitable listings, filtered and sorted your way.'
            : 'Real finds from the Deal Profit community — price errors, penny deals and profitable listings, filtered and sorted your way.'}
        </p>
      </motion.header>

      {feed.notice && (
        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
          className="mb-6 flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4"
        >
          <FaTriangleExclamation className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <div className="flex-1">
            <p className="text-sm text-amber-100">{feed.notice}</p>
            <button
              onClick={() => loadFeed()}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 hover:text-amber-200"
            >
              <FaArrowsRotate /> Retry now
            </button>
          </div>
        </motion.div>
      )}

      {showSpotlight && <SpotlightDeal deal={spotlight} />}

      <motion.div
        {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
        className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <div className="relative flex-1">
          <FaMagnifyingGlass className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search deals..."
            className="pl-10 pr-12"
            aria-label="Search deals"
            title="Press / to search"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              aria-label="Clear search"
            >
              <FaXmark className="h-4 w-4" />
            </button>
          ) : (
            <span className="kbd pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true">
              /
            </span>
          )}
        </div>
        <Select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="input w-full sm:w-auto"
          aria-label="Sort deals"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </Select>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => loadFeed({ background: true })}
          disabled={refreshing}
          aria-label="Refresh deals"
        >
          <FaArrowsRotate className={`text-xs ${refreshing && !prefersReduced ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </motion.div>

      {feed.deals.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
          <p aria-live="polite">
            Showing{' '}
            <span className="font-semibold text-zinc-300">{filtered.length}</span> of{' '}
            <span className="font-semibold text-zinc-300">{feed.deals.length}</span> deals
            {category !== 'all' && <> in <span className="font-semibold text-zinc-300">{activeLabel}</span></>}
            {query.trim() && <> matching <span className="font-semibold text-zinc-300">"{query.trim()}"</span></>}
          </p>
          {lastRefreshed && feed.state === DealStates.ready && (
            <>
              <span className="h-1 w-1 rounded-full bg-brand/60" aria-hidden="true" />
              <p>
                Updated {timeAgo(lastRefreshed)} · auto-refreshes every 2 min
              </p>
            </>
          )}
        </div>
      )}

      {category && (
        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
          className="mb-8 flex flex-wrap gap-2"
        >
          {CATEGORIES.map((cat) => {
            const isActive = category === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`chip chip-nowrap relative ${isActive ? 'text-brand' : 'hover:text-white'}`}
                aria-pressed={isActive}
              >
                {isActive && (
                  <motion.span
                    layoutId="deal-cat-pill"
                    className="absolute inset-0 rounded-full border border-brand/60 bg-brand/15"
                    transition={{ duration: prefersReduced ? 0 : 0.25, ease: 'easeOut' }}
                    aria-hidden="true"
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  {cat.label}
                  {counts[cat.id] != null && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                        isActive ? 'bg-brand/25 text-brand-2' : 'bg-white/5 text-zinc-400'
                      }`}
                    >
                      {counts[cat.id]}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </motion.div>
      )}

      {feed.state === DealStates.loading ? (
        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.staggerContainer)}
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          aria-busy="true"
        >
          {[0, 1, 2].map((i) => (
            <motion.div key={i} {...getMotionProps(prefersReduced, motionVariants.staggerItem)}>
              <SkeletonCard />
            </motion.div>
          ))}
        </motion.div>
      ) : feed.deals.length === 0 ? (
        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
          className="rounded-xl border border-white/10 bg-charcoal p-10 text-center"
        >
          <FaBolt className="mx-auto h-8 w-8 text-brand/50" aria-hidden="true" />
          <p className="mt-3 text-base font-semibold text-white">No deal posts yet.</p>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-zinc-400">
            Deals will appear here the moment they're posted in the Discord. We refresh the feed
            automatically every two minutes.
          </p>
          <Button variant="outline" size="sm" className="mt-5" onClick={() => loadFeed()}>
            <FaArrowsRotate className="text-sm" />
            Refresh feed
          </Button>
        </motion.div>
      ) : filtered.length > 0 ? (
        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.staggerContainer)}
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filtered.map((deal) => (
            <motion.div key={deal.id} {...getMotionProps(prefersReduced, motionVariants.staggerItem)}>
              <DealCard deal={deal} />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
          className="rounded-xl border border-white/10 bg-charcoal p-10 text-center"
        >
          <FaMagnifyingGlass className="mx-auto h-8 w-8 text-brand/40" aria-hidden="true" />
          <p className="mt-3 text-base font-semibold text-white">
            No deals match{query ? ` "${query}"` : ' these filters'}.
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-zinc-400">
            Try a different search or {category !== 'all' ? `switch from "${activeLabel}" ` : ''}to
            All.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-5"
            onClick={() => {
              setQuery('');
              setCategory('all');
            }}
          >
            <FaXmark className="text-sm" />
            Reset filters
          </Button>
        </motion.div>
      )}
    </section>
  );
};

export default Deals;