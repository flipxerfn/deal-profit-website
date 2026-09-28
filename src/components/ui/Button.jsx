import { clsx } from 'clsx';

const base = 'inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 font-semibold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand/70 focus-visible:ring-offset-2 focus-visible:ring-offset-night disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98] whitespace-nowrap';

const variants = {
  // brand-3 (#e02d4a) gives white text 4.52:1 and the hover shade 5.48:1.
  // Plain brand was 3.67:1 and brand-2 2.72:1 — both fail WCAG AA, so neither
  // may sit behind white label text. These are real buttons, not the .btn
  // utility class, so they carry their own colours.
  primary: 'bg-brand-3 text-white shadow-[0_0_20px_rgba(224,45,74,0.28)] hover:bg-[#c92640] hover:shadow-[0_0_26px_rgba(224,45,74,0.4)]',
  outline: 'border border-white/15 bg-white/[0.03] text-zinc-200 hover:border-brand/50 hover:bg-brand/10 hover:text-brand',
  ghost: 'text-zinc-300 hover:text-white hover:bg-white/5',
  destructive: 'bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 hover:border-red-500/50',
  secondary: 'border border-white/10 bg-white/[0.04] text-zinc-200 hover:border-brand/40 hover:bg-brand/10 hover:text-brand',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
  xl: 'px-8 py-3.5 text-base',
  icon: 'p-2.5',
};

export function buttonClass({ variant = 'primary', size = 'md', className = '' } = {}) {
  return clsx(base, variants[variant] || variants.primary, sizes[size] || sizes.md, className);
}

export default function Button({ 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  children, 
  ...props 
}) {
  return (
    <button className={buttonClass({ variant, size, className })} {...props}>
      {children}
    </button>
  );
}