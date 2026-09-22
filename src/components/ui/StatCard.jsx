import { clsx } from 'clsx';

export default function StatCard({ icon: Icon, value, label, className = '' }) {
  return (
    <div className={clsx('card group relative overflow-hidden p-5 text-center', className)}>
      <div
        className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden="true"
      />
      <div className="relative mx-auto mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
        <Icon className="h-4 w-4" />
      </div>
      <p className="relative text-2xl font-extrabold tracking-tight text-white">{value}</p>
      <p className="relative mt-0.5 text-xs text-zinc-400">{label}</p>
    </div>
  );
}