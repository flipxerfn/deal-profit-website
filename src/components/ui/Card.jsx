import { clsx } from 'clsx';

const base = 'rounded-xl border border-white/10 bg-charcoal transition-all duration-300';

export function Card({ className = '', children, ...props }) {
  return <div className={clsx(base, className)} {...props}>{children}</div>;
}

export function CardHeader({ className = '', children, ...props }) {
  return <div className={clsx('px-6 pt-6 pb-2', className)} {...props}>{children}</div>;
}

export function CardTitle({ className = '', children, ...props }) {
  return <h3 className={clsx('text-base font-bold text-white', className)} {...props}>{children}</h3>;
}

export function CardDescription({ className = '', children, ...props }) {
  return <p className={clsx('mt-1 text-sm text-zinc-400', className)} {...props}>{children}</p>;
}

export function CardContent({ className = '', children, ...props }) {
  return <div className={clsx('px-6 pb-6', className)} {...props}>{children}</div>;
}

export function CardFooter({ className = '', children, ...props }) {
  return <div className={clsx('flex items-center px-6 pb-4', className)} {...props}>{children}</div>;
}

export function CardHover({ className = '', children, ...props }) {
  return (
    <Card className={clsx('card-hover', className)} {...props}>
      {children}
    </Card>
  );
}

export default Card;