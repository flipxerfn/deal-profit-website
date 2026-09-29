import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FaMagnifyingGlass } from 'react-icons/fa6';
import { search } from '../lib/search';
import { useReducedMotion } from '../lib/motion';

// Site-wide search, living in the navbar so it is available on every page.
//
// Two deliberate choices:
//  - "/" focuses it and Escape closes it, so it costs no clicks for people who
//    already know the shortcut (the deals page uses "/" for its own filter, so
//    we only bind the shortcut when that field isn't focused).
//  - Results are links, not click handlers, so middle-click and "open in new
//    tab" behave the way they do everywhere else on the web.
export default function SiteSearch({ className = '' }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();

  const results = useMemo(() => (query.trim().length < 2 ? [] : search(query)), [query]);

  // Reset the highlighted row whenever the result set changes underneath it.
  useEffect(() => {
    setActive(0);
  }, [query]);

  const go = useCallback(
    (entry) => {
      if (!entry) return;
      setOpen(false);
      setQuery('');
      inputRef.current?.blur();
      navigate(`${entry.to}${entry.hash ?? ''}`);
    },
    [navigate]
  );

  const close = useCallback(() => {
    setOpen(false);
    inputRef.current?.blur();
  }, []);

  // "/" shortcut, unless the visitor is already typing somewhere.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
      if (typing) return;
      e.preventDefault();
      inputRef.current?.focus();
      setOpen(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Clicking anywhere else dismisses the panel.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      close();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (results.length ? (i + 1) % results.length : 0));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      go(results[active]);
    }
  };

  const showPanel = open && query.trim().length >= 2;

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <label className="sr-only" htmlFor="site-search">
        Search the site
      </label>
      <div className="relative">
        <FaMagnifyingGlass
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500"
          aria-hidden="true"
        />
        <input
          id="site-search"
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search…"
          autoComplete="off"
          aria-label="Search the site"
          aria-expanded={showPanel}
          aria-controls="site-search-results"
          className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2 pl-9 pr-8 text-sm text-white placeholder-zinc-500 transition-colors focus:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        {!query && (
          <kbd
            aria-hidden="true"
            className="kbd pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 hidden lg:block"
          >
            /
          </kbd>
        )}
      </div>

      <AnimatePresence>
        {showPanel && (
          <motion.div
            id="site-search-results"
            role="listbox"
            aria-label="Search results"
            initial={prefersReduced ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: prefersReduced ? 0 : 0.15, ease: 'easeOut' }}
            className="absolute left-0 top-full z-50 mt-2 w-[min(34rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-white/10 bg-charcoal shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
          >
            {results.length === 0 ? (
              <p className="px-4 py-5 text-sm text-zinc-500">
                Nothing matches “{query.trim()}”.
              </p>
            ) : (
              <ul className="max-h-[70vh] overflow-y-auto py-1">
                {results.map((r, i) => (
                  <li key={`${r.to}${r.hash}${r.label}`}>
                    <a
                      href={`${r.to}${r.hash ?? ''}`}
                      role="option"
                      aria-selected={i === active}
                      onClick={(e) => {
                        e.preventDefault();
                        go(r);
                      }}
                      onMouseEnter={() => setActive(i)}
                      className={`block px-4 py-2.5 transition-colors ${
                        i === active ? 'bg-brand/10' : ''
                      }`}
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">
                          {r.label}
                        </span>
                        <span className="shrink-0 text-[10px] uppercase tracking-wider text-zinc-500">
                          {r.group}
                        </span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-zinc-400">
                        {r.blurb}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
