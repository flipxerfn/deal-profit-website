import { clsx } from 'clsx';

export function Avatar({ className = '', src, alt, children, size = 'md', ...props }) {
  const sizes = {
    xs: 'h-6 w-6 text-xs',
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg',
    xl: 'h-16 w-16 text-xl',
  };

  return (
    <div className={clsx('relative inline-flex shrink-0 overflow-hidden rounded-full', className)} {...props}>
      {src ? (
        <img src={src} alt={alt} className={clsx('h-full w-full object-cover', sizes[size])} />
      ) : (
        <div
          className={clsx(
            'relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-brand/30 via-charcoal-3 to-glow/30 font-bold text-white ring-2 ring-brand/40 shadow-[0_0_16px_rgba(244,63,94,0.25)]',
            sizes[size]
          )}
        >
          <span
            className="absolute inset-0 rounded-full bg-gradient-to-br from-brand/30 to-glow/30 opacity-50 blur-sm"
            aria-hidden="true"
          />
          <span className="relative">{children}</span>
        </div>
      )}
    </div>
  );
}

export function AvatarFallback({ children, className = '', ...props }) {
  return <div className={clsx('flex h-full w-full items-center justify-center', className)} {...props}>{children}</div>;
}

export default Avatar;