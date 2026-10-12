import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, useScroll } from 'framer-motion';
import Navbar from './Navbar';
import Footer from './Footer';
import SiteCounter from './SiteCounter';
import { ScrollProgress } from './ScrollText';
import { useReducedMotion } from '../lib/motion';
import { useSmoothScroll } from '../lib/useGsapText';

const Layout = () => {
  const { pathname } = useLocation();
  const prefersReduced = useReducedMotion();

  // Smooth scroll lives HERE, not on Home.
  //
  // It was called from Home alone, so /deals, /upgrade, /setup-request and
  // /reviews all scrolled with native behaviour while only the homepage had
  // the smoothed variant — and every scroll-linked animation added later would
  // have to be re-enabled per route, which is the kind of thing that gets
  // forgotten on the route nobody tested. One call at the layout level covers
  // every page and every future one.
  useSmoothScroll();
  const { scrollYProgress } = useScroll();

  // Reset scroll position on every route change (react-router keeps the
  // old scroll offset otherwise, which feels broken on a multi-page site).
  // Temporarily disable the global smooth-scroll so this is an instant jump.
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    html.style.scrollBehavior = prev;
  }, [pathname]);

  // Whop Pixel: track client-side route changes.
  //
  // The snippet in index.html fires track("page") on a hard document load, but
  // this is a single-page app — going / -> /deals -> /upgrade never reloads the
  // document, so without this the only page view Whop would ever see is the one
  // a visitor happened to land on. /upgrade is the page that matters and it
  // would never register.
  //
  // The first render is skipped because the head snippet already covered it,
  // otherwise a cold load would be counted twice.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // Ad blockers routinely kill t.whop.tw, which leaves `whop` undefined.
    // Touching it unguarded would throw and take the whole page down with it.
    if (typeof window !== 'undefined' && typeof window.whop?.track === 'function') {
      window.whop.track('page');
    }
  }, [pathname]);

  return (
    <div className="relative flex min-h-screen flex-col bg-night font-sans text-zinc-200 antialiased">
      <motion.div
        aria-hidden="true"
        style={{ scaleX: scrollYProgress }}
        className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-gradient-to-r from-brand via-glow to-brand-2"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[520px] bg-[radial-gradient(55%_120%_at_50%_0%,rgba(139,92,246,0.13),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[520px] bg-[radial-gradient(40%_110%_at_88%_-12%,rgba(139,92,246,0.14),transparent_70%)]"
      />
      {/* Film grain. One fixed layer for the whole document at z-1: it sits
          over the band gradients and under main (z-10), so it dithers the
          large flat violet fields without ever sitting on top of text.
          aria-hidden and pointer-events-none, so it costs nothing for a
          screen reader and never eats a click. */}
      <div className="grain-overlay" aria-hidden="true" />
      <Navbar />
      <ScrollProgress />
      <main className="relative z-10 flex-1">
        {/* Route transitions.

            ENTER ONLY. There is deliberately no exit and no AnimatePresence.

            This block had both, and the exit was the cause of a production bug:
            navigating between routes rendered a completely BLANK page, and the
            only way out was a hard reload.

            What was actually happening, measured frame by frame on a single
            DOM node:

              314ms  new route mounts, opacity 1
              559ms  enter tween running, y heading +18 -> 0
              612ms  y has passed 0 and reached -2.45px
              989ms  opacity slams to 0
             1001ms  transform lands on y:-10 scale:0.996

            That last pair is the `exit` target verbatim. The exit was being
            applied to a child that was still entering, on the same node, and
            nothing ever brought the opacity back. The enter tween's y going
            NEGATIVE is the tell — it was already travelling toward the exit's
            y:-10 rather than the entrance's y:0.

            Two things made this look like something it was not. With
            mode="wait" only the FIRST nav after a page load failed, which
            reads as a warm-up quirk; without mode="wait" the first TWO failed.
            So mode="wait" was not causing the bug, it was delaying it. Only
            removing the exit fixed it: 12/12 route transitions clean.

            A 0.16s decorative exit is not worth a class of bug that blanks the
            page. The entrance is kept because it is the half the reader
            actually perceives — something still moves on a route change, it
            just arrives rather than leaves. */}
        <motion.div
          key={pathname}
          initial={prefersReduced ? false : { opacity: 0, y: 18, scale: 0.994 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={
            prefersReduced
              ? { duration: 0 }
              : { type: 'spring', stiffness: 260, damping: 28, mass: 0.85 }
          }
        >
            <div className="mx-auto w-full max-w-[1800px] px-4 py-8 sm:px-6 md:py-12 lg:px-8">
              <Outlet />
            </div>
          </motion.div>
      </main>
      <Footer />
      <SiteCounter />
    </div>
  );
};

export default Layout;