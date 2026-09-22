import { clsx } from 'clsx';

export default function CTASection({ eyebrow, title, description, actions, className = '' }) {
  return (
    <section className={clsx('relative mt-12 overflow-hidden rounded-xl border border-brand/20 p-8 md:mt-16 md:p-12', className)}>
      <div
        className="absolute inset-0 bg-[radial-gradient(120%_160%_at_20%_0%,rgba(244,63,94,0.22),rgba(139,92,246,0.12)_50%,transparent_80%)]"
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(244,63,94,0.1),transparent_70%)]" aria-hidden="true" />
      <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div className="max-w-xl">
          {eyebrow && <p className="text-xs font-semibold uppercase tracking-wider text-brand-2">{eyebrow}</p>}
          {title && <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h2>}
          {description && <p className="mt-3 text-sm leading-relaxed text-zinc-300 sm:text-base">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-col gap-3 sm:flex-row">{actions}</div>}
      </div>
    </section>
  );
}