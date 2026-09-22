import { useEffect, useState } from 'react';
import {
  FaKey,
  FaTags,
  FaCheck,
  FaTriangleExclamation,
  FaSpinner,
  FaClock,
} from 'react-icons/fa6';

const AdminSettings = () => {
  const [token, setToken] = useState('');
  const [categories, setCategories] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [tokenSet, setTokenSet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);

  const load = async () => {
    try {
      const res = await fetch('/api/admin/config', { headers: { Accept: 'application/json' } });
      const body = res.ok ? await res.json().catch(() => null) : null;
      if (body?.config) {
        setTokenSet(body.config.tokenSet === true || body.config.tokenSource === 'panel');
        setCategories((body.config.categories ?? []).join('\n'));
        if (body.config.updatedAt) {
          setLastSaved(body.config.updatedAt);
        }
      }
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    load();
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
        setLastSaved(body.config.updatedAt);
        setMsg('Discord configuration saved successfully.');
      } else {
        setError('Could not save Discord configuration. Please try again.');
      }
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  };

  const timefmt = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now - d;
    if (diffMs < 60_000) return 'Just now';
    if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
    return d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  };

  return (
    <div className="space-y-6">
      {/* Discord Configuration */}
      <section className="card relative overflow-hidden p-6">
        <div className="hairline-gradient absolute inset-x-0 top-0 h-px" aria-hidden="true" />
        <div
          className="absolute inset-0 bg-[radial-gradient(90%_120%_at_20%_0%,rgba(244,63,94,0.08),transparent_70%)]"
          aria-hidden="true"
        />
        <div className="relative mb-5 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5865F2]/15 text-[#8b95f7]">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-white">
              Discord Configuration
            </h2>
            <p className="text-xs text-zinc-500">
              Configure the Discord bot token and category IDs for the deal feed.
            </p>
          </div>
        </div>

        <form onSubmit={onSave} className="relative space-y-5">
          {/* Bot Token */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <FaKey className="text-brand" />
              Discord Bot Token
            </label>
            <div className="flex items-center gap-3">
              <input
                type="password"
                autoComplete="off"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={
                  tokenSet
                    ? '•••••••••••••••• (enter new token to replace)'
                    : 'Paste bot token here'
                }
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
                {tokenSet ? (
                  <span className="flex items-center gap-1">
                    <FaCheck className="text-[10px]" /> Saved
                  </span>
                ) : (
                  'Not configured'
                )}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-zinc-500">
              The bot token is stored server-side and never shown again. Leave blank to keep the
              current token.
            </p>
          </div>

          {/* Category IDs */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <FaTags className="text-brand" />
              Discord Category IDs
            </label>
            <textarea
              value={categories}
              onChange={(e) => setCategories(e.target.value)}
              rows={4}
              placeholder={'123456789012345678\n234567890123456789'}
              className="input w-full resize-y font-mono text-sm"
              aria-label="Category IDs"
            />
            <p className="mt-1.5 text-xs text-zinc-500">
              One snowflake ID per line, or comma-separated. Deal text channels are auto-discovered
              inside these categories.
            </p>
          </div>

          {/* Save button and status */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-5">
            <div className="flex items-center gap-3 text-xs text-zinc-500">
              {lastSaved && (
                <span className="flex items-center gap-1.5">
                  <FaClock className="text-[10px]" />
                  Last saved: {timefmt(lastSaved)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {msg && (
                <p className="flex items-center gap-1.5 text-xs text-emerald-300">
                  <FaCheck className="text-[10px]" />
                  {msg}
                </p>
              )}
              {error && (
                <p className="flex items-center gap-1.5 text-xs text-red-300">
                  <FaTriangleExclamation className="text-[10px]" />
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={busy}
                className="btn btn-primary disabled:opacity-60"
              >
                {busy ? (
                  <>
                    <FaSpinner className="animate-spin text-xs" />
                    Saving…
                  </>
                ) : (
                  'Save Discord Configuration'
                )}
              </button>
            </div>
          </div>
        </form>
      </section>

      {!loaded && (
        <p className="text-sm text-zinc-500">Loading configuration…</p>
      )}

      <p className="text-xs text-zinc-600">
        Token and category values you save here override the environment variables. They are
        stored server-side only (persistent Worker storage) and never sent back to the browser.
      </p>
    </div>
  );
};

export default AdminSettings;
