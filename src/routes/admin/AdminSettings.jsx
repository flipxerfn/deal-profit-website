import { useEffect, useState } from 'react';
import { FaKey, FaTags, FaTriangleExclamation } from 'react-icons/fa6';

const AdminSettings = () => {
  const [token, setToken] = useState('');
  const [categories, setCategories] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [tokenSet, setTokenSet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      const res = await fetch('/api/admin/config', { headers: { Accept: 'application/json' } });
      const body = res.ok ? await res.json().catch(() => null) : null;
      if (body?.config) {
        setTokenSet(body.config.tokenSet === true || body.config.tokenSource === 'panel');
        setCategories((body.config.categories ?? []).join('\n'));
      }
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    load();
    // oxlint-disable-next-line react/set-state-in-effect -- async load
  }, []);

  const onSave = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ token, categories }),
      });
      const body = res.ok ? await res.json().catch(() => null) : null;
      if (res.ok && body?.config) {
        setTokenSet(body.config.tokenSet === true);
        setCategories((body.config.categories ?? []).join('\n'));
        setToken('');
        setMsg('Settings saved. Discord config was refreshed.');
      } else {
        setError('Could not save settings.');
      }
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-white/10 bg-charcoal p-6">
        <div className="mb-4 flex items-center gap-2">
          <FaKey className="text-brand" />
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-white">
            Discord bot token
          </h2>
        </div>
        <p className="mb-4 text-sm text-zinc-400">
          The bot token is stored on the server and is <strong>never shown again</strong> — leave
          the field blank when saving to keep the current token.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={tokenSet ? '•••••••••••• (keep current)' : 'Paste bot token to set'}
            className="input flex-1"
            aria-label="Bot token"
          />
          <span
            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
              tokenSet
                ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                : 'border-zinc-500/40 bg-zinc-500/10 text-zinc-300'
            }`}
          >
            {tokenSet ? 'Token set' : 'Not set'}
          </span>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-charcoal p-6">
        <div className="mb-4 flex items-center gap-2">
          <FaTags className="text-brand" />
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-white">
            Discord category IDs
          </h2>
        </div>
        <p className="mb-4 text-sm text-zinc-400">
          One <span className="font-mono text-zinc-300">snowflake ID</span> per line, or
          comma-separated. Deal text channels are auto-discovered inside these categories.
        </p>
        <textarea
          value={categories}
          onChange={(e) => setCategories(e.target.value)}
          rows={4}
          placeholder={'123456789012345678\n234567890123456789'}
          className="input w-full resize-y font-mono text-sm"
          aria-label="Category IDs"
        />

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-zinc-500">Saving refreshes the deal feed immediately.</div>
          <div className="flex items-center gap-3">
            {msg && <p className="text-xs text-emerald-300">{msg}</p>}
            {error && (
              <p className="flex items-center gap-1.5 text-xs text-red-300">
                <FaTriangleExclamation className="text-xs" />
                {error}
              </p>
            )}
            <button type="submit" form="admin-settings-form" disabled={busy} className="btn btn-primary disabled:opacity-60">
              {busy ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        </div>
      </section>

      {/* form references the save button above */}
      <form id="admin-settings-form" onSubmit={onSave} className="hidden" />

      {!loaded && (
        <p className="text-sm text-zinc-500">Loading configuration…</p>
      )}
      <p className="text-xs text-zinc-600">
        Token and category values you save here override the environment variables. They are
        stored server-side only (Worker KV when bound) and never sent back to the browser.
      </p>
    </div>
  );
};

export default AdminSettings;