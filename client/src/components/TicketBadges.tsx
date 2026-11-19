import { Badge, type BadgeTone } from '@/components/ui';
import { formatRelative } from '@/lib/formatDate';
import { CATEGORY_LABELS, PRIORITY_LABELS, STATUS_LABELS } from '@/lib/labels';
import type { TicketCategory, TicketPriority, TicketStatus } from '@/types/api';

const STATUS_TONES: Record<TicketStatus, BadgeTone> = {
  OPEN: 'blue',
  IN_PROGRESS: 'purple',
  PENDING: 'amber',
  RESOLVED: 'green',
  CLOSED: 'gray',
};

const PRIORITY_TONES: Record<TicketPriority, BadgeTone> = {
  LOW: 'gray',
  MEDIUM: 'blue',
  HIGH: 'orange',
  URGENT: 'red',
};

const Dot = () => <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />;

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge tone={STATUS_TONES[status]} icon={<Dot />}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return <Badge tone={PRIORITY_TONES[priority]}>{PRIORITY_LABELS[priority]}</Badge>;
}

export function CategoryBadge({ category }: { category: TicketCategory }) {
  return <Badge tone="gray">{CATEGORY_LABELS[category]}</Badge>;
}

interface SlaIndicatorProps {
  dueAt: string;
  isOverdue: boolean;
  status: TicketStatus;
}

/** Shows the SLA due time, highlighted in red once overdue. */
export function SlaIndicator({ dueAt, isOverdue, status }: SlaIndicatorProps) {
  if (status === 'RESOLVED' || status === 'CLOSED') {
    return <span className="text-xs text-slate-400">—</span>;
  }
  if (isOverdue) {
    return (
      <Badge tone="red" icon={<Dot />}>
        Overdue {formatRelative(dueAt)}
      </Badge>
    );
  }
  return <span className="text-xs text-slate-600">Due {formatRelative(dueAt)}</span>;
}
