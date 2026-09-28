import { useEffect, useState, useRef, useCallback } from 'react';

// Spring presets — centralized so every component uses the same feel
export const springs = {
  gentle: { type: 'spring', stiffness: 120, damping: 20, mass: 1 },
  snappy: { type: 'spring', stiffness: 260, damping: 22, mass: 1 },
  bouncy: { type: 'spring', stiffness: 180, damping: 12, mass: 1 },
};

export function useReducedMotion() {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mediaQuery.matches);
    const handler = (e) => setPrefersReduced(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
}

// Single IntersectionObserver per page — cheap scroll-reveal trigger
let globalObserver = null;
const elementMap = new Map();

function getGlobalObserver() {
  if (globalObserver) return globalObserver;
  globalObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const data = elementMap.get(entry.target);
      if (data && entry.isIntersecting) {
        data.callback();
        globalObserver?.unobserve(entry.target);
        elementMap.delete(entry.target);
      }
    });
  }, { rootMargin: '100px', threshold: 0.1 });
  return globalObserver;
}

// Scroll-reveal hook — attaches to a ref, fires once when element enters viewport
export function useScrollReveal(options = {}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const triggered = useRef(false);

  const handleIntersect = useCallback(() => {
    if (!triggered.current) {
      triggered.current = true;
      setIsVisible(true);
    }
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || triggered.current) return;
    const observer = getGlobalObserver();
    elementMap.set(el, { callback: handleIntersect, options: { rootMargin: '100px', threshold: 0.1, ...options } });
    observer.observe(el);
    return () => {
      observer.unobserve(el);
      elementMap.delete(el);
    };
  }, [handleIntersect, options.rootMargin, options.threshold]);

  return { ref, isVisible };
}

export const motionVariants = {
  // Core
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  fadeInUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { type: 'spring', stiffness: 260, damping: 26, mass: 0.9 },
  },
  staggerContainer: {
    animate: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
  },
  staggerItem: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { type: 'spring', stiffness: 260, damping: 26, mass: 0.9 },
  },

  // Interactions (transform/opacity only)
  scaleHover: {
    whileHover: { scale: 1.02, transition: springs.snappy },
    whileTap: { scale: 0.98, transition: { duration: 0.1 } },
  },
  cardLift: {
    whileHover: { y: -8, transition: springs.gentle },
    whileTap: { scale: 0.99 },
  },
  buttonPress: {
    whileHover: { scale: 1.02, transition: springs.snappy },
    whileTap: { scale: 0.97, transition: { duration: 0.1 } },
  },
  iconFloat: {
    whileHover: { y: -6, rotate: 3, transition: springs.gentle },
    whileTap: { scale: 0.95 },
  },

  // Entrance (scroll-reveal consumes this)
  scrollReveal: {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
  scrollRevealFast: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, ease: 'easeOut' },
  },

  // Page transition (AnimatePresence cross-fade + slight scale)
  pageTransition: {
    initial: { opacity: 0, scale: 0.98, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 1.02, y: -10 },
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },

  // Layout animation for shared elements (logo, CTAs)
  layoutSpring: {
    transition: springs.gentle,
  },

  // Legacy aliases (still used in some components)
  cardHover: {
    whileHover: { y: -4, scale: 1.005, transition: springs.gentle },
    whileTap: { scale: 0.995, transition: { duration: 0.12 } },
  },
  buttonHover: {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 },
  },
  slideInLeft: {
    initial: { opacity: 0, x: -30 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.5, ease: 'easeOut' },
  },
  slideInRight: {
    initial: { opacity: 0, x: 30 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.5, ease: 'easeOut' },
  },
  expandWidth: {
    initial: { width: 0 },
    animate: { width: 'auto' },
    transition: { duration: 0.3, ease: 'easeOut' },
  },
};

export function getMotionProps(prefersReduced, variants) {
  if (prefersReduced) {
    return { initial: false, animate: false, exit: false, transition: { duration: 0 } };
  }
  return variants;
}