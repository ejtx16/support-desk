import { cn } from '@/lib/cn';
import { formatDateTime, formatRelative } from '@/lib/formatDate';
import type { AppNotification, NotificationType } from '../types';

const TYPE_STYLES: Record<NotificationType, { label: string; dot: string }> = {
  TICKET_CREATED: { label: 'New ticket', dot: 'bg-sky-500' },
  TICKET_ASSIGNED: { label: 'Assigned', dot: 'bg-violet-500' },
  STATUS_CHANGED: { label: 'Status', dot: 'bg-emerald-500' },
  PRIORITY_CHANGED: { label: 'Priority', dot: 'bg-orange-500' },
  NEW_REPLY: { label: 'Reply', dot: 'bg-brand-500' },
  INTERNAL_NOTE: { label: 'Internal note', dot: 'bg-amber-500' },
};

interface NotificationItemProps {
  notification: AppNotification;
  onOpen: (notification: AppNotification) => void;
}

export function NotificationItem({ notification: n, onOpen }: NotificationItemProps) {
  const unread = !n.readAt;
  const style = TYPE_STYLES[n.type] ?? TYPE_STYLES.STATUS_CHANGED;

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(n)}
        className={cn(
          'flex w-full gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50',
          unread && 'bg-brand-50/40',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'mt-1.5 h-2 w-2 shrink-0 rounded-full',
            unread ? style.dot : 'bg-slate-200',
          )}
        />
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'block text-sm',
              unread ? 'font-medium text-slate-900' : 'text-slate-600',
            )}
          >
            {n.message}
          </span>
          <span className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
            <span>{style.label}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={n.createdAt} title={formatDateTime(n.createdAt)}>
              {formatRelative(n.createdAt)}
            </time>
            {unread && <span className="sr-only">(unread)</span>}
          </span>
        </span>
      </button>
    </li>
  );
}
