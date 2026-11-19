import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

interface StatCardProps {
  label: string;
  value: number;
  /** Deep link into the filtered queue. */
  to?: string;
  tone?: 'default' | 'danger' | 'success' | 'brand';
  hint?: string;
}

const tones = {
  default: 'text-slate-900',
  danger: 'text-rose-600',
  success: 'text-emerald-600',
  brand: 'text-brand-600',
};

export function StatCard({ label, value, to, tone = 'default', hint }: StatCardProps) {
  const content = (
    <>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={cn('mt-2 text-3xl font-semibold tabular-nums', tones[tone])}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </>
  );
  const className = 'block rounded-xl border border-slate-200 bg-white p-5 shadow-sm';

  return to ? (
    <Link
      to={to}
      className={cn(className, 'transition hover:border-brand-500 hover:shadow')}
      aria-label={`${label}: ${value}. View tickets`}
    >
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
