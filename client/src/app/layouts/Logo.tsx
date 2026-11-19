import { cn } from '@/lib/cn';

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-semibold text-slate-900', className)}>
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#4f46e5" />
        <path d="M9 11h14M9 16h14M9 21h9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      QueueDesk
    </span>
  );
}
