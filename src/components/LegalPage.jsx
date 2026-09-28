// Shared layout for the legal pages: full-bleed header, a sticky
// "on this page" index, readable measure, and a contact footer.
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaList, FaEnvelope, FaDiscord, FaShieldAlt } from 'react-icons/fa';
import { clsx } from 'clsx';
import { useReducedMotion, motionVariants, getMotionProps, useScrollReveal } from '../lib/motion';
import { CONTACT_EMAIL, DISCORD_INVITE } from '../content/legal/config';

const SIBLINGS = [
  { slug: 'terms', label: 'Terms of Service' },
  { slug: 'privacy', label: 'Privacy Policy' },
  { slug: 'refunds', label: 'Refund & Cancellation' },
];

// Minimal inline formatting for the policy copy: **bold** and _italic_.
const InlineText = ({ children }) => {
  if (typeof children !== 'string') return children;
  const parts = children.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
};

const LegalPage = ({ doc }) => {
  const prefersReduced = useReducedMotion();
  const [activeId, setActiveId] = useState(doc.sections[0]?.id);
  const [tocOpen, setTocOpen] = useState(false);
  const reveal = useScrollReveal();

  useEffect(() => {
    document.title = `${doc.title} — Deal Profit`;
    return () => {
      document.title = 'Deal Profit — Catch the deals before everyone else';
    };
  }, [doc.title]);

  // Highlight the section currently in view
  useEffect(() => {
    const headings = doc.sections
      .map((s) => document.getElementById(s.id))
      .filter(Boolean);
    if (!headings.length || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 }
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [doc.sections]);

  return (
    <section className="band-full band-bleed tint-brand relative pb-16 pt-10 md:pt-14" aria-labelledby="legal-title">
      <div className="radial-glow-hero pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={reveal.ref}
          {...getMotionProps(
            prefersReduced,
            reveal.isVisible ? motionVariants.scrollReveal : { initial: false, animate: { opacity: 1, y: 0 } }
          )}
          className="mx-auto max-w-5xl"
        >
          {/* Header */}
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-white"
          >
            <FaArrowLeft className="text-xs" />
            Back to site
          </Link>

          <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-brand-2">{doc.eyebrow}</p>
          <h1 id="legal-title" className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl">
            {doc.title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-400">{doc.intro}</p>
          <p className="mt-4 text-xs text-zinc-400">Last updated: {doc.updated}</p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {SIBLINGS.filter((s) => s.slug !== doc.slug).map((s) => (
              <Link
                key={s.slug}
                to={`/${s.slug}`}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-brand/50 hover:text-white"
              >
                {s.label}
              </Link>
            ))}
          </div>

          {/* Mobile TOC */}
          <button
            type="button"
            onClick={() => setTocOpen((v) => !v)}
            aria-expanded={tocOpen}
            className="mt-10 flex w-full items-center justify-between rounded-xl border border-white/10 bg-charcoal px-4 py-3 text-sm font-medium text-white lg:hidden"
          >
            <span className="flex items-center gap-2">
              <FaList className="text-brand" />
              On this page
            </span>
            <span className="text-zinc-400">{tocOpen ? '−' : '+'}</span>
          </button>
          {tocOpen && (
            <nav className="mt-2 flex flex-col gap-1 rounded-xl border border-white/10 bg-charcoal p-3 lg:hidden" aria-label="Sections">
              {doc.sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  onClick={() => setTocOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
                >
                  {s.heading}
                </a>
              ))}
            </nav>
          )}

          <div className="mt-8 grid gap-10 lg:grid-cols-[220px_1fr] lg:gap-14">
            {/* Desktop TOC */}
            <nav className="hidden lg:block" aria-label="Sections">
              <div className="sticky top-24">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">On this page</p>
                <ul className="mt-4 space-y-1 border-l border-white/10">
                  {doc.sections.map((s) => (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}`}
                        aria-current={activeId === s.id ? 'location' : undefined}
                        className={clsx(
                          '-ml-px block border-l-2 py-1.5 pl-3 text-sm leading-snug transition-colors',
                          activeId === s.id
                            ? 'border-brand font-medium text-white'
                            : 'border-transparent text-zinc-400 hover:text-zinc-300'
                        )}
                      >
                        {s.heading}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>

            {/* Body */}
            <div className="min-w-0">
              {doc.sections.map((s) => (
                <section key={s.id} id={s.id} className="scroll-mt-24 border-b border-white/5 pb-8 pt-8 first:pt-0 last:border-0">
                  <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{s.heading}</h2>
                  <div className="mt-4 space-y-4">
                    {s.body.map((p, i) => (
                      <p key={i} className="text-sm leading-relaxed text-zinc-400 sm:text-base">
                        <InlineText>{p}</InlineText>
                      </p>
                    ))}
                    {s.list && (
                      <ul className="space-y-2.5">
                        {s.list.map((item, i) => (
                          <li key={i} className="flex gap-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
                            <FaShieldAlt className="mt-1 shrink-0 text-xs text-brand" aria-hidden="true" />
                            <span>
                              <InlineText>{item}</InlineText>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>
              ))}

              {/* Contact */}
              <div className="card mt-10 border-white/10 p-6 sm:p-8">
                <h2 className="text-lg font-bold text-white">Questions?</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Email <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand hover:underline">{CONTACT_EMAIL}</a>{' '}
                  or reach the community on Discord.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <a href={`mailto:${CONTACT_EMAIL}`} className="btn btn-outline text-sm">
                    <FaEnvelope className="text-xs" />
                    Email us
                  </a>
                  <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer" className="btn btn-outline text-sm">
                    <FaDiscord className="text-xs" />
                    Join Discord
                  </a>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default LegalPage;
