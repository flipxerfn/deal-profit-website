import { clsx } from 'clsx';


/** Keep the eyebrow, title and description in normal flow. Independent
 * scroll transforms made adjacent lines overlap, especially on phones.
 */
export default function SectionHeader({ eyebrow, title, description, align = 'left', actions, className = '', titleId }) {
  const center = align === 'center';
  return (
    <div className={clsx('mb-8', center && 'text-center', className)}>
      {eyebrow && (
        <div>
          <p className={clsx('text-xs font-semibold uppercase tracking-wider text-brand', center && 'mx-auto')}>
            {eyebrow}
          </p>
        </div>
      )}
      {title && (
        <div>
          {/* titleId exists so a section can point aria-labelledby at this
              heading. Three sections on the home page were referencing
              "how-title", "hunt-title" and "social-title" — ids that were
              never rendered anywhere, so those sections were announced with no
              accessible name at all. */}
          <h2
            id={titleId}
            data-reveal
            className={clsx('mt-2 max-w-2xl text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-white text-balance', center && 'mx-auto')}
          >
            {title}
          </h2>
        </div>
      )}
      {description && (
        <div>
          <p className={clsx('mt-3 max-w-2xl text-sm sm:text-base leading-relaxed text-zinc-400', center && 'mx-auto')}>
            {description}
          </p>
        </div>
      )}
      {actions && (
        <div>
          <div className={clsx('mt-5', center && 'flex justify-center')}>{actions}</div>
        </div>
      )}
    </div>
  );
}