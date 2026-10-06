import { Link, NavLink, useLocation } from 'react-router-dom';
import { FaBars, FaTimes, FaCrown } from 'react-icons/fa';
import { FaMagnifyingGlass } from 'react-icons/fa6';
import dealProfitLogo from '../assets/deal-profit-logo.png';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '../lib/motion';
import { useAuth } from '../lib/useAuth';
import DiscordLogin from './DiscordLogin';
import SiteSearch from './SiteSearch';

// "/discord" was cut from this list earlier because a first-timer could not
// tell whether it joined the server or read a page about it, and it overlapped
// what "Deals" already covers. The page is still reachable from the footer.
//
// "/setup" is here because it is a purchase-gated service, not another view of
// the same thing: you buy Deal Feed Setup on Whop, then land here to hand over
// your server. Someone who just paid needs to find it, so it belongs beside
// "Upgrade" rather than buried in the footer with the legal links.
const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/deals', label: 'Deals' },
  { to: '/discord', label: 'Discord' },
  { to: '/reviews', label: 'Reviews' },
  { to: '/upgrade', label: 'Upgrade' },
  { to: '/setup-request', label: 'Deal Feed Setup' },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  // When the visitor taps the header's search icon we open the drawer AND focus
  // the field, so search is one tap away instead of "open hamburger, then hunt
  // for the box at the top of the panel". Opening via the hamburger leaves it
  // unfocused, which is what you want when you actually wanted the menu.
  const [focusSearch, setFocusSearch] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const prefersReduced = useReducedMotion();
  const { pathname } = useLocation();
  const activeLinkRef = useRef(null);
  const indicatorRef = useRef(null);
  const { signedIn, user, signIn } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const update = () => {
      if (!indicatorRef.current || !activeLinkRef.current) return;
      const activeLink = activeLinkRef.current.querySelector('[aria-current="page"]') || activeLinkRef.current.querySelector('.nav-link-active');
      if (!activeLink || activeLink.offsetWidth === 0) {
        indicatorRef.current.style.opacity = 0;
        return;
      }
      indicatorRef.current.style.width = `${activeLink.offsetWidth}px`;
      indicatorRef.current.style.transform = `translateX(${activeLink.offsetLeft}px)`;
      indicatorRef.current.style.opacity = 1;
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [pathname]);

  return (
    <header
      className={`sticky top-0 z-50 border-b backdrop-blur-xl transition-colors duration-300 ${
        scrolled ? 'border-white/10 bg-night/85 shadow-[0_12px_32px_rgba(0,0,0,0.35)]' : 'border-white/5 bg-night/60'
      }`}
    >
      <nav className="mx-auto flex h-16 w-full max-w-[1800px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Deal Profit — home">
          <img
            src={dealProfitLogo}
            alt=""
            className="h-8 w-auto"
          />
          {/* The space matters: the accessible name must contain the visible
              text verbatim, and "Deal Profit" is the actual brand name. */}
          <span className="text-[15px] font-bold tracking-tight text-white">
            Deal <span className="text-brand">Profit</span>
          </span>
        </Link>

        {/* Search sits left of the nav links so it's in the top-left area on
            every page, and stays out of the way on phones.

            This used to be `hidden xl:block`, which left every width from
            1024px to 1279px with no search bar at all: the navbar copy was
            hidden, and the drawer copy lives in a panel that is `lg:hidden`.
            A 1366px laptop in a normal browser window lands squarely in that
            gap. It now switches on with the nav links at `lg` and stays
            narrow until there is room to grow. */}
        <SiteSearch
          id="site-search-nav"
          className="mr-2 hidden w-40 min-w-0 lg:block xl:w-56"
        />

        <div ref={activeLinkRef} className="relative hidden items-center gap-0.5 lg:flex">
          <motion.div
            ref={indicatorRef}
            className="absolute bottom-0 left-0 h-0.5 rounded-full bg-gradient-to-r from-brand to-glow"
            style={{ transform: 'scaleX(0)', transformOrigin: 'left', opacity: 0 }}
            animate={{ transform: 'scaleX(1)', opacity: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `relative z-10 nav-link px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'text-white nav-link-active'
                    : 'text-zinc-300 hover:text-white'
                }`
              }
              aria-current={link.to === '/' ? 'page' : undefined}
            >
              {link.label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/upgrade"
            className="btn btn-primary hidden whitespace-nowrap sm:inline-flex"
          >
            <FaCrown className="text-xs" />
            Get Premium
          </a>
          {/* Discord is the account here, so this is the only sign-in. Signed
              out it reads as "Sign in"; signed in it shows who you are. */}
          {!signedIn ? (
            <DiscordLogin
              label="Sign in"
              size="sm"
              onClick={signIn}
              className="hidden sm:inline-flex"
            />
          ) : (
            <div
              className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm sm:flex"
              title={user?.username ? `Signed in as ${user.username}` : 'Signed in'}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
              <span className="max-w-[9rem] truncate text-zinc-200">
                {user?.username ?? 'Signed in'}
              </span>
            </div>
          )}
          <button
            onClick={() => {
              setFocusSearch(true);
              setIsOpen(true);
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-300 hover:bg-white/5 lg:hidden"
            aria-label="Search the site"
          >
            <FaMagnifyingGlass className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setFocusSearch(false);
              setIsOpen(!isOpen);
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-300 hover:bg-white/5 lg:hidden"
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isOpen}
          >
            {isOpen ? <FaTimes className="h-4 w-4" /> : <FaBars className="h-4 w-4" />}
          </button>
        </div>
      </nav>

      <div className="hairline-gradient h-px opacity-40" aria-hidden="true" />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: prefersReduced ? 0 : 0.2, ease: 'easeOut' }}
            className="border-t border-white/5 bg-night/95 backdrop-blur lg:hidden overflow-hidden"
          >
            <div className="mx-auto max-w-[1800px] px-4 py-3 sm:px-6">
              {/* Phones get search here, in the panel. It shares the document
                  with the navbar copy above, so the ids have to differ. */}
              <SiteSearch id="site-search-drawer" autoFocus={focusSearch} className="mb-3" />
              <a
                href="/upgrade"
                className="btn btn-primary w-full mb-3"
              >
                <FaCrown className="text-xs" />
                Get Premium
              </a>
              {/* Mobile has no room for the inline sign-in, so it lives here. */}
              {!signedIn ? (
                <DiscordLogin label="Sign in with Discord" onClick={signIn} className="mb-3 w-full" />
              ) : (
                <p className="mb-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">
                  Signed in as{' '}
                  <span className="font-semibold text-white">{user?.username ?? 'member'}</span>
                </p>
              )}
              {LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    `block rounded-lg px-4 py-3 text-base font-medium transition-colors ${
                      isActive ? 'text-brand bg-brand/10' : 'text-zinc-300 hover:text-white'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;