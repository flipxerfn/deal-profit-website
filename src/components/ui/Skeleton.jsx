import { clsx } from 'clsx';

export function Skeleton({ className = '', ...props }) {
  return (
    <div
      className={clsx('animate-pulse bg-charcoal-2 rounded', className)}
      {...props}
    />
  );
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={clsx('overflow-hidden rounded-xl border border-white/10 bg-charcoal', className)}>
      <Skeleton className="aspect-[16/9] w-full" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  );
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={clsx('space-y-2', className)}>
      {[...Array(lines)].map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = 'md', className = '' }) {
  const sizes = {
    xs: 'h-6 w-6',
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };
  return <Skeleton className={clsx('rounded-full', sizes[size], className)} />;
}

export default Skeleton;