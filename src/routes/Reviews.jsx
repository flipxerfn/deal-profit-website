import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaQuoteLeft,
  FaRegStar,
  FaStar,
  FaStarHalfStroke,
  FaTriangleExclamation,
  FaXmark,
} from 'react-icons/fa6';
import { buttonClass } from '../components/button';

const RATING_FILTERS = [
  { id: 'all', label: 'All ratings' },
  { id: '5', label: '5 stars' },
  { id: '4', label: '4 stars' },
  { id: '3', label: '3 stars' },
  { id: '2', label: '2 stars' },
  { id: '1', label: '1 star' },
];

const CATEGORY_LABEL = (cat) =>
  cat === 'deals' ? 'Deals' : cat === 'alerts' ? 'Alerts' : cat === 'community' ? 'Community' : null;

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const Stars = ({ rating, size = 'text-base' }) => {
  const out = [];
  for (let i = 1; i <= 5; i += 1) {
    const full = rating >= i;
    const half = !full && rating >= i - 0.5;
    out.push(
      half ? (
        <FaStarHalfStroke key={i} className={`${size} text-brand`} aria-hidden="true" />
      ) : (
        <FaStar key={i} className={`${size} ${full ? 'text-brand' : 'text-zinc-700'}`} aria-hidden="true" />
      )
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
      {out}
    </span>
  );
};

const EMPTY = { name: '', rating: 0, text: '' };

const Reviews = () => {
  const [state, setState] = useState({ loading: true, reviews: [], summary: null, featured: null, error: null });
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [hoverRating, setHoverRating] = useState(0);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formMsg, setFormMsg] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/reviews', { headers: { Accept: 'application/json' } });
      const data = res.ok ? await res.json().catch(() => null) : null;
      if (!data || data.ok === false) throw new Error('unexpected payload');
      setState({
        loading: false,
        reviews: Array.isArray(data.reviews) ? data.reviews : [],
        summary: data.summary ?? null,
        featured: data.featured ?? null,
        error: null,
      });
    } catch {
      setState({ loading: false, reviews: [], summary: null, featured: null, error: 'Could not load reviews right now.' });
    }
  }, []);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- async load
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const rating = Number(filter);
    if (filter === 'all' || !rating) return state.reviews;
    return state.reviews.filter((r) => r.rating === rating);
  }, [state.reviews, filter]);

  const submit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormMsg(null);
    if (form.name.trim().length < 2) {
      setFormError('Please enter a display name (at least 2 characters).');
      return;
    }
    if (form.rating < 1) {
      setFormError('Please pick a star rating.');
      return;
    }
    if (form.text.trim().length < 3) {
      setFormError('Please write a short review (at least 3 characters).');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), rating: form.rating, text: form.text.trim() }),
      });
      if (res.status === 429) {
        setFormError('You have already submitted a few reviews recently — try again later.');
        return;
      }
      if (!res.ok) {
        setFormError('Your review could not be submitted. Please check the fields and try again.');
        return;
      }
      setForm(EMPTY);
      setHoverRating(0);
      setShowForm(false);
      setFormMsg('Thanks! Your review has been submitted and will appear once approved.');
    } catch {
      setFormError('Could not reach the server. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const summary = state.summary ?? { count: 0, average: null };

  return (
    <section className="pb-4">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">Reviews</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          What the Deal Profit community says
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-zinc-400">
          Real feedback from people hunting price errors, penny finds and glitch deals with Deal
          Profit. Every review is vetted before it goes live.
        </p>
      </header>

      {state.summary && state.summary.count > 0 && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-charcoal p-6">
            <div className="flex items-center gap-4">
              <p className="text-4xl font-extrabold tracking-tight text-white">
                {summary.average ?? '—'}
                <span className="text-base font-semibold text-zinc-500"> / 5</span>
              </p>
              <div>
                <Stars rating={summary.average ?? 0} />
                <p className="mt-1 text-xs text-zinc-500">
                  {summary.count} approved {summary.count === 1 ? 'review' : 'reviews'}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-center rounded-xl border border-white/10 bg-charcoal p-6">
            {state.featured ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-2">
                  Featured review
                </p>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-zinc-300">
                  “{state.featured.text}”
                </p>
                <p className="mt-2 text-xs font-semibold text-white">{state.featured.name}</p>
              </>
            ) : (
              <p className="text-sm text-zinc-500">
                {state.summary.count > 0
                  ? 'A featured review will appear here.'
                  : 'No approved reviews yet — be the first to leave one.'}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="input w-full sm:w-auto"
          aria-label="Filter reviews by rating"
        >
          {RATING_FILTERS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
        <button onClick={() => setShowForm((v) => !v)} className={buttonClass('primary')}>
          {showForm ? 'Close' : 'Leave a review'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="mb-8 rounded-xl border border-brand/25 bg-charcoal p-6 shadow-[0_0_30px_rgba(244,63,142,0.08)]">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-white">Leave a review</h2>
          <p className="mt-1 text-sm text-zinc-500">
            No email or personal info needed — just your name, a rating and what you think. Your
            review appears once a moderator approves it.
          </p>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-zinc-400">Display name</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                maxLength={40}
                placeholder="e.g. PennyHunter"
                className="input w-full"
                aria-label="Display name"
              />
            </label>

            <div className="block">
              <span className="mb-1 block text-xs font-semibold text-zinc-400">Your rating</span>
              <div className="flex items-center gap-1 py-2.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onMouseEnter={() => setHoverRating(n)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setForm((f) => ({ ...f, rating: n }))}
                    className="rounded p-0.5 transition-transform hover:scale-110"
                    aria-label={`${n} star${n > 1 ? 's' : ''}`}
                    aria-pressed={form.rating === n}
                  >
                    {n <= (hoverRating || form.rating) ? (
                      <FaStar className="text-xl text-brand" />
                    ) : (
                      <FaRegStar className="text-xl text-zinc-600" />
                    )}
                  </button>
                ))}
                <span className="ml-2 text-sm text-zinc-400">
                  {form.rating ? `${form.rating} / 5` : 'Tap to rate'}
                </span>
              </div>
            </div>
          </div>

          <label className="mt-4 block">
            <span className="mb-1 block text-xs font-semibold text-zinc-400">Your review</span>
            <textarea
              value={form.text}
              onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
              maxLength={1000}
              rows={4}
              placeholder="Share your experience hunting deals with Deal Profit…"
              className="input w-full resize-y"
              aria-label="Review text"
            />
          </label>

          {(formError || formMsg) && (
            <p
              className={`mt-4 flex items-center gap-2 rounded-lg border p-3 text-sm ${
                formError
                  ? 'border-red-400/25 bg-red-400/10 text-red-300'
                  : 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300'
              }`}
            >
              <FaTriangleExclamation className="h-3.5 w-3.5 shrink-0" />
              {formError || formMsg}
            </p>
          )}

          <div className="mt-5 flex justify-end">
            <button type="submit" disabled={busy} className="btn btn-primary disabled:opacity-60">
              {busy ? 'Submitting…' : 'Submit review'}
            </button>
          </div>
        </form>
      )}

      {state.loading ? (
        <div className="grid gap-5 sm:grid-cols-2" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border border-white/10 bg-charcoal p-6">
              <div className="h-4 w-1/3 rounded bg-charcoal-2" />
              <div className="mt-3 h-3 w-full rounded bg-charcoal-2" />
              <div className="mt-2 h-3 w-2/3 rounded bg-charcoal-2" />
            </div>
          ))}
        </div>
      ) : state.error ? (
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-6 text-center">
          <p className="text-sm text-amber-100">{state.error}</p>
          <button onClick={() => load()} className={buttonClass('outline', 'mt-4')}>
            Retry
          </button>
        </div>
      ) : state.reviews.length === 0 || filtered.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-charcoal p-10 text-center">
          <FaQuoteLeft className="mx-auto h-6 w-6 text-brand/40" />
          <p className="mt-3 text-base font-semibold text-white">
            {state.reviews.length === 0 ? 'No reviews yet.' : 'No reviews match this rating.'}
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            {state.reviews.length === 0
              ? 'If you are in the Deal Profit community, leave the first review below.'
              : 'Try another rating filter.'}
          </p>
          {filter !== 'all' && (
            <button onClick={() => setFilter('all')} className={`${buttonClass('outline', 'mt-5')}`}>
              <FaXmark className="text-sm" />
              Show all reviews
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {filtered.map((review) => (
            <article
              key={review.id}
              className={`flex flex-col rounded-xl border bg-charcoal p-6 transition-all duration-200 hover:-translate-y-0.5 ${
                review.featured
                  ? 'border-brand/40 shadow-[0_0_30px_rgba(244,63,142,0.12)]'
                  : 'border-white/10 hover:border-brand/25'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/15 font-bold text-brand-2 ring-1 ring-brand/25">
                    {(review.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{review.name}</p>
                    <p className="text-xs text-zinc-500">{formatDate(review.createdAt)}</p>
                  </div>
                </div>
                <Stars rating={review.rating} size="text-sm" />
              </div>

              {review.featured && (
                <span className="mt-4 w-fit rounded-full border border-brand/40 bg-brand/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-2">
                  Featured
                </span>
              )}

              <p className="mt-3 flex-1 text-sm leading-relaxed text-zinc-300">{review.text}</p>

              <div className="mt-4 flex items-center justify-between">
                <span className="rounded-full bg-black/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-300">
                  {CATEGORY_LABEL(review.category) ?? 'Community'}
                </span>
                <span className="text-xs text-zinc-600">Verified review</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default Reviews;