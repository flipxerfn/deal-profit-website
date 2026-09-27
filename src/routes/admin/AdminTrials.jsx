import { useState } from 'react';
import {
  FaGift,
  FaCheck,
  FaSpinner,
  FaStopwatch,
  FaTrashCan,
  FaTriangleExclamation,
} from 'react-icons/fa6';

const fmt = (ms) =>
  ms ? new Date(ms).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;

// Manual 7-day trial grants (comps/testing) — the main trial flow lives in Stripe.
const AdminTrials = () => {
  const [discordId, setDiscordId] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { action, subscription, role }

  const call = async (path, action) => {
    setBusy(true);
    setMsg(null);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ discord_id: discordId.trim() }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.ok) {
        setResult({ action, subscription: body.subscription, role: body.role });
        setMsg(
          action === 'grant'
            ? `Trial granted — access until ${fmt(body.subscription?.current_period_end)}.`
            : 'Access revoked.'
        );
        setDiscordId('');
      } else if (res.status === 409) {
        setError(
          body?.status === 'trialing'
            ? 'This user already has a trial running.'
            : 'This user already has an active paid subscription.'
        );
      } else if (res.status === 404 && action === 'revoke') {
        setError('No subscription or trial found for that ID.');
      } else {
        setError(body?.message || body?.error || 'Request failed. Please try again.');
      }
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        <FaStopwatch />
        Free trials
      </div>
      <p className="mt-3 text-sm text-zinc-400">
        Manual overrides for comps, influencers or testing — most trials start through Stripe on the{' '}
        <strong className="text-white">/upgrade</strong> page and need no action here. Grants run 7 days
        and revoke the <strong className="text-brand">deal-profit</strong> role automatically on expiry.
      </p>

      <label className="mt-5 block text-sm font-semibold text-zinc-300" htmlFor="trial-discord-id">
        Discord user ID
      </label>
      <input
        id="trial-discord-id"
        value={discordId}
        onChange={(e) => setDiscordId(e.target.value)}
        placeholder="e.g. 1553844051449483445"
        className="mt-2 w-full rounded-lg border border-white/10 bg-charcoal px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-brand/60 focus:outline-none"
        inputMode="numeric"
      />
      <p className="mt-1.5 text-xs text-zinc-500">
        Discord Settings → Advanced → enable Developer Mode, then right-click the user → Copy User ID.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => call('/api/admin/grant-trial', 'grant')}
          disabled={busy || !discordId.trim()}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <FaSpinner className="animate-spin text-xs" /> : <FaGift className="text-xs" />}
          Grant 7-day trial
        </button>
        <button
          type="button"
          onClick={() => call('/api/admin/revoke-trial', 'revoke')}
          disabled={busy || !discordId.trim()}
          className="btn-ghost text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <FaSpinner className="animate-spin text-xs" /> : <FaTrashCan className="text-xs" />}
          Revoke access
        </button>
      </div>

      {msg && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          <FaCheck className="mt-0.5 shrink-0" />
          <span>{msg}</span>
        </div>
      )}
      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-300">
          <FaTriangleExclamation className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {result && (
        <div className="mt-3 text-xs text-zinc-500">
          Record: <span className="text-zinc-300">{result.subscription?.user_id}</span> · status{' '}
          <span className="text-zinc-300">{result.subscription?.status}</span>
          {result.role && !result.role.ok && (
            <span className="ml-1 text-amber-300">
              — Discord role call failed: {result.role.error} (check the bot token / role position in Settings)
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminTrials;
