import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

export interface BreakdownItem {
  key: string;
  label: string;
  value: number;
  color: string;
  to?: string;
}

/** Horizontal labelled bars: a dependency-free way to show a distribution. */
export function BreakdownBar({ items }: { items: BreakdownItem[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const row = (
          <>
            <span className="w-24 shrink-0 text-sm text-slate-600">{item.label}</span>
            <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <span
                className={cn('block h-full rounded-full', item.color)}
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </span>
            <span className="w-8 text-right text-sm font-medium tabular-nums text-slate-900">
              {item.value}
            </span>
          </>
        );
        return (
          <li key={item.key}>
            {item.to ? (
              <Link to={item.to} className="flex items-center gap-3 rounded hover:bg-slate-50">
                {row}
              </Link>
            ) : (
              <div className="flex items-center gap-3">{row}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
