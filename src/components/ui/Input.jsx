import { clsx } from 'clsx';

export function Input({ className = '', ...props }) {
  return (
    <input
      className={clsx(
        'w-full rounded-lg border border-white/10 bg-charcoal px-3.5 py-2.5 text-sm text-white placeholder-zinc-500',
        'focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/20',
        'transition-all duration-200',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className = '', ...props }) {
  return (
    <textarea
      className={clsx(
        'w-full rounded-lg border border-white/10 bg-charcoal px-3.5 py-2.5 text-sm text-white placeholder-zinc-500',
        'focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/20',
        'transition-all duration-200 resize-y',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
}

export function Label({ className = '', children, ...props }) {
  return (
    <label className={clsx('block mb-1 text-xs font-semibold text-zinc-400', className)} {...props}>
      {children}
    </label>
  );
}