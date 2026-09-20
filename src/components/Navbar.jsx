import { Link, NavLink } from 'react-router-dom';
import { FaBars, FaTimes } from 'react-icons/fa';
import dealProfitLogo from '../assets/deal-profit-logo.png';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '../lib/motion';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/deals', label: 'Deals' },
  { to: '/reviews', label: 'Reviews' },
  { to: '/trial', label: 'Trial' },
  { to: '/discord', label: 'Discord' },
  { to: '/upgrade', label: 'Upgrade' },
];

const TRIAL_URL = 'https://whop.com/deal-profit/deal-profit-01/';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const prefersReduced = useReducedMotion();
  const activeLinkRef = useRef(null);
  const indicatorRef = useRef(null);

  useEffect(() => {
    if (indicatorRef.current && activeLinkRef.current) {
      const activeLink = activeLinkRef.current.querySelector('[aria-current="page"]') || activeLinkRef.current.querySelector('.nav-link-active');
      if (activeLink) {
        indicatorRef.current.style.width = `${activeLink.offsetWidth}px`;
        indicatorRef.current.style.transform = `translateX(${activeLink.offsetLeft}px)`;
        indicatorRef.current.style.opacity = 1;
      }
    }
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-night/85 backdrop-blur">
      <nav className="mx-auto flex h-16 w-full max-w-[1152px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Deal Profit home">
          <img
            src={dealProfitLogo}
            alt=""
            className="h-8 w-auto drop-shadow-[0_0_12px_rgba(244,63,94,0.35)]"
          />
          <span className="text-[15px] font-bold tracking-tight text-white">
            Deal<span className="text-brand">Profit</span>
          </span>
        </Link>

        <div ref={activeLinkRef} className="relative hidden items-center gap-0.5 md:flex">
          <motion.div
            ref={indicatorRef}
            className="absolute bottom-0 left-0 h-0.5 bg-brand rounded-full transition-all duration-300 ease-out"
            style={{ width: 0, transform: 'translateX(0)', opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
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
            href={TRIAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary hidden whitespace-nowrap sm:inline-flex"
          >
            Start Free Trial
          </a>
          <a
            href={TRIAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary whitespace-nowrap px-3.5 sm:hidden"
          >
            Free Trial
          </a>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-300 hover:bg-white/5 md:hidden"
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isOpen}
          >
            {isOpen ? <FaTimes className="h-4 w-4" /> : <FaBars className="h-4 w-4" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: prefersReduced ? 0 : 0.2, ease: 'easeOut' }}
            className="border-t border-white/5 bg-night/95 backdrop-blur md:hidden overflow-hidden"
          >
            <div className="mx-auto max-w-[1152px] px-4 py-3 sm:px-6">
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