import { clsx } from 'clsx';

export default function SectionHeader({ eyebrow, title, description, align = 'left', actions, className = '' }) {
  const center = align === 'center';
  return (
    <div className={clsx('mb-8', center && 'text-center', className)}>
      {eyebrow && (
        <p className={clsx('text-xs font-semibold uppercase tracking-wider text-brand', center && 'mx-auto')}>
          {eyebrow}
        </p>
      )}
      {title && (
        <h2 className="mt-2 max-w-2xl text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-white text-balance">
          {title}
        </h2>
      )}
      {description && (
        <p className={clsx('mt-3 max-w-2xl text-sm sm:text-base leading-relaxed text-zinc-400', center && 'mx-auto')}>
          {description}
        </p>
      )}
      {actions && <div className={clsx('mt-5', center && 'flex justify-center')}>{actions}</div>}
    </div>
  );
}