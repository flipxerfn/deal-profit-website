import { useEffect } from 'react';

/**
 * Preloads the code-split route chunks once the app is idle.
 *
 * WHY
 * ---
 * Every route except Home is lazy, so the first visit to a route has to fetch
 * its chunk. On top of that, <AnimatePresence mode="wait"> in Layout holds the
 * incoming page until the outgoing one has finished its exit animation — and
 * the incoming chunk does not begin downloading until that exit completes,
 * because the component is not mounted until then.
 *
 * The two costs stack, and the measured result was bad enough to look broken:
 *
 *   /reviews        path changes in  388ms
 *   /upgrade        path changes in  743ms, content 3314ms
 *   /setup-request  path changes in 4084ms   <- four seconds
 *
 * Four seconds to change the page reads as "it did not load", so people hit
 * refresh — which is a full reload, which works, which makes it look like a
 * caching problem rather than a slow one.
 *
 * The fix is to remove the only part that is actually avoidable. The exit
 * animation has to stay (it is the thing that makes the transition feel like
 * travel), but the chunk does not have to arrive during it. Importing them
 * ahead of time puts every route in the module cache, so by the time anyone
 * clicks anything the bytes are already local and the wait is only the
 * animation.
 *
 * WHY IDLE, NOT IMMEDIATELY
 * -------------------------
 * Preloading on mount would compete with the landing page's own images and
 * API calls for bandwidth, which is exactly the wrong trade for someone
 * arriving on a phone. requestIdleCallback defers until the browser has
 * nothing better to do, and the setTimeout fallback covers Safari and
 * anything without the idle callback.
 */
const ROUTE_IMPORTS = [
  () => import('../routes/Deals'),
  () => import('../routes/Reviews'),
  () => import('../routes/Discord'),
  () => import('../routes/Upgrade'),
  () => import('../routes/SetupRequest'),
  () => import('../routes/Welcome'),
  () => import('../routes/Terms'),
  () => import('../routes/Privacy'),
  () => import('../routes/Refunds'),
];

export default function usePrefetchRoutes() {
  useEffect(() => {
    let cancelled = false;

    const prefetchAll = () => {
      if (cancelled) return;
      for (const load of ROUTE_IMPORTS) {
        // A failure here is not worth surfacing: the route still loads on
        // demand when someone actually navigates to it.
        load().catch(() => {});
      }
    };

    // Network-first on a slow connection is actively harmful — the landing
    // page is still loading. Only prefill bandwidth that is genuinely idle.
    const connection = navigator.connection;
    if (connection && (connection.saveData || /2g/.test(connection.effectiveType || ''))) {
      return undefined;
    }

    const idle =
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback(prefetchAll, { timeout: 2500 })
        : window.setTimeout(prefetchAll, 1200);

    return () => {
      cancelled = true;
      if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, []);
}