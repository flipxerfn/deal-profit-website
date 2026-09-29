// Shared Discord sign-in state.
//
// Discord is the identity system for this site, so "am I signed in?" is asked by
// the navbar, the deals feed and the review form. It used to be answered
// independently by each of them, which meant three different spinners and the
// possibility of one of them disagreeing with the others.
//
// /api/user/subscription answers 401 when there's no session, and otherwise
// returns { discord: { id, username }, subscription, premiumRole }. The Discord
// role is the source of truth for access; the subscription record is the source
// of truth for billing.
import { useCallback, useEffect, useState } from 'react';

const ENDPOINT = '/api/user/subscription';

const SIGNED_OUT = {
  loading: true,
  signedIn: false,
  user: null,
  premiumRole: null,
  subscription: null,
};

export function useAuth() {
  const [state, setState] = useState(SIGNED_OUT);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(ENDPOINT, { headers: { Accept: 'application/json' } });
      if (res.status === 401) {
        setState({ loading: false, signedIn: false, user: null, premiumRole: null, subscription: null });
        return;
      }
      if (!res.ok) {
        // Treat an unexpected failure as signed out rather than guessing. The
        // gated views fail closed, so this locks rather than leaks.
        setState({ loading: false, signedIn: false, user: null, premiumRole: null, subscription: null });
        return;
      }
      const data = await res.json().catch(() => ({}));
      setState({
        loading: false,
        signedIn: Boolean(data?.discord?.id),
        user: data?.discord ?? null,
        premiumRole: typeof data?.premiumRole === 'boolean' ? data.premiumRole : null,
        subscription: data?.subscription ?? null,
      });
    } catch {
      setState({ loading: false, signedIn: false, user: null, premiumRole: null, subscription: null });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, refresh, signIn: () => { window.location.href = '/api/discord/auth'; } };
}
