import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

// SplitText and ScrollTrigger both became free with GSAP 3.13 (Webflow dropped
// the Club paywall), so no licence key and no CDN — both ship inside the
// installed package and are bundled by Vite like any other import.

gsap.registerPlugin(ScrollTrigger, SplitText);

/**
 * Splits an element's text and reveals it as the reader scrolls to it.
 *
 * WHY SPLIT TEXT AT ALL
 * ---------------------
 * A heading that fades in as one block is one move. A heading that resolves
 * word by word, with the words arriving at slightly different times, is a
 * dozen moves that read as one gesture — and the stagger is what makes it feel
 * deliberate rather than random.
 *
 * WORDS, NOT CHARS, BY DEFAULT
 * ---------------------------
 * Character-level reveals are the standard demo effect and they go wrong on
 * real copy: they break text selection, they mangle screen-reader output if the
 * split lands badly, and on a long heading the last word arrives seconds after
 * the first. Words are legible mid-animation and cheap. Chars are available for
 * the hero, where the copy is two short lines and the effect is the point.
 *
 * STRICT MODE
 * -----------
 * React 18 mounts every effect twice in development. A split applied twice
 * nests a second set of spans inside the first and the animation targets the
 * wrong nodes — the heading ends up permanently invisible and nothing in a
 * unit test catches it, because the test does not run the effect. revert() on
 * cleanup is what makes this idempotent.
 */
export function useSplitReveal(options = {}) {
  const {
    selector = '[data-reveal]',
    type = 'words',
    stagger = 0.045,
    duration = 0.72,
    start = 'top 86%',
    once = true,
    mask = true,
    delay = 0,
  } = options;

  const scope = useRef(null);

  useEffect(() => {
    const root = scope.current;
    if (!root) return undefined;

    const targets = gsap.utils.toArray(selector, root);
    if (!targets.length) return undefined;

    const ctx = gsap.context(() => {
      for (const el of targets) {
        // A heading may have been split already by another instance of this
        // hook (Home renders SectionHeader more than once). revert() before
        // re-splitting puts the original text back first.
        if (el._split) {
          el._split.revert();
          el._split = null;
        }

        const split = new SplitText(el, {
          type,
          // The mask wrapper is what makes a word appear to slide up from
          // behind a line rather than just fade — it is the single cheapest
          // thing that stops this looking like every other reveal.
          mask: type,
          autoSplit: true,
        });
        el._split = split;

        const pieces = split[type] || [];

        gsap.set(pieces, { yPercent: 118, rotate: 2 });

        gsap.to(pieces, {
          yPercent: 0,
          rotate: 0,
          duration,
          delay,
          ease: 'expo.out',
          stagger: {
            each: stagger,
            // "start" so the sentence resolves left to right. "random" looks
            // livelier but scrambles reading order, which matters when the
            // heading is an instruction.
            from: 'start',
          },
          scrollTrigger: {
            trigger: el,
            start,
            toggleActions: once ? 'play none none none' : 'play none none reverse',
          },
          // Without this the masked pieces are in the layout at yPercent 118
          // and the element reserves the right height already — but clearing
          // after play lets the browser drop the compositing layer, which is
          // what stops a long page from accumulating GPU memory.
          onComplete: mask
            ? () => gsap.set(pieces, { clearProps: 'transform' })
            : undefined,
        });
      }
    }, root);

    ScrollTrigger.refresh();

    // data-rise: one element, one move, no split. Used for text that carries a
    // clipped gradient — see the note in Home.jsx about why those cannot be
    // split by word.
    const risers = gsap.utils.toArray('[data-rise]', root);
    const riseCtx = gsap.context(() => {
      for (const el of risers) {
        gsap.fromTo(
          el,
          { yPercent: 110, autoAlpha: 0 },
          {
            yPercent: 0,
            autoAlpha: 1,
            duration: 0.95,
            delay: 0.42,
            ease: 'expo.out',
            // overflow:hidden comes from a class rather than a split, so the
            // element needs its own clip to slide out from behind something.
            scrollTrigger: { trigger: el, start: 'top 100%' },
            onComplete: () => gsap.set(el, { clearProps: 'transform' }),
          }
        );
      }
    }, root);

    return () => {
      riseCtx.revert();
      ctx.revert();
      for (const el of targets) {
        if (el._split) {
          el._split.revert();
          el._split = null;
        }
      }
    };
  }, [selector, type, stagger, duration, start, once, mask, delay]);

  return scope;
}

/**
 * A scroll-linked parallax layer.
 *
 * Deliberately small: ±40px over the element's full pass through the viewport.
 * Larger values read as a bug on a phone where the viewport is short — the
 * element is in view for less scroll distance, so the same pixel range is a
 * much larger fraction of what you can see.
 */
export function useParallax(options = {}) {
  const { selector = '[data-parallax]', strength = 40 } = options;
  const scope = useRef(null);

  useEffect(() => {
    const root = scope.current;
    if (!root) return undefined;

    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce) return undefined;

    const ctx = gsap.context(() => {
      for (const el of gsap.utils.toArray(selector, root)) {
        const amount = Number(el.dataset.parallax || strength);
        gsap.fromTo(
          el,
          { yPercent: -amount / 10 },
          {
            yPercent: amount / 10,
            ease: 'none',
            scrollTrigger: {
              trigger: el,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          }
        );
      }
    }, root);

    return () => ctx.revert();
  }, [selector, strength]);

  return scope;
}

/**
 * Smooth scrolling, and the thing that makes scroll-linked motion feel like it
 * belongs to the page instead of being glued on top of it. GSAP's own
 * ScrollSmoother is a Club plugin; Lenis is free and does the same job, and
 * gsap.ticker drives it so there is exactly one rAF loop rather than two
 * fighting each other.
 */
export function useSmoothScroll() {
  useEffect(() => {
    let lenis;
    let cancelled = false;

    (async () => {
      const reduce =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      // Native scrolling on a touch device is better than anything JS can
      // replicate — momentum, rubber-banding, address-bar behaviour. Hijacking
      // it is the single most common way a "premium" site feels worse.
      if (reduce || window.matchMedia('(pointer: coarse)').matches) return;

      try {
        const { default: Lenis } = await import('lenis');
        if (cancelled) return;
        lenis = new Lenis({
          duration: 1.05,
          // Exponential ease-out: fast pickup, long settle. A linear ramp feels
          // like dragging something sticky.
          easing: (t) => 1 - Math.pow(1 - t, 3),
          smoothWheel: true,
          wheelMultiplier: 1,
          touchMultiplier: 1.6,
        });

        lenis.on('scroll', ScrollTrigger.update);
        const raf = (time) => lenis.raf(time * 1000);
        gsap.ticker.add(raf);
        gsap.ticker.lagSmoothing(0);

        return () => gsap.ticker.remove(raf);
      } catch {
        // A missing optional enhancement must never take the site down.
      }
    })();

    return () => {
      cancelled = true;
      ScrollTrigger.update();
      lenis?.destroy();
    };
  }, []);
}

/** Refreshes ScrollTrigger after a route change or a late layout shift. */
export function refreshScrollTriggers() {
  ScrollTrigger.refresh();
}

export { gsap, ScrollTrigger, SplitText };
