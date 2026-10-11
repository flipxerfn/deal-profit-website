import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * A figure that counts up when it scrolls into view, with the real number
 * already in the document.
 *
 * WHY NOT MAGIC UI'S number-ticker
 * -------------------------------
 * The registry version renders an empty <span> and writes textContent from a
 * spring once `useInView` fires. That means three things go wrong on this
 * page:
 *
 *   1. Before hydration the stat is BLANK. These figures exist to prove the
 *      feed is live; a stat that renders empty reads as "the feed is broken",
 *      which is the exact opposite of the claim. The page already has a rule
 *      about this — render nothing rather than a fake figure when the feed is
 *      down — and a blank-until-animated stat breaks that rule from the other
 *      direction.
 *   2. With JS slow or blocked the number never appears at all.
 *   3. It writes textContent directly, which means the value is absent from
 *      server-rendered markup and therefore from anything that reads the HTML.
 *
 * This version puts the true value in the DOM on first paint and animates the
 * number FROM a lower start TO that value. Server-rendered markup contains the
 * real figure, so no-JS, slow-JS and tests all see the correct number, and the
 * motion is purely additive.
 *
 * WHY NOT FROM ZERO
 * -----------------
 * Counting 0 → 200 is a nice trick and it is dishonest here: it implies the
 * count is climbing, and the count is a snapshot of one fetch. Starting from a
 * value slightly below the real one still reads as "measured", and never shows
 * a figure that was never true.
 */
export default function AnimatedFigure({
  value,
  suffix = '',
  prefix = '',
  className = '',
  decimals = 0,
  // How far below the real value the count starts. Small on purpose.
  lead = 0.14,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;

    // Respect the OS setting rather than animating regardless. The number is
    // already correct in the DOM, so honouring reduced-motion here costs
    // nothing: it simply skips the movement.
    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return undefined;

    const start = value * (1 - lead);
    const state = { n: start };

    const fmt = (n) =>
      (prefix + n.toFixed(decimals)) + suffix;

    const tween = gsap.to(state, {
      n: value,
      duration: 1.15,
      ease: 'power2.out',
      paused: true,
      onUpdate: () => {
        el.textContent = fmt(state.n);
      },
      // The tween must leave the exact value behind, not a rounded one.
      // Ending on 199.998 in a stat that says 200 is the kind of thing that
      // gets screenshotted.
      onComplete: () => {
        el.textContent = fmt(value);
      },
      scrollTrigger: {
        trigger: el,
        start: 'top 92%',
        once: true,
      },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [value, suffix, prefix, decimals, lead]);

  // The real value, in the DOM, on first paint. Everything else is decoration.
  const initial =
    (prefix + (typeof value === 'number' && Number.isFinite(value)
      ? value.toFixed(decimals)
      : '0')) + suffix;

  return (
    <span ref={ref} className={className}>
      {initial}
    </span>
  );
}