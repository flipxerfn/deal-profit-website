import { useEffect, useState } from 'react';
import {
  FaCheck,
  FaPencil,
  FaRegStar,
  FaStar,
  FaTrash,
  FaTriangleExclamation,
  FaXmark,
} from 'react-icons/fa6';

const timefmt = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
};

const statusPill = {
  pending: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
  approved: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
  rejected: 'border-red-400/40 bg-red-400/10 text-red-300',
};

const Stars = ({ rating, size = 'text-sm' }) => (
  <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <FaStar key={n} className={`${size} ${n <= rating ? 'text-brand' : 'text-zinc-700'}`} aria-hidden="true" />
    ))}
  </span>
);

const ADMIN = { id: null, name: '', rating: 5, text: '', category: '' };

const AdminReviews = () => {
  const [reviews, setReviews] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(ADMIN);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const res = await fetch('/api/admin/reviews', { headers: { Accept: 'application/json' } });
      const body = res.ok ? await res.json().catch(() => null) : null;
      setReviews(Array.isArray(body?.reviews) ? body.reviews : []);
      setError(null);
    } catch {
      setReviews([]);
      setError('Could not load reviews.');
    }
  };

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- async load
    load();
  }, []);

  const patch = async (id, payload) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setError('Could not update the review.');
        return;
      }
      if (editing === id) setEditing(null);
      await load();
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (review) => {
    if (!window.confirm(`Delete the review from "${review.name}"?`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/reviews/${review.id}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });
      if (res.ok) await load();
      else setError('Could not delete the review.');
    } catch {
      setError('Could not reach the server.');
    }
  };

  const startEdit = (review) => {
    setEditing(review.id);
    setForm({
      id: review.id,
      name: review.name ?? '',
      rating: review.rating ?? 5,
      text: review.text ?? '',
      category: review.category ?? '',
    });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    const payload = { name: form.name.trim(), rating: form.rating, text: form.text.trim() };
    if (form.category) payload.category = form.category;
    await patch(form.id, payload);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-white">Reviews</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Approve honest feedback so it appears on <span className="font-mono text-zinc-300">/reviews</span>.
            Unapproved reviews are never shown publicly.
          </p>
        </div>
      </div>

      {error && (
        <p className="flex items-center gap-1.5 rounded-lg border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-300">
          <FaTriangleExclamation className="text-xs" />
          {error}
        </p>
      )}

      {editing && (
        <form onSubmit={saveEdit} className="rounded-xl border border-brand/25 bg-charcoal p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-zinc-200">Edit review</h3>
            <button type="button" onClick={() => setEditing(null)} className="btn btn-outline px-3 py-1 text-xs">
              Cancel
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-zinc-400">Display name</span>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                maxLength={40}
                className="input w-full"
                aria-label="Review display name"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-zinc-400">Rating</span>
              <select
                value={form.rating}
                onChange={(e) => setForm((f) => ({ ...f, rating: Number(e.target.value) }))}
                className="input w-full"
                aria-label="Review rating"
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} star{n > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-zinc-400">Category</span>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="input w-full"
                aria-label="Review category"
              >
                <option value="">None</option>
                <option value="deals">Deals</option>
                <option value="alerts">Alerts</option>
                <option value="community">Community</option>
              </select>
            </label>
          </div>
          <label className="mt-4 block">
            <span className="mb-1 block text-xs font-semibold text-zinc-400">Review text</span>
            <textarea value={form.text} onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))} rows={3} className="input w-full" aria-label="Review text" />
          </label>
          <div className="mt-5 flex justify-end">
            <button type="submit" disabled={busy} className="btn btn-primary disabled:opacity-60">
              {busy ? 'Saving…' : 'Save review'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {reviews === null && <p className="text-sm text-zinc-500">Loading reviews…</p>}
        {reviews !== null && reviews.length === 0 && (
          <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-zinc-500">
            No reviews submitted yet. Submissions appear here as pending.
          </p>
        )}
        {reviews?.map((review) => (
          <div key={review.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="text-sm font-bold text-white">{review.name}</p>
                  <Stars rating={review.rating} />
                  {review.featured && (
                    <span className="rounded-full border border-brand/40 bg-brand/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-2">
                      Featured
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {timefmt(review.createdAt)} · updated {timefmt(review.updatedAt)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusPill[review.status] ?? statusPill.pending}`}>
                  {review.status}
                </span>
                {review.category && (
                  <span className="rounded-full bg-black/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-300">
                    {review.category}
                  </span>
                )}
              </div>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-zinc-300">{review.text}</p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {review.status !== 'approved' && (
                <button
                  onClick={() => patch(review.id, { status: 'approved' })}
                  disabled={busy}
                  className="btn btn-outline border-emerald-400/30 px-3 py-1.5 text-xs text-emerald-300 hover:border-emerald-400/60"
                  aria-label={`Approve review from ${review.name}`}
                >
                  <FaCheck className="text-xs" />
                  Approve
                </button>
              )}
              {review.status === 'approved' && (
                <button
                  onClick={() => patch(review.id, { featured: !review.featured })}
                  disabled={busy}
                  className={`btn btn-outline px-3 py-1.5 text-xs ${review.featured ? 'border-brand/50 text-brand-2 hover:border-brand' : ''}`}
                  aria-label={review.featured ? 'Unfeature review' : 'Feature review'}
                >
                  {review.featured ? <FaStar className="text-xs" /> : <FaRegStar className="text-xs" />}
                  {review.featured ? 'Unfeature' : 'Feature'}
                </button>
              )}
              <button
                onClick={() => startEdit(review)}
                className="btn btn-outline px-3 py-1.5 text-xs"
                aria-label={`Edit review from ${review.name}`}
              >
                <FaPencil className="text-xs" />
                Edit
              </button>
              {review.status !== 'rejected' && (
                <button
                  onClick={() => patch(review.id, { status: 'rejected' })}
                  disabled={busy}
                  className="btn btn-outline border-amber-400/30 px-3 py-1.5 text-xs text-amber-300 hover:border-amber-400/60"
                  aria-label={`Reject review from ${review.name}`}
                >
                  <FaXmark className="text-xs" />
                  Reject
                </button>
              )}
              <button
                onClick={() => remove(review)}
                disabled={busy}
                className="btn btn-outline border-red-400/25 px-3 py-1.5 text-xs text-red-300 hover:border-red-400/50"
                aria-label={`Delete review from ${review.name}`}
              >
                <FaTrash className="text-xs" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminReviews;