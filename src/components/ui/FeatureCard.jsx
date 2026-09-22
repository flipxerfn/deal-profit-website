import { clsx } from 'clsx';

export default function FeatureCard({ icon: Icon, title, text, className = '' }) {
  return (
    <div className={clsx('card card-hover group relative overflow-hidden p-5 sm:p-6', className)}>
      <div
        className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden="true"
      />
      <div className="relative mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand shadow-[0_0_16px_rgba(244,63,94,0.2)] transition-all duration-300 group-hover:bg-brand/20 group-hover:shadow-[0_0_24px_rgba(244,63,94,0.35)]">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="relative text-sm font-bold text-white">{title}</h3>
      <p className="relative mt-2 text-sm leading-relaxed text-zinc-400">{text}</p>
    </div>
  );
}