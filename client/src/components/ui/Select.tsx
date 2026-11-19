import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface SelectOption<V extends string = string> {
  value: V;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: SelectOption[];
  /** Renders a first empty option (value "") with this label. */
  placeholder?: string;
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, placeholder, invalid, className, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(
        'block h-10 w-full rounded-lg border bg-white px-3 pr-8 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 disabled:bg-slate-100',
        invalid
          ? 'border-rose-400 focus:ring-rose-500/30'
          : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500/30',
        className,
      )}
      {...props}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
});
