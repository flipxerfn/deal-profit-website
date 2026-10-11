import { motion } from 'framer-motion';
import { useReducedMotion } from '../lib/motion';

/**
 * A scroll-linked reveal.
 *
 * WHY THIS EXISTS
 * ---------------
 * Every section and card on the site animated through motionVariants.fadeInUp,
 * which is an `animate:` variant. That fires ONCE, ON MOUNT — meaning a card
 * 3000px below the fold plays its entire entrance while the reader is still
 * looking at the hero. By the time they scroll down, every reveal has already
 * finished and the page feels inert below the first screen.
 *
 * That is the whole reason scroll-linked motion was added to the headings and
 * not to the content: the headings got ScrollTrigger, the cards did not. The
 * result was a page whose headings felt alive and whose body did not.
 *
 * WHY whileInView AND NOT SCROLLTRIGGER
 * -------------------------------------
 * Both would work. framer-motion's whileInView is used here because these
 * elements are already framer-motion components and switching them to GSAP
 * means two animation libraries writing transform on the same node — the
 * exact conflict that produced the jumpy hero headline when SplitText and
 * motion were both animating the same words. GSAP keeps the headings; framer
 * keeps the cards; neither touches the other's properties.
 *
 * `once: true` matters more than it looks. Without it the element re-animates
 * every time it re-enters the viewport, which on a long page means a card
 * reappearing at the bottom of the screen every time you scroll up past it.
 * Motion that repeats reads as a glitch, not as polish.
 */
export default function ScrollReveal({
  children,
  className = '',
  delay = 0,
  // How far into the viewport the element must be before it plays. 'start 85%'
  // fires slightly before the element is fully visible, which reads as
  // responsive rather than late.
  amount = 0.25,
  as = 'div',
  ...rest
}) {
  const prefersReduced = useReducedMotion();
  const Tag = motion[as] ?? motion.div;

  if (prefersReduced) {
    // Render the element plainly. Returning a bare wrapper here matters: a
    // reduced-motion user should get the content at full opacity immediately,
    // not the same motion played more quietly.
    const Plain = as;
    return (
      <Plain className={className} {...rest}>
        {children}
      </Plain>
    );
  }

  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
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