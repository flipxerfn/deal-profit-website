import { motion } from 'framer-motion';
import { FaBolt, FaCheckCircle, FaArrowRight } from 'react-icons/fa';
import { FaDiscord } from 'react-icons/fa6';
import { buttonClass } from './ui';
import { useReducedMotion, motionVariants, getMotionProps } from '../lib/motion';
import { hostOf, isSourceLink, timeAgo } from '../lib/dealSource';

const SpotlightDeal = ({ deal }) => {
  const prefersReduced = useReducedMotion();
  const off = deal.referencePrice ? Math.round((1 - deal.price / deal.referencePrice) * 100) : null;
  const img = deal.imageSquare || deal.image;

  // Same honesty rule as DealCard: only call a deal "live" when it actually
  // carries a source listing a reader can open and check themselves.
  const sourceHost = hostOf(deal.url ?? deal.cta?.href);
  const verifiable = isSourceLink(deal.url ?? deal.cta?.href);
  const caught = timeAgo(deal.postedAt);
  const headline = verifiable ? `${deal.categoryLabel || 'Find'} — live now` : 'Example of a find';

  return (
    <motion.section
      {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
      className="relative mb-8 overflow-hidden rounded-2xl border border-brand/25 bg-gradient-to-br from-charcoal via-charcoal-2 to-charcoal p-6 sm:p-8"
      aria-label="Spotlight deal"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand/15 blur-[80px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-glow/15 blur-[80px]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/50 to-transparent" />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div aria-hidden="true" className="grid-pattern absolute inset-0 opacity-[0.12]" />
      </div>

      {/* Capped and centred: without this the copy and the image drift apart
          once the page container reaches 1800px, leaving a dead gap. */}
      <div className="relative mx-auto grid max-w-5xl items-center gap-8 sm:grid-cols-[minmax(0,1fr)_clamp(200px,26%,300px)]">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand">
            {verifiable ? (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
              </span>
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
            )}
            {headline}
          </p>
          <h2 className="mt-2 line-clamp-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            {deal.title}
          </h2>
          <p className="mt-2 line-clamp-3 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
            {deal.description}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-4xl font-extrabold tracking-tight text-brand drop-shadow-[0_0_18px_rgba(244,63,94,0.4)]">
              {deal.displayPrice || `$${deal.price.toFixed(2)}`}
            </span>
            {deal.referencePrice && (
              <span className="text-lg text-zinc-500 line-through">${deal.referencePrice.toFixed(2)}</span>
            )}
            {off != null && <span className="sticker">{off}% OFF</span>}
          </div>

          {/* Provenance line — mirrors DealCard so the two can never disagree
              about whether something is actually buyable right now. */}
          {verifiable ? (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-emerald-300/90">
              <FaCheckCircle className="shrink-0" aria-hidden="true" />
              <span>
                Live listing
                {sourceHost ? (
                  <>
                    {' '}on <span className="font-semibold text-white">{sourceHost}</span>
                  </>
                ) : null}
                {caught ? ` — caught ${caught}` : ''}
              </span>
            </p>
          ) : (
            <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Example — no live listing
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {deal.cta?.href &&
              (deal.cta.href.startsWith('/') ? (
                <a href={deal.cta.href} className={buttonClass({ variant: 'primary', size: 'lg' })}>
                  {deal.cta.label}
                  <FaArrowRight className="text-xs" />
                </a>
              ) : (
                <a
                  href={deal.cta.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClass({ variant: 'primary', size: 'lg' })}
                >
                  {deal.cta.label}
                  <FaBolt className="text-xs" />
                </a>
              ))}
            <a
              href="https://discord.gg/dealprofit"
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass({ variant: 'outline', size: 'lg' })}
            >
              <FaDiscord className="text-[13px]" />
              Join Discord
            </a>
          </div>
        </div>

        {img && (
          <div className="mx-auto w-40 sm:w-full">
            <img
              src={img}
              alt={deal.imageAlt}
              decoding="async"
              loading="lazy"
              className="aspect-square w-full rounded-2xl object-cover ring-1 ring-white/10 shadow-[0_0_40px_rgba(244,63,94,0.25)]"
            />
          </div>
        )}
      </div>
    </motion.section>
  );
};

export default SpotlightDeal;