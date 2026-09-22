import { useEffect, useState } from 'react';
import {
  FaBolt,
  FaPlus,
  FaPencil,
  FaTrash,
  FaTriangleExclamation,
} from 'react-icons/fa6';

const EMPTY = {
  title: '',
  url: '',
  image: '',
  price: '',
  originalPrice: '',
  category: 'other',
  shop: '',
  description: '',
  note: '',
};

const AdminDeals = () => {
  const [deals, setDeals] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      const res = await fetch('/api/admin/deals', { headers: { Accept: 'application/json' } });
      const body = res.ok ? await res.json().catch(() => null) : null;
      setDeals(Array.isArray(body?.deals) ? body.deals : []);
    } catch {
      setDeals([]);
    }
  };

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- async load; state updates after fetch resolves
    load();
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const startCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setError(null);
    setShowForm(true);
  };

  const startEdit = (deal) => {
    setEditing(deal.id);
    setForm({
      title: deal.title ?? '',
      url: deal.url ?? '',
      image: deal.image ?? '',
      price: deal.price != null ? String(deal.price) : '',
      originalPrice: deal.referencePrice != null ? String(deal.referencePrice) : '',
      category: deal.category ?? 'other',
      shop: deal.shop ?? '',
      description: deal.description ?? '',
      note: deal.note ?? '',
    });
    setError(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(editing ? `/api/admin/deals/${editing}` : '/api/admin/deals', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(form),
      });
      const body = res.ok ? await res.json().catch(() => null) : null;
      if (!res.ok) {
        setError(body?.error === 'title_required' ? 'A title is required.' : body?.error === 'price_required' ? 'A price is required.' : 'Could not save the deal.');
        return;
      }
      setShowForm(false);
      setEditing(null);
      setForm(EMPTY);
      await load();
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (deal) => {
    if (!window.confirm(`Delete "${deal.title}"?`)) return;
    try {
      const res = await fetch(`/api/admin/deals/${deal.id}`, { method: 'DELETE', headers: { Accept: 'application/json' } });
      if (res.ok) await load();
    } catch {
      setError('Could not delete the deal.');
    }
  };

  const field = (key, label, placeholder, extra = {}) => (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-zinc-400">{label}</span>
      <input
        value={form[key]}
        onChange={set(key)}
        placeholder={placeholder}
        className="input w-full"
        {...extra}
      />
    </label>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-white">Manual deals</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Deals you enter here are served on <span className="font-mono text-zinc-300">/deals</span>{' '}
            alongside the Discord feed.
          </p>
        </div>
        <button onClick={startCreate} className="btn btn-primary">
          <FaPlus className="text-xs" />
          New deal
        </button>
      </div>

      {error && (
        <p className="flex items-center gap-1.5 rounded-lg border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-300">
          <FaTriangleExclamation className="text-xs" />
          {error}
        </p>
      )}

      {showForm && (
        <form onSubmit={onSubmit} className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-zinc-200">
              {editing ? 'Edit deal' : 'New deal'}
            </h3>
            <button type="button" onClick={() => setShowForm(false)} className="btn btn-outline px-3 py-1 text-xs">
              Cancel
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {field('title', 'Title *', 'RTX 5090 — $29.99 at Best Buy')}
            {field('url', 'Link (optional)', 'https://example.com/item')}
            {field('image', 'Image URL (optional)', 'https://cdn.example/img.png')}
            <div className="grid grid-cols-2 gap-4">
              {field('price', 'Price *', '29.99')}
              {field('originalPrice', 'Original price', '99.99')}
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-zinc-400">Category</span>
              <select value={form.category} onChange={set('category')} className="input w-full">
                <option value="other">Other</option>
                <option value="tech">Tech</option>
                <option value="penny">Penny deals</option>
              </select>
            </label>
            {field('shop', 'Shop (optional)', 'Best Buy')}
          </div>

          <div className="mt-4 grid gap-4">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-zinc-400">Description (optional)</span>
              <textarea value={form.description} onChange={set('description')} rows={3} className="input w-full" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-zinc-400">Note (optional, shown to editors only)</span>
              <textarea value={form.note} onChange={set('note')} rows={2} className="input w-full" />
            </label>
          </div>

          <div className="mt-5 flex justify-end">
            <button type="submit" disabled={busy} className="btn btn-primary disabled:opacity-60">
              {busy ? 'Saving…' : editing ? 'Save changes' : 'Create deal'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {deals === null && <p className="text-sm text-zinc-500">Loading deals…</p>}
        {deals !== null && deals.length === 0 && !showForm && (
          <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-zinc-500">
            No manual deals yet. Use “New deal” to add one.
          </p>
        )}
        {deals?.map((deal) => (
          <div key={deal.id} className="card flex items-center gap-4 p-4">
            {deal.image ? (
              <img
                src={deal.image}
                alt=""
                referrerPolicy="no-referrer"
                className="h-14 w-20 shrink-0 rounded-lg object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-lg bg-charcoal-2">
                <FaBolt className="text-lg text-brand-2" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{deal.title}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-zinc-500">
                <span className="font-semibold text-brand">
                  ${(deal.price ?? 0).toFixed(2)}
                  {deal.referencePrice != null && (
                    <span className="ml-1.5 font-normal text-zinc-500 line-through">
                      ${deal.referencePrice.toFixed(2)}
                    </span>
                  )}
                </span>
                <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-300">
                  {deal.categoryLabel}
                </span>
                {deal.shop && <span>{deal.shop}</span>}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button onClick={() => startEdit(deal)} className="btn btn-outline px-3 py-1.5 text-xs" aria-label={`Edit ${deal.title}`}>
                <FaPencil className="text-xs" />
                Edit
              </button>
              <button
                onClick={() => onDelete(deal)}
                className="btn btn-outline border-red-400/25 px-3 py-1.5 text-xs text-red-300 hover:border-red-400/50"
                aria-label={`Delete ${deal.title}`}
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

export default AdminDeals;