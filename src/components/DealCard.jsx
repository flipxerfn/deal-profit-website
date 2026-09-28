import { FaBolt } from 'react-icons/fa6';
import { FaArrowRight, FaExternalLinkAlt, FaCheckCircle } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardHover, Badge } from './ui';
import { useReducedMotion } from '../lib/motion';
import { hostOf, isSourceLink, timeAgo } from '../lib/dealSource';

const dealOff = (deal) =>
  deal.referencePrice ? Math.round((1 - deal.price / deal.referencePrice) * 100) : null;

const DealCard = ({ deal, spotlight = false }) => {
  const off = dealOff(deal);
  const prefersReduced = useReducedMotion();
  const sourceHost = hostOf(deal.url ?? deal.cta?.href);
  const verifiable = isSourceLink(deal.url ?? deal.cta?.href);
  const caught = timeAgo(deal.postedAt);

  return (
    <CardHover
      className={`group relative flex flex-col overflow-hidden ${
        spotlight ? 'ring-1 ring-brand/40 shadow-[0_0_44px_rgba(244,63,94,0.18)]' : ''
      }`}
    >
      {spotlight && <div aria-hidden="true" className="shine-sweep pointer-events-none absolute inset-0 z-20" />}
      <div className="relative aspect-[16/9] overflow-hidden bg-charcoal-2">
        {deal.image ? (
          <div className={`h-full w-full ${spotlight ? 'spotlight-settle' : ''}`}>
            <motion.img
              src={deal.image}
              alt={deal.imageAlt}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              style={{ objectPosition: deal.imagePosition ?? 'center' }}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              whileHover={prefersReduced ? {} : { scale: 1.03 }}
            />
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(90%_140%_at_18%_0%,rgba(244,63,94,0.22),rgba(139,92,246,0.14)_48%,transparent_78%)]">
            <div className="flex flex-col items-center gap-2">
              <FaBolt className="h-8 w-8 text-brand-2" />
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-300">
                {deal.categoryLabel}
              </span>
            </div>
          </div>
        )}

        <div className="absolute left-3 top-3 flex items-center gap-2">
          {deal.badge && (
            <Badge variant="brand">{deal.badge}</Badge>
          )}
          <Badge variant="outline" className="bg-black/60 text-zinc-200 border-black/30">
            {deal.categoryLabel}
          </Badge>
        </div>

        {spotlight && off != null && (
          <div className="absolute right-3 top-3 z-10">
            <span className="sticker">{off}% OFF</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <h3 className="line-clamp-2 text-sm sm:text-base font-bold text-white">{deal.title}</h3>
        <p className="line-clamp-2 text-xs sm:text-sm leading-relaxed text-zinc-400">{deal.description}</p>

        <div className="mt-auto space-y-3">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span
              className={`font-extrabold tracking-tight text-brand ${
                spotlight ? 'text-xl sm:text-2xl drop-shadow-[0_0_14px_rgba(244,63,94,0.45)]' : 'text-xl sm:text-2xl'
              }`}
            >
              {deal.displayPrice || `$${deal.price.toFixed(2)}`}
            </span>
            {deal.referencePrice && (
              <span className="text-sm text-zinc-500 line-through">
                ${deal.referencePrice.toFixed(2)}
              </span>
            )}
            {off != null && (
              <Badge variant="glow">{off}% off</Badge>
            )}
          </div>

          {deal.meta && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
              {deal.meta.map((item, i) => (
                <span key={`${i}-${item}`} className="inline-flex items-center gap-1.5">
                  {item === 'Live now' ? (
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
                    </span>
                  ) : (
                    <span className="h-1 w-1 rounded-full bg-brand/70" />
                  )}
                  {item}
                </span>
              ))}
            </div>
          )}

          {/* Trust signals: where it came from and when it was caught. */}
          {verifiable ? (
            <div className="space-y-1.5 border-t border-white/5 pt-3 text-xs">
              <p className="flex items-center gap-1.5 text-emerald-300/90">
                <FaCheckCircle className="shrink-0" aria-hidden="true" />
                <span>
                  Live listing
                  {sourceHost ? (
                    <>
                      {' '}on <span className="font-semibold text-white">{sourceHost}</span>
                    </>
                  ) : null}
                </span>
              </p>
              <p className="text-zinc-500">
                {caught ? `Caught ${caught} — prices change fast.` : 'Open the listing to check the current price.'}
              </p>
            </div>
          ) : deal.archived ? (
            <div className="space-y-1.5 border-t border-white/5 pt-3 text-xs">
              <p className="font-semibold uppercase tracking-wider text-zinc-500">
                Example — no live listing
              </p>
              <p className="text-zinc-500">
                This is an archived example of a find, not a current deal. Today&apos;s real deals are posted
                as they&apos;re caught.
              </p>
            </div>
          ) : null}

          {deal.cta?.href ? (
            deal.cta.href.startsWith('/') ? (
              <Link to={deal.cta.href} className="btn btn-outline w-full">
                {deal.cta.label}
                <FaArrowRight className="text-xs" />
              </Link>
            ) : (
              <a
                href={deal.cta.href}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="btn btn-outline w-full"
              >
                {verifiable ? 'Check the live listing' : deal.cta.label}
                {verifiable ? <FaExternalLinkAlt className="text-xs" /> : <FaArrowRight className="text-xs" />}
              </a>
            )
          ) : (
            <span className="btn btn-outline w-full cursor-default opacity-60">
              {deal.cta?.label ?? 'No link'}
            </span>
          )}
        </div>
      </div>
    </CardHover>
  );
};

export default DealCard;