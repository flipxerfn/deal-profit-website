// Scroll-reveal hook — single IntersectionObserver per page, fires once per element
import { useEffect, useState, useRef, useCallback } from 'react';

// Single global IntersectionObserver — cheap, reused across all elements
let globalObserver = null;
const elementMap = new Map();

function getGlobalObserver() {
  if (globalObserver) return globalObserver;
  globalObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const data = elementMap.get(entry.target);
      if (data && entry.isIntersecting) {
        data.callback();
        globalObserver.unobserve(entry.target);
        elementMap.delete(entry.target);
      }
    });
  }, { rootMargin: '100px', threshold: 0.1 });
  return globalObserver;
}

// useScrollReveal — attaches to a ref, fires once when element enters viewport
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

// Also re-export the core motion utilities for convenience
export { useReducedMotion, motionVariants, getMotionProps, springs } from '../lib/motion';