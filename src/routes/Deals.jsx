import { useMemo, useState } from 'react';
import { FaMagnifyingGlass, FaXmark } from 'react-icons/fa6';
import DealCard from '../components/DealCard';
import { buttonClass } from '../components/button';
import { CATEGORIES, DEALS } from '../data/deals';

const SORT_OPTIONS = [
  { id: 'newest', label: 'Sort: Newest' },
  { id: 'price-low', label: 'Sort: Price Low to High' },
  { id: 'price-high', label: 'Sort: Price High to Low' },
  { id: 'discount', label: 'Sort: Discount %' },
];

const dealDiscount = (deal) =>
  deal.referencePrice ? (100 - (deal.price / deal.referencePrice) * 100).toFixed(0) : 0;

const Deals = () => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('newest');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = DEALS.filter((deal) => {
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
  }, [query, category, sort]);

  const activeLabel = CATEGORIES.find((c) => c.id === category)?.label;

  return (
    <section className="pb-4">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">Deal feed</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Latest deals
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-zinc-400">
          Real finds from the Deal Profit community — price errors, penny deals and profitable
          listings, filtered and sorted your way.
        </p>
      </header>

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
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`chip chip-nowrap ${
              category === cat.id ? 'chip-active' : 'hover:text-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-charcoal p-10 text-center">
          <p className="text-base font-semibold text-white">No deals match “{query}”.</p>
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