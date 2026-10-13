import { clsx } from 'clsx';

export function Avatar({ className = '', src, alt, children, size = 'md', ...props }) {
  const sizes = {
    xs: 'h-6 w-6 text-xs',
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg',
    xl: 'h-16 w-16 text-xl',
  };

  // The size classes belong on the ROOT, not the inner element.
  //
  // They used to be applied to the inner div, which also carries `h-full
  // w-full`. Both set width and height, so which one won came down to their
  // order in the generated stylesheet — and `h-full w-full` won, making every
  // avatar size itself to its own contents. Measured on the /discord member
  // row: five `size="sm"` avatars rendered 13-16px wide instead of 32px, so
  // the row read as one squashed blob rather than five overlapping faces.
  //
  // Sizing the root fixes every call site at once: the root is `inline-flex
  // shrink-0`, so the box is exactly `size` and the inner element fills it.
  return (
    <div
      className={clsx(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        sizes[size],
        className
      )}
      {...props}
    >
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div className="relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-brand/30 via-charcoal-3 to-glow/30 font-bold text-white ring-2 ring-brand/40 shadow-[0_0_16px_rgba(139,92,246,0.25)]">
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