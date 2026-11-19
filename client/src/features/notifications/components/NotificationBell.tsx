import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState, ErrorState, Spinner } from '@/components/ui';
import { getErrorMessage } from '@/lib/apiClient';
import { cn } from '@/lib/cn';
import { formatBadge } from '../format';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '../hooks';
import type { AppNotification } from '../types';
import { NotificationItem } from './NotificationItem';

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

/**
 * Header bell: unread badge, dropdown inbox, mark-one / mark-all as read.
 * Clicking a notification opens its ticket.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data, unreadCount, isPending, isError, error, refetch } = useNotifications(unreadOnly);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const openNotification = (n: AppNotification) => {
    if (!n.readAt) markRead.mutate(n.id);
    setOpen(false);
    navigate(`/tickets/${n.ticketId}`);
  };

  const notifications = data?.data ?? [];
  const label = unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100',
          open && 'bg-slate-100 text-slate-900',
        )}
      >
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-white"
          >
            {formatBadge(unreadCount)}
          </span>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full z-40 mt-2 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Notifications</h2>
            <button
              type="button"
              onClick={() => markAllRead.mutate(undefined)}
              disabled={unreadCount === 0 || markAllRead.isPending}
              className="text-xs font-medium text-brand-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
            >
              Mark all as read
            </button>
          </div>

          <div role="tablist" aria-label="Filter notifications" className="flex gap-1 px-4 pt-3">
            {[
              { value: false, label: 'All' },
              { value: true, label: `Unread${unreadCount ? ` (${unreadCount})` : ''}` },
            ].map((tab) => (
              <button
                key={String(tab.value)}
                type="button"
                role="tab"
                aria-selected={unreadOnly === tab.value}
                onClick={() => setUnreadOnly(tab.value)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium',
                  unreadOnly === tab.value
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-500 hover:bg-slate-100',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="max-h-[26rem] overflow-y-auto py-2">
            {isPending ? (
              <div className="flex justify-center py-10">
                <Spinner label="Loading notifications" />
              </div>
            ) : isError ? (
              <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
            ) : notifications.length === 0 ? (
              <EmptyState
                title={unreadOnly ? 'No unread notifications' : "You're all caught up"}
                description="Updates on your tickets will show up here."
              />
            ) : (
              <ul aria-label="Notification list">
                {notifications.map((n) => (
                  <NotificationItem key={n.id} notification={n} onOpen={openNotification} />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
