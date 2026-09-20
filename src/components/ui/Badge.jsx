import { clsx } from 'clsx';

const base = 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider';

const variants = {
  brand: 'bg-brand/15 border border-brand/30 text-brand',
  glow: 'bg-glow/15 border border-glow/30 text-glow-2',
  emerald: 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300',
  amber: 'bg-amber-500/15 border border-amber-500/30 text-amber-300',
  red: 'bg-red-500/15 border border-red-500/30 text-red-300',
  zinc: 'bg-zinc-500/15 border border-zinc-500/30 text-zinc-300',
  outline: 'border border-white/15 bg-white/[0.03] text-zinc-300',
};

export function Badge({ variant = 'brand', className = '', children, ...props }) {
  return (
    <span className={clsx(base, variants[variant] || variants.brand, className)} {...props}>
      {children}
    </span>
  );
}

export default Badge;