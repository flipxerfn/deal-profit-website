import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

const Layout = () => {
  const { pathname } = useLocation();

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

  return (
    <div className="relative flex min-h-screen flex-col bg-night font-sans text-zinc-200 antialiased">
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
        <div className="mx-auto w-full max-w-[1152px] px-4 py-8 sm:px-6 md:py-12 lg:px-8">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Layout;