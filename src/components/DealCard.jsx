import { FaBolt } from 'react-icons/fa6';
import { FaArrowRight } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { Card, CardHover, Badge } from './ui';
import { useReducedMotion } from '../lib/motion';

const dealOff = (deal) =>
  deal.referencePrice ? Math.round((1 - deal.price / deal.referencePrice) * 100) : null;

const DealCard = ({ deal }) => {
  const off = dealOff(deal);
  const prefersReduced = useReducedMotion();

  return (
    <CardHover className="group flex flex-col overflow-hidden">
      <div className="relative aspect-[16/9] overflow-hidden bg-charcoal-2">
        {deal.image ? (
          <motion.img
            src={deal.image}
            alt={deal.imageAlt}
            loading="lazy"
            referrerPolicy="no-referrer"
            style={{ objectPosition: deal.imagePosition ?? 'center' }}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            whileHover={prefersReduced ? {} : { scale: 1.03 }}
          />
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
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="text-base font-bold text-white">{deal.title}</h3>
        <p className="text-sm leading-relaxed text-zinc-400">{deal.description}</p>

        <div className="mt-auto space-y-3">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-2xl font-extrabold tracking-tight text-brand">
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
                  <span className="h-1 w-1 rounded-full bg-brand/70" />
                  {item}
                </span>
              ))}
            </div>
          )}

          {deal.cta?.href ? (
            <a
              href={deal.cta.href}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline w-full"
            >
              {deal.cta.label}
              <FaArrowRight className="text-xs" />
            </a>
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