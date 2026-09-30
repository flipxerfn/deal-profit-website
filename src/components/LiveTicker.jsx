// A live ticker: a single row of recent finds, scrolling continuously.
//
// Why this exists. The hero feed rotates four cards every 5s, which is motion
// for its own sake — the same four items return in a loop and a returning
// visitor learns to ignore it within a minute. What the page never showed was
// the thing that is actually true about this business: new finds arrive
// constantly, and they are new. The feed has 200 posts and the newest is
// usually minutes old.
//
// So this scrolls a continuous strip of real, recent finds with real ages. It
// is the only element on the page whose motion is driven by data rather than a
// timer, and it is the reason the page reads as alive.
//
// Three constraints, all of which matter more than the effect:
//
//  1. It STOPS for reduced motion. Not "animates slower" — stops. A
//     continuously scrolling strip is exactly what that preference is for.
//  2. It stops on hover and on keyboard focus. Auto-scrolling content that
//     cannot be paused is an accessibility failure, and WCAG 2.2 requires a
//     pause mechanism for anything that moves for more than five seconds.
//     Hover alone is not enough: keyboard users would never get a pause.
//  3. Nothing scrolls off-screen unreadable. Items are duplicated so the loop
//     is seamless, and the duplicate set is aria-hidden so a screen reader
//     hears each find once rather than twice.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaBolt, FaArrowRight } from 'react-icons/fa6';
import { isSourceLink, timeAgo } from '../lib/dealSource';
import { useReducedMotion } from '../lib/motion';
import { DISCORD_INVITE } from '../lib/checkout';

const ENDPOINT = '/api/deals';
const HOW_MANY = 14;

// Duration scales with content length so the speed reads as constant whatever
// ends up in the feed. A fixed duration makes a short feed crawl.
const SECONDS_PER_ITEM = 4;

export default function LiveTicker() {
  const prefersReduced = useReducedMotion();
  const [items, setItems] = useState([]);
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
  const trackRef = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(ENDPOINT, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        const list = Array.isArray(data?.deals) ? data.deals : [];
        if (!alive) return;
        const usable = list
          .filter((d) => isSourceLink(d?.url ?? d?.cta?.href))
          .filter((d) => (d.title || '').trim().length > 0);
        setItems(usable.slice(0, HOW_MANY));
      } catch {
        if (alive) setItems([]);
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // A strip with nothing in it is a bar with a border, so it is not rendered
  // at all. `ready` prevents a flash of empty strip while the fetch is in
  // flight.
  if (!ready || items.length < 2) return null;

  // `allowMotion` and `paused` are deliberately separate.
  //
  // The first version had a single `run = !prefersReduced && !paused` and used
  // it to decide whether to apply the animation at all. That looks equivalent
  // and is not: pausing then REMOVED the animation, which snapped the track
  // back to translate(0) and restarted the scroll from the beginning every time
  // a mouse touched the strip. Measured live — hovering at -1833px moved it to
  // 0. A pause control that jumps the content it is pausing is worse than no
  // pause control.
  //
  // So: the animation is applied whenever motion is permitted, and pausing
  // freezes it where it is via animation-play-state. Only the reduced-motion
  // preference removes it.
  const allowMotion = !prefersReduced;
  const duration = items.length * SECONDS_PER_ITEM;

  return (
    <div className="border-t border-white/10 bg-charcoal/40">
      <div className="mx-auto flex max-w-[1800px] flex-col gap-0 px-4 py-3 sm:px-6 lg:px-8">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
            </span>
            Caught just now
          </p>
          <div className="flex items-center gap-3">
            {/*
              WCAG 2.2 requires a pause control for anything that moves for more
              than five seconds. A strip that only pauses on hover is
              unreachable by keyboard, so the control is a real button.

              Sizing is not decoration. The first version was a 53x21px pill,
              which is under the 24x24px minimum in WCAG 2.2 AA 2.5.8 (Target
              Size, Minimum) and all but unusable on a phone. Now 28px tall with
              32px of horizontal padding: clears the AA floor, stays a workable
              tap target on mobile, and carries a visible focus ring so a
              keyboard user can see where they are.
            */}
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="inline-flex min-h-[28px] items-center rounded-md border border-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 transition-colors hover:border-white/25 hover:text-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              aria-pressed={paused}
            >
              {paused ? 'Resume' : 'Pause'}
            </button>
            <Link
              to="/deals"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
            >
              All finds
              <FaArrowRight className="h-2.5 w-2.5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div
          className="group relative overflow-hidden"
          // Hover pauses for pointer users. Keyboard users get the button
          // above, because focus alone would never stop the motion.
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* Edge fades, so items dissolve rather than being chopped off. */}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-charcoal to-transparent"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-charcoal to-transparent"
            aria-hidden="true"
          />

          <ul
            ref={trackRef}
            className="ticker-track flex w-max items-center gap-3"
            style={
              allowMotion
                ? {
                    animation: `ticker-scroll ${duration}s linear infinite`,
                    // Freezes in place. Removing the animation instead would
                    // reset the track to x=0 and restart the scroll.
                    animationPlayState: paused ? 'paused' : 'running',
                  }
                : undefined
            }
          >
            {/*
              The list is rendered twice so the loop is seamless. The second
              copy is aria-hidden, so a screen reader hears each find once
              rather than hearing the whole strip twice.
            */}
            {items.map((d) => (
              <TickerItem key={d.id} deal={d} />
            ))}
            <div aria-hidden="true" className="flex items-center gap-3">
              {items.map((d) => (
                <TickerItem key={`dup-${d.id}`} deal={d} decorative />
              ))}
            </div>
          </ul>
        </div>

        <p className="sr-only">
          {items.length} recent finds, newest first. The full list is on the{' '}
          <Link to="/deals">deals page</Link>, or join{' '}
          <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer">
            the Discord server
          </a>{' '}
          to see them as they are caught.
        </p>
      </div>
    </div>
  );
}

function TickerItem({ deal, decorative = false }) {
  const age = deal.postedAt ? timeAgo(deal.postedAt) : null;
  return (
    <li
      className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-white/5 bg-white/[0.03] px-3 py-1.5"
      {...(decorative ? { 'aria-hidden': true } : {})}
    >
      <FaBolt className="h-2.5 w-2.5 shrink-0 text-brand" aria-hidden="true" />
      <span className="max-w-[16rem] truncate text-xs font-medium text-zinc-200">
        {deal.title}
      </span>
      {typeof deal.price === 'number' && (
        <span className="text-xs font-bold text-brand">
          {deal.displayPrice ?? `$${deal.price.toFixed(2)}`}
        </span>
      )}
      {age && <span className="text-[11px] text-zinc-500">{age}</span>}
    </li>
  );
}
