import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  /** A single form control; receives id + aria wiring automatically. */
  children: ReactElement;
  action?: ReactNode;
}

/** Label + control + error/hint, with accessible associations wired up. */
export function FormField({ label, error, hint, children, action }: FormFieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': error || hint ? messageId : undefined,
        invalid: Boolean(error),
      })
    : children;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="block text-sm font-medium text-slate-700">
          {label}
        </label>
        {action}
      </div>
      {control}
      {error ? (
        <p id={messageId} role="alert" className="text-xs text-rose-600">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
