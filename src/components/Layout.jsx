import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, useScroll } from 'framer-motion';
import Navbar from './Navbar';
import Footer from './Footer';
import SiteCounter from './SiteCounter';
import { useReducedMotion } from '../lib/motion';

const Layout = () => {
  const { pathname } = useLocation();
  const prefersReduced = useReducedMotion();
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
        className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[520px] bg-[radial-gradient(40%_110%_at_88%_-12%,rgba(244,63,142,0.12),transparent_70%)]"
      />
      <Navbar />
      <main className="relative z-10 flex-1">
        <motion.div
          key={pathname}
          initial={prefersReduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            prefersReduced
              ? { duration: 0 }
              : { type: 'spring', stiffness: 220, damping: 26, mass: 0.8 }
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