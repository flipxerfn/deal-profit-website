import { clsx } from 'clsx';
import { useId } from 'react';

export function Select({ value, onChange, className = '', children, placeholder, ...props }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className={clsx(
        'w-full rounded-lg border border-white/10 bg-charcoal px-3.5 py-2.5 text-sm text-white',
        'focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/20',
        'transition-all duration-200 appearance-none cursor-pointer',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {children}
    </select>
  );
}

export function SelectTrigger({ className = '', children, ...props }) {
  const id = useId();
  return (
    <div className={clsx('relative', className)} {...props}>
      {children}
    </div>
  );
}

export function SelectContent({ className = '', children, ...props }) {
  return (
    <div className={clsx('absolute z-50 mt-1.5 w-full rounded-lg border border-white/10 bg-charcoal py-1.5', className)} {...props}>
      {children}
    </div>
  );
}

export function SelectItem({ value, className = '', children, ...props }) {
  return (
    <option value={value} className={clsx('px-3 py-2 text-sm text-white hover:bg-brand/10', className)} {...props}>
      {children}
    </option>
  );
}

export default Select;