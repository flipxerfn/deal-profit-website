import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaArrowsRotate,
  FaMagnifyingGlass,
  FaTriangleExclamation,
  FaXmark,
} from 'react-icons/fa6';
import DealCard from '../components/DealCard';
import { buttonClass } from '../components/button';
import { CATEGORIES, DEALS as DEMO_DEALS } from '../data/deals';

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
    }
  }, []);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
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

  return (
    <section className="pb-4">
      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand">Deal feed</p>
            {feed.state === DealStates.ready && pill && (
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${pill.cls}`}
              >
                {pill.label}
              </span>
            )}
          </div>
        </div>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Latest deals
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-zinc-400">
          {feed.source === 'discord'
            ? 'Pulled straight from the Deal Profit Discord — price errors, penny deals and profitable listings, filtered and sorted your way.'
            : 'Real finds from the Deal Profit community — price errors, penny deals and profitable listings, filtered and sorted your way.'}
        </p>
      </header>

      {feed.notice && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
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
        </div>
      )}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <FaMagnifyingGlass className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search deals..."
            className="input pl-10"
            aria-label="Search deals"
          />
        </div>
        <select
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
        </select>
        <button
          onClick={() => loadFeed({ background: true })}
          disabled={refreshing}
          className={buttonClass('dark', 'sm:w-auto')}
          aria-label="Refresh deals"
        >
          <FaArrowsRotate className={`text-xs ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {category && (
        <div className="mb-8 flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`chip chip-nowrap ${
                category === cat.id ? 'chip-active' : 'hover:text-white'
              }`}
              aria-pressed={category === cat.id}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {feed.state === DealStates.loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse overflow-hidden rounded-xl border border-white/10 bg-charcoal"
            >
              <div className="aspect-[16/9] bg-charcoal-2" />
              <div className="space-y-3 p-5">
                <div className="h-4 w-3/4 rounded bg-charcoal-2" />
                <div className="h-3 w-full rounded bg-charcoal-2" />
                <div className="h-3 w-2/3 rounded bg-charcoal-2" />
                <div className="h-9 w-full rounded bg-charcoal-2" />
              </div>
            </div>
          ))}
        </div>
      ) : feed.deals.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-charcoal p-10 text-center">
          <p className="text-base font-semibold text-white">No deal posts yet.</p>
          <p className="mt-1 text-sm text-zinc-400">
            Deals will appear here the moment they’re posted in the Discord.
          </p>
          <button
            onClick={() => loadFeed()}
            className={buttonClass('outline', 'mt-5')}
          >
            <FaArrowsRotate className="text-sm" />
            Refresh feed
          </button>
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-charcoal p-10 text-center">
          <p className="text-base font-semibold text-white">
            No deals match{query ? ` “${query}”` : ' these filters'}.
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            Try a different search or {category !== 'all' ? `switch from "${activeLabel}" ` : ''}
            to All.
          </p>
          <button
            onClick={() => {
              setQuery('');
              setCategory('all');
            }}
            className={buttonClass('outline', 'mt-5')}
          >
            <FaXmark className="text-sm" />
            Reset filters
          </button>
        </div>
      )}
    </section>
  );
};

export default Deals;