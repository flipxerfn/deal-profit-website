import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';

/**
 * Scroll-linked text.
 *
 * The site already revealed section headings as they entered the viewport —
 * that is a one-shot fade, so it reads once and then the page below it is
 * static. This ties the text to scroll position instead, so the words move
 * while you move. It is the difference between motion that is noticed and
 * motion that is not: background gradients drift whether or not anyone is
 * looking, but a heading tracking your thumb is something you feel.
 *
 * Why transforms only: y and opacity never trigger layout. A scroll handler
 * that changed a height or a margin would reflow the whole page on every
 * frame, which is exactly how a "nice" animation becomes a janky one.
 */
export default function ScrollText({
  children,
  as: Tag = 'h2',
  className = '',
  distance = 70,
  fade = true,
  scaleFrom = 1,
}) {
  const ref = useRef(null);
  const prefersReduced = useReducedMotion();

  // "start end" = element's top meets viewport bottom. "end start" = element's
  // bottom has passed the viewport top. Between those the progress runs 0 -> 1,
  // which is the element's whole journey through the screen.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], [distance, -distance]);
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.22, 0.72, 1],
    fade ? [0, 1, 1, 0.25] : [1, 1, 1, 1]
  );
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [scaleFrom, 1, scaleFrom]);

  if (prefersReduced) {
    return (
      <Tag ref={ref} className={className}>
        {children}
      </Tag>
    );
  }

  const MotionTag = motion[Tag] || motion.h2;

  return (
    <MotionTag
      ref={ref}
      className={className}
      style={{ y, opacity, scale, willChange: 'transform, opacity' }}
    >
      {children}
    </MotionTag>
  );
}

/**
 * The same idea for a whole block rather than a heading: the text in each
 * card drifts at a different rate, so a section separates into layers as it
 * moves rather than sliding as one block. `depth` staggers the rate.
 */
export function ScrollLayer({ children, className = '', depth = 0, base = 40 }) {
  const ref = useRef(null);
  const prefersReduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  // Odd depths rise, even depths fall, and the rate grows with depth. Two
  // things moving in opposite directions is what reads as depth.
  const span = base + depth * 26;
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    depth % 2 === 0 ? [span, -span] : [-span, span]
  );

  if (prefersReduced) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ y, willChange: 'transform' }}
    >
      {children}
    </motion.div>
  );
}

/**
 * A hairline progress bar for the page, driven straight off scroll position.
 * It is the one piece of scroll-linked UI that tells you where you are in a
 * long page, and it costs one transform per frame.
 */
export function ScrollProgress({ className = '' }) {
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const prefersReduced = useReducedMotion();

  if (prefersReduced) return null;

  return (
    <motion.div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-gradient-to-r from-brand via-brand-2 to-glow ${className}`}
      style={{ scaleX, willChange: 'transform' }}
    />
  );
}