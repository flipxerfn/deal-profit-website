import { clsx } from 'clsx';

/**
 * ACCENTS
 * -------
 * Each pillar gets its own accent rather than four violet cards. The colours
 * are not decorative — they carry meaning that is already used consistently
 * across the site, so reusing them here teaches the mapping:
 *
 *   amber   → urgent. "Price Errors" are mis-prices that get corrected, so
 *             they are the one category where the window is closing. Amber is
 *             the caution colour on this site ("check the price before you
 *             buy") and this is the same warning.
 *   emerald → savings. "Penny Deals" is the headline saving, so it gets the
 *             stronger of the two greens.
 *   emerald → savings, quieter. "Hidden Discounts" is also money saved, so it
 *             stays green by the same rule — a lighter step rather than a
 *             different hue, because inventing a fourth colour for "also a
 *             discount" would break the mapping the reader just learned.
 *   violet  → brand. "Fast Alerts" is the promise, not a deal category.
 *
 * Green therefore means savings everywhere on this page, amber means urgent,
 * and violet stays the brand. An accent is never chosen for variety.
 */
const ACCENTS = {
  brand: {
    chip: 'bg-brand/10 text-brand',
    glow: 'rgba(139, 92, 246, 0.2)',
    glowHover: 'rgba(139, 92, 246, 0.35)',
    wash: 'from-brand/5',
    text: 'text-brand',
  },
  // Urgent — closing window.
  amber: {
    chip: 'bg-amber-400/10 text-amber-300',
    glow: 'rgba(251, 191, 36, 0.22)',
    glowHover: 'rgba(251, 191, 36, 0.38)',
    wash: 'from-amber-400/[0.07]',
    text: 'text-amber-300',
  },
  // Savings — the headline.
  emerald: {
    chip: 'bg-emerald-400/10 text-emerald-300',
    glow: 'rgba(52, 211, 153, 0.22)',
    glowHover: 'rgba(52, 211, 153, 0.38)',
    wash: 'from-emerald-400/[0.07]',
    text: 'text-emerald-300',
  },
  // Savings — quieter. Same hue family, lower presence.
  emeraldSoft: {
    chip: 'bg-emerald-400/[0.07] text-emerald-200/90',
    glow: 'rgba(52, 211, 153, 0.14)',
    glowHover: 'rgba(52, 211, 153, 0.26)',
    wash: 'from-emerald-400/[0.05]',
    text: 'text-emerald-200/90',
  },
};

export default function FeatureCard({
  icon: Icon,
  title,
  text,
  accent = 'brand',
  className = '',
}) {
  const a = ACCENTS[accent] ?? ACCENTS.brand;

  return (
    <div className={clsx('card card-hover group relative overflow-hidden p-5 sm:p-6', className)}>
      {/* The wash is opacity-driven, so hovering does not repaint the card —
          it only changes the alpha of a layer that is already there. */}
      <div
        className={clsx(
          'absolute inset-0 bg-gradient-to-br to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100',
          a.wash
        )}
        aria-hidden="true"
      />
      {/* The glow is passed as custom properties and cross-faded by
          `.accent-chip` in index.css. An inline boxShadow swap would not be
          interpolable, so the hover glow would snap instead of lift. */}
      <div
        className={clsx(
          'accent-chip relative mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg',
          a.chip
        )}
        style={{ '--chip-glow': a.glow, '--chip-glow-hover': a.glowHover }}
      >
        <Icon className="h-4 w-4" />
      </div>
      <h3 className={clsx('relative text-sm sm:text-base font-bold', a.text)}>{title}</h3>
      <p className="relative mt-2 text-xs sm:text-sm leading-relaxed text-zinc-400">{text}</p>
    </div>
  );
}

/**
 * Pillar order maps to WHAT_WE_HUNT in src/data/deals.js. The accents are
 * positional, which is only safe because that array is a fixed four-item
 * literal — if it ever becomes dynamic, the accent has to move into the data
 * alongside the title, or the colours silently shift meaning.
 */
export const PILLAR_ACCENTS = ['amber', 'emerald', 'emeraldSoft', 'brand'];