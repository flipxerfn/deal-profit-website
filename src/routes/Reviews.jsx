import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaCircleCheck,
  FaQuoteLeft,
  FaRegStar,
  FaStar,
  FaStarHalfStroke,
  FaTriangleExclamation,
  FaXmark,
} from 'react-icons/fa6';
import { motion } from 'framer-motion';
import { Button, Input, Textarea, Select, Badge, Avatar, Label } from '../components/ui';
import { useReducedMotion, motionVariants, getMotionProps } from '../lib/motion';

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

const Stars = ({ rating, size = 'text-base', interactive = false, onChange, value, onMouseLeave, onMouseEnter }) => {
  const out = [];
  for (let i = 1; i <= 5; i += 1) {
    const full = rating >= i;
    const half = !full && rating >= i - 0.5;
    out.push(
      interactive ? (
        <button
          key={i}
          type="button"
          onMouseEnter={() => onMouseEnter(i)}
          onMouseLeave={onMouseLeave}
          onClick={() => onChange(i)}
          className="rounded p-0.5 transition-transform hover:scale-110"
          aria-label={`${i} star${i > 1 ? 's' : ''}`}
          aria-pressed={value === i}
        >
          {i <= (value || rating) ? (
            <FaStar className="text-xl text-brand" />
          ) : (
            <FaRegStar className="text-xl text-zinc-600" />
          )}
        </button>
      ) : half ? (
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
  const prefersReduced = useReducedMotion();

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
    <section className="pb-4" aria-labelledby="reviews-title">
      <motion.header
        {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
        className="mb-8"
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">Reviews</p>
        <h1 id="reviews-title" className="mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          What the Deal Profit community says
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-zinc-400">
          Real feedback from people hunting price errors, penny finds and glitch deals with Deal
          Profit. Every review is vetted before it goes live.
        </p>
      </motion.header>

      {state.summary && state.summary.count > 0 && (
        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.staggerContainer)}
          className="mb-8 grid gap-4 sm:grid-cols-2"
        >
          <motion.div
            {...getMotionProps(prefersReduced, motionVariants.staggerItem)}
            className="card p-6"
          >
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-4xl font-extrabold tracking-tight text-white">
                  {summary.average ?? '—'}
                  <span className="text-base font-semibold text-zinc-500"> / 5</span>
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {summary.count} approved {summary.count === 1 ? 'review' : 'reviews'}
                </p>
              </div>
              <div className="text-right">
                <Stars rating={summary.average ?? 0} size="text-3xl" />
              </div>
            </div>
          </motion.div>
          <motion.div
            {...getMotionProps(prefersReduced, motionVariants.staggerItem)}
            className="card p-6"
          >
            {state.featured ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-2">
                  Featured review
                </p>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-zinc-300">
                  "{state.featured.text}"
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
          </motion.div>
        </motion.div>
      )}

      <motion.div
        {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
        className="mb-8 flex flex-wrap items-center justify-between gap-3"
      >
        <Select
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
        </Select>
        <Button variant="primary" size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Close' : 'Leave a review'}
        </Button>
      </motion.div>

      {formMsg && !showForm && (
        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
          role="status"
          className="mb-8 flex items-center gap-2 rounded-lg border border-emerald-400/25 bg-emerald-400/10 p-3 text-sm text-emerald-300"
        >
          <FaCircleCheck className="h-4 w-4 shrink-0" />
          {formMsg}
        </motion.div>
      )}

      {showForm && (
        <motion.form
          {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
          onSubmit={submit}
          className="mb-8 card border-brand/25 shadow-[0_0_30px_rgba(244,63,94,0.08)] p-6"
        >
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-white">Leave a review</h2>
          <p className="mt-1 text-sm text-zinc-500">
            No email or personal info needed — just your name, a rating and what you think. Your
            review appears once a moderator approves it.
          </p>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="block">
              <Label>Display name</Label>
              <Input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                maxLength={40}
                placeholder="e.g. PennyHunter"
                aria-label="Display name"
              />
            </label>

            <div className="block">
              <Label>Your rating</Label>
              <div className="flex items-center gap-1 py-2.5">
                <Stars
                  interactive
                  rating={form.rating}
                  value={hoverRating || form.rating}
                  onChange={(n) => setForm((f) => ({ ...f, rating: n }))}
                  onMouseEnter={setHoverRating}
                  onMouseLeave={() => setHoverRating(0)}
                />
                <span className="ml-2 text-sm text-zinc-400">
                  {form.rating ? `${form.rating} / 5` : 'Tap to rate'}
                </span>
              </div>
            </div>
          </div>

          <label className="mt-4 block">
            <Label>Your review</Label>
            <Textarea
              value={form.text}
              onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
              maxLength={1000}
              rows={4}
              placeholder="Share your experience hunting deals with Deal Profit…"
              aria-label="Review text"
            />
          </label>

          {(formError || formMsg) && (
            <motion.p
              {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
              className={`mt-4 flex items-center gap-2 rounded-lg border p-3 text-sm ${
                formError
                  ? 'border-red-400/25 bg-red-400/10 text-red-300'
                  : 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300'
              }`}
            >
              <FaTriangleExclamation className="h-3.5 w-3.5 shrink-0" />
              {formError || formMsg}
            </motion.p>
          )}

          <div className="mt-5 flex justify-end">
            <Button type="submit" size="md" disabled={busy}>
              {busy ? 'Submitting…' : 'Submit review'}
            </Button>
          </div>
        </motion.form>
      )}

      {state.loading ? (
        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.staggerContainer)}
          className="grid gap-5 sm:grid-cols-2"
          aria-busy="true"
        >
          {[0, 1].map((i) => (
            <motion.div
              key={i}
              {...getMotionProps(prefersReduced, motionVariants.staggerItem)}
              className="animate-pulse card p-6"
            >
              <div className="h-4 w-1/3 rounded bg-charcoal-2" />
              <div className="mt-3 h-3 w-full rounded bg-charcoal-2" />
              <div className="mt-2 h-3 w-2/3 rounded bg-charcoal-2" />
            </motion.div>
          ))}
        </motion.div>
      ) : state.error ? (
        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
          className="card border-amber-400/20 bg-amber-400/5 p-6 text-center"
        >
          <p className="text-sm text-amber-100">{state.error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={load}>
            Retry
          </Button>
        </motion.div>
      ) : state.reviews.length === 0 || filtered.length === 0 ? (
        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
          className="card p-10 text-center"
        >
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
            <Button variant="outline" size="sm" className="mt-5" onClick={() => setFilter('all')}>
              <FaXmark className="text-sm" />
              Show all reviews
            </Button>
          )}
        </motion.div>
      ) : (
        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.staggerContainer)}
          className="grid gap-5 sm:grid-cols-2"
        >
          {filtered.map((review) => (
            <motion.article
              key={review.id}
              {...getMotionProps(prefersReduced, motionVariants.staggerItem)}
              className={`card p-6 transition-all duration-200 hover:-translate-y-0.5 ${
                review.featured
                  ? 'border-brand/40 shadow-[0_0_30px_rgba(244,63,94,0.12)]'
                  : 'hover:border-brand/25'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar size="sm" children={(review.name || '?').charAt(0).toUpperCase()} />
                  <div>
                    <p className="text-sm font-bold text-white">{review.name}</p>
                    <p className="text-xs text-zinc-500">{formatDate(review.createdAt)}</p>
                  </div>
                </div>
                <Stars rating={review.rating} size="text-sm" />
              </div>

              {review.featured && (
                <Badge variant="brand" className="mt-4 w-fit">
                  Featured
                </Badge>
              )}

              <p className="mt-3 flex-1 text-sm leading-relaxed text-zinc-300">{review.text}</p>

              <div className="mt-4 flex items-center justify-between">
                <Badge
                  variant={review.category === 'deals' ? 'brand' : review.category === 'alerts' ? 'glow' : 'zinc'}
                  className="text-[10px]"
                >
                  {CATEGORY_LABEL(review.category) ?? 'Community'}
                </Badge>
                <Badge variant="outline" className="text-[10px] text-zinc-600">
                  Verified review
                </Badge>
              </div>
            </motion.article>
          ))}
        </motion.div>
      )}
    </section>
  );
};

export default Reviews;