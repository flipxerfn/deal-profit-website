import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '../lib/motion';

/**
 * A scroll-linked reveal.
 *
 * WHY THIS EXISTS
 * ---------------
 * Every section and card on the site used to animate through
 * motionVariants.fadeInUp, which is an `animate:` variant. That fires ONCE, ON
 * MOUNT — meaning a card 3000px below the fold played its entire entrance while
 * the reader was still looking at the hero. By the time they scrolled down,
 * every reveal had already finished and the page felt inert below the first
 * screen.
 *
 * WHY THERE IS A SCROLL SWEEP AS WELL AS AN OBSERVER
 * -------------------------------------------------
 * The reveal is normally driven by an IntersectionObserver, which is the right
 * tool: it costs nothing while the page is still, and one observer can watch
 * many elements.
 *
 * But an observer only reports the intersection state it SAMPLES. Jump the page
 * — the End key, an in-page anchor, a fast fling, or `scrollTo` from a script —
 * and an element can go from "below the viewport" to "above the viewport"
 * between two samples without ever being seen as intersecting. Measured on
 * /upgrade: a scripted page walk left 13 elements at opacity 0, and they only
 * appeared once the reader scrolled again. Content that is invisible after you
 * have scrolled past it is worse than no animation at all.
 *
 * So every pending reveal is also registered in a shared set that is swept once
 * the page stops scrolling. The sweep reveals anything that has been reached —
 * including things now above the viewport. It runs on scroll stop rather than
 * per frame, so the cost is one pass at the end of a gesture instead of a
 * layout read for every element on every frame.
 *
 * `once` semantics are kept: a revealed element is never hidden again, because
 * motion that replays when you scroll back up reads as a glitch.
 */

const pendingReveals = new Set();
let sweepTimer = null;
let listenersAttached = false;

function sweep() {
  if (typeof window === 'undefined') return;
  const limit = window.innerHeight;
  for (const entry of [...pendingReveals]) {
    const rect = entry.el.getBoundingClientRect();
    // Reached means: any part of it is at or above the bottom edge — which
    // includes elements that have already been scrolled past.
    if (rect.top < limit) entry.reveal();
  }
}

function scheduleSweep() {
  clearTimeout(sweepTimer);
  sweepTimer = setTimeout(sweep, 220);
}

function ensureGlobalListeners() {
  if (listenersAttached || typeof window === 'undefined') return;
  listenersAttached = true;
  window.addEventListener('scroll', scheduleSweep, { passive: true });
  window.addEventListener('resize', scheduleSweep, { passive: true });
}

/**
 * Reveal state for one element: a ref to attach, and whether it has played.
 *
 * `amount` is the fraction of the element that must be on screen for the
 * observer to fire. The sweep ignores it deliberately — by the time the page
 * has stopped moving, an element that has been reached is revealed however
 * briefly it was on screen.
 */
function useReveal(amount = 0.2) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  const reveal = useCallback(() => setShown(true), []);

  useEffect(() => {
    if (shown) return undefined;
    const el = ref.current;
    if (!el || typeof window === 'undefined') return undefined;

    ensureGlobalListeners();
    const entry = { el, reveal };
    pendingReveals.add(entry);

    let observer;
    if (typeof IntersectionObserver === 'function') {
      observer = new IntersectionObserver(
        (entries) => {
          for (const e of entries) if (e.isIntersecting) entry.reveal();
        },
        { threshold: Math.min(Math.max(amount, 0.01), 1) }
      );
      observer.observe(el);
    }

    // An element that is already on screen when it mounts must not wait for a
    // scroll that may never come — that is how a route change landed on a page
    // whose first screen sat at opacity 0.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) entry.reveal();

    return () => {
      pendingReveals.delete(entry);
      observer?.disconnect();
    };
  }, [amount, reveal, shown]);

  return [ref, shown];
}

export default function ScrollReveal({
  children,
  className = '',
  delay = 0,
  // How much of the element must be visible before the observer plays it. An
  // element only peeking past the bottom edge is left waiting; the sweep
  // catches it if the reader keeps moving.
  amount = 0.25,
  as = 'div',
  // Travel distance and optional scale/rotation. These exist so a dense page
  // can give its headings a different weight of movement than its grid items.
  distance = 24,
  scaleFrom = 1,
  rotate = 0,
  ...rest
}) {
  const prefersReduced = useReducedMotion();
  const [ref, shown] = useReveal(amount);

  if (prefersReduced) {
    // Render the element plainly. A reduced-motion reader should get the
    // content at full opacity immediately, not the same motion played quietly.
    const Plain = as;
    return (
      <Plain className={className} {...rest}>
        {children}
      </Plain>
    );
  }

  const Tag = motion[as] ?? motion.div;

  return (
    <Tag
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: distance, scale: scaleFrom, rotate }}
      animate={shown ? { opacity: 1, y: 0, scale: 1, rotate: 0 } : { opacity: 0, y: distance, scale: scaleFrom, rotate }}
      transition={{
        type: 'spring',
        stiffness: 240,
        damping: 28,
        mass: 0.9,
        delay,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

const ITEM_TRANSITION = { type: 'spring', stiffness: 240, damping: 26, mass: 0.9 };

/**
 * A group whose children arrive one after another when the group is reached.
 *
 * WHY THIS IS NOT JUST `staggerContainer`
 * ---------------------------------------
 * `motionVariants.staggerContainer` animates with `animate:`, which runs on
 * MOUNT. Every page used it, so a grid four screens down played its entire
 * cascade while the reader was still on the hero — by the time they scrolled,
 * the motion they were meant to see had already finished, and the page read as
 * static. That is the whole defect this pair fixes.
 *
 * SAFETY FOR LONG LISTS
 * ---------------------
 * A parent-driven stagger delays every child by index, so on a 200-item feed
 * the last cards would sit at opacity 0 for minutes. That is why the deal grid
 * deliberately still uses a plain ScrollReveal per card: each card plays when
 * IT is reached. Reach for this pair on lists of a dozen or fewer.
 */
export function RevealGroup({
  children,
  className = '',
  stagger = 0.09,
  delay = 0,
  amount = 0.15,
  as = 'div',
  ...rest
}) {
  const prefersReduced = useReducedMotion();
  const [ref, shown] = useReveal(amount);

  if (prefersReduced) {
    const Plain = as;
    return (
      <Plain className={className} {...rest}>
        {children}
      </Plain>
    );
  }

  const Tag = motion[as] ?? motion.div;

  return (
    <Tag
      ref={ref}
      className={className}
      initial="hidden"
      animate={shown ? 'shown' : 'hidden'}
      variants={{
        hidden: {},
        shown: {
          transition: { staggerChildren: stagger, delayChildren: delay },
        },
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/**
 * One child of a RevealGroup. Inherits nothing unless it is inside one.
 *
 * Transform-and-opacity only, with `blur` offered because it is a paint
 * property rather than a layout one — it sharpens the arrival without ever
 * reflowing the page.
 */
export function RevealItem({
  children,
  className = '',
  as = 'div',
  y = 22,
  x = 0,
  scale = 1,
  blur = 0,
  ...rest
}) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    const Plain = as;
    return (
      <Plain className={className} {...rest}>
        {children}
      </Plain>
    );
  }

  const Tag = motion[as] ?? motion.div;

  return (
    <Tag
      className={className}
      variants={{
        hidden: { opacity: 0, y, x, scale, filter: blur ? `blur(${blur}px)` : 'none' },
        shown: {
          opacity: 1,
          y: 0,
          x: 0,
          scale: 1,
          filter: 'blur(0px)',
          transition: ITEM_TRANSITION,
        },
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
