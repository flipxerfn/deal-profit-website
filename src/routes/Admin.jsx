import { useCallback, useEffect, useState } from 'react';
import {
  FaArrowsRotate,
  FaComment,
  FaGear,
  FaHashtag,
  FaInbox,
  FaLock,
  FaPlug,
  FaRightFromBracket,
  FaServer,
  FaTag,
  FaTriangleExclamation,
} from 'react-icons/fa6';
import dealProfitLogo from '../assets/deal-profit-logo.png';
import AdminSettings from './admin/AdminSettings';
import AdminDeals from './admin/AdminDeals';
import AdminReviews from './admin/AdminReviews';

const timefmt = (iso) => {
  if (!iso) return 'Never';
  const d = new Date(iso);
  return d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
};

const Card = ({ icon, label, value, sub }) => (
  <div className="rounded-xl border border-white/10 bg-charcoal p-5">
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
      {icon}
      {label}
    </div>
    <div className="mt-2 text-2xl font-extrabold tracking-tight text-white">{value}</div>
    {sub && <div className="mt-1 text-xs text-zinc-500">{sub}</div>}
  </div>
);

const Admin = () => {
  const [phase, setPhase] = useState('checking'); // checking | login | dashboard
  const [tab, setTab] = useState('dashboard'); // dashboard | settings | deals | reviews
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/status', { headers: { Accept: 'application/json' } });
      const body = res.ok ? await res.json().catch(() => null) : null;
      if (body && body.authenticated) {
        setData(body);
        setPhase('dashboard');
        return true;
      }
      setPhase('login');
      return false;
    } catch {
      setPhase('login');
      return false;
    }
  }, []);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- loadStatus is async; states update after fetch resolves
    loadStatus();
  }, [loadStatus]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!username || !password) {
      setError('Enter a username and password.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        setPassword('');
        const ok = await loadStatus();
        if (!ok) setError('Login rejected.');
      } else if (res.status === 503) {
        setError('Admin access is not configured on the server yet.');
      } else if (res.status === 429) {
        setError('Too many attempts. Try again later.');
      } else {
        setError('Incorrect username or password.');
      }
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  };

  const onLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {
      // proceed to login state regardless
    }
    setData(null);
    setPhase('login');
  };

  const onSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await fetch('/api/admin/sync', {
        method: 'POST',
        headers: { Accept: 'application/json' },
      });
      const body = res.ok ? await res.json().catch(() => null) : null;
      if (body) setData((prev) => ({ ...prev, discord: body.discord }));
    } finally {
      setSyncing(false);
    }
  };

  if (phase === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(90%_140%_at_50%_0%,rgba(244,63,142,0.1),rgba(139,92,246,0.08)_48%,transparent_78%)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
      </div>
    );
  }

  if (phase === 'login') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(90%_140%_at_50%_0%,rgba(244,63,142,0.1),rgba(139,92,246,0.08)_48%,transparent_78%)] px-4">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-white/10 bg-charcoal p-8 shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
            <div className="mb-6 flex items-center gap-3">
              <img src={dealProfitLogo} alt="" className="h-8 w-auto" />
              <div>
                <p className="text-sm font-extrabold tracking-tight text-white">Deal Profit</p>
                <p className="text-xs text-zinc-500">Private admin access</p>
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label htmlFor="admin-username" className="mb-1 block text-xs font-semibold text-zinc-400">
                  Username
                </label>
                <input
                  id="admin-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input"
                  aria-label="Username"
                />
              </div>
              <div>
                <label htmlFor="admin-password" className="mb-1 block text-xs font-semibold text-zinc-400">
                  Password
                </label>
                <input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  aria-label="Password"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-300">
                  <FaTriangleExclamation className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="btn btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FaLock className="text-xs" />
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const d = data?.discord ?? {};
  const connected = d.connected === true;
  const connPill = connected
    ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
    : d.tokenConfigured
      ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
      : 'border-zinc-500/40 bg-zinc-500/10 text-zinc-300';

  const connText = connected
    ? 'Connected'
    : d.tokenConfigured
      ? 'Not connected'
      : 'Not configured';

  return (
    <div className="min-h-screen bg-[radial-gradient(90%_140%_at_50%_0%,rgba(244,63,142,0.1),rgba(139,92,246,0.08)_48%,transparent_78%)]">
      <header className="border-b border-white/10 bg-night/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1152px] items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <img src={dealProfitLogo} alt="" className="h-7 w-auto" />
            <span className="text-sm font-extrabold tracking-tight text-white">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-zinc-500 sm:inline">
              Signed in as {data?.admin?.username}
            </span>
            <button onClick={onLogout} className="btn btn-outline px-4 py-2 text-xs">
              <FaRightFromBracket className="text-xs" />
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1152px] px-4 py-8 sm:px-6">
        <nav className="mb-8 flex flex-wrap gap-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: <FaPlug className="text-xs" /> },
            { id: 'settings', label: 'Settings', icon: <FaGear className="text-xs" /> },
            { id: 'deals', label: 'Manual deals', icon: <FaInbox className="text-xs" /> },
            { id: 'reviews', label: 'Reviews', icon: <FaComment className="text-xs" /> },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`btn px-4 py-2 text-xs ${
                tab === t.id ? 'btn-primary' : 'btn-outline'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>

        {tab === 'dashboard' && (
          <>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-brand">Feed admin</p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                  Discord deal feed
                </h1>
              </div>
              <button onClick={onSync} disabled={syncing} className="btn btn-primary disabled:opacity-60">
                <FaArrowsRotate className={`text-xs ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing…' : 'Sync now'}
              </button>
            </div>

            <div className="relative mb-6 flex items-center gap-2 rounded-xl border border-white/10 bg-charcoal p-4">
              <FaPlug className="text-sm text-brand" />
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Discord
              </span>
              <span className={`ml-auto rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${connPill}`}>
                {connText}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card
                icon={<FaTag className="text-brand" />}
                label="Categories configured"
                value={d.categoriesConfigured ?? 0}
                sub={
                  (d.categoriesMasked ?? []).length > 0
                    ? (d.categoriesMasked ?? []).join(', ')
                    : 'None configured'
                }
              />
              <Card
                icon={<FaHashtag className="text-brand" />}
                label="Channels discovered"
                value={d.channelsDiscovered ?? 0}
                sub="Text channels inside configured categories"
              />
              <Card
                icon={<FaServer className="text-brand" />}
                label="Deals available"
                value={d.deals ?? 0}
                sub="Currently served on /deals"
              />
              <Card
                icon={<FaArrowsRotate className="text-brand" />}
                label="Last sync"
                value={timefmt(d.lastSync)}
                sub={d.tokenConfigured ? 'Category-based auto discovery' : 'Bot token not set'}
              />
            </div>

            {(d.lastError || d.note) && (
              <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
                <div className="flex items-start gap-2 text-sm text-amber-100">
                  <FaTriangleExclamation className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                  <div>
                    {d.lastError && <p>Last sync error: {d.lastError}</p>}
                    {d.lastErrorAt && (
                      <p className="mt-0.5 text-xs text-amber-400">{timefmt(d.lastErrorAt)}</p>
                    )}
                    {d.note && !d.lastError && <p>{d.note}</p>}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'settings' && <AdminSettings />}
        {tab === 'deals' && <AdminDeals />}
        {tab === 'reviews' && <AdminReviews />}

        <p className="mt-8 text-xs text-zinc-600">
          Sessions expire after 8 hours. The Discord bot token and admin credentials never leave
          the server.
        </p>
      </main>
    </div>
  );
};

export default Admin;