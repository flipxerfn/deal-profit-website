const base =
  'inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';

const variants = {
  primary:
    'bg-brand text-white shadow-[0_0_20px_rgba(244,63,142,0.28)] hover:bg-brand-2 hover:shadow-[0_0_26px_rgba(244,63,142,0.4)]',
  outline:
    'border border-white/15 bg-white/[0.03] text-zinc-200 hover:border-brand/50 hover:bg-brand/10 hover:text-brand',
  dark: 'border border-white/10 bg-white/[0.04] text-zinc-200 hover:border-brand/40 hover:bg-brand/10 hover:text-brand disabled:cursor-not-allowed disabled:opacity-60',
};

export function buttonClass(variant = 'primary', extra = '') {
  return `${base} ${variants[variant] || variants.primary} ${extra}`.trim();
}