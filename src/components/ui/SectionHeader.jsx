import { clsx } from 'clsx';
import { ScrollLayer } from '../ScrollText';

/**
 * Every section heading on every page goes through here, so this is the one
 * place scroll-linked text has to live.
 *
 * The eyebrow, the title and the description each travel at a different rate
 * and in alternating directions as the section passes through the viewport.
 * A heading that slides as one block reads as a slideshow; a heading whose
 * parts separate reads as a page with depth. The rates are deliberately close
 * together — too much spread and the lines visibly pull apart instead of
 * drifting, which looks broken rather than layered.
 */
export default function SectionHeader({ eyebrow, title, description, align = 'left', actions, className = '', titleId }) {
  const center = align === 'center';
  return (
    <div className={clsx('mb-8', center && 'text-center', className)}>
      {eyebrow && (
        <ScrollLayer depth={0} base={16}>
          <p className={clsx('text-xs font-semibold uppercase tracking-wider text-brand', center && 'mx-auto')}>
            {eyebrow}
          </p>
        </ScrollLayer>
      )}
      {title && (
        <ScrollLayer depth={1} base={26}>
          {/* titleId exists so a section can point aria-labelledby at this
              heading. Three sections on the home page were referencing
              "how-title", "hunt-title" and "social-title" — ids that were
              never rendered anywhere, so those sections were announced with no
              accessible name at all. */}
          <h2
            id={titleId}
            data-reveal
            className="mt-2 max-w-2xl text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-white text-balance"
          >
            {title}
          </h2>
        </ScrollLayer>
      )}
      {description && (
        <ScrollLayer depth={2} base={20}>
          <p className={clsx('mt-3 max-w-2xl text-sm sm:text-base leading-relaxed text-zinc-400', center && 'mx-auto')}>
            {description}
          </p>
        </ScrollLayer>
      )}
      {actions && (
        <ScrollLayer depth={3} base={14}>
          <div className={clsx('mt-5', center && 'flex justify-center')}>{actions}</div>
        </ScrollLayer>
      )}
    </div>
  );
}