import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { statsKeys, ticketKeys } from '@/features/tickets/queryKeys';
import { getErrorMessage } from '@/lib/apiClient';
import { notificationsApi } from './api';
import type { AppNotification, NotificationList } from './types';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (unreadOnly: boolean) => [...notificationKeys.all, { unreadOnly }] as const,
};

/** How often the bell checks for new notifications. */
export const NOTIFICATION_POLL_MS = 20_000;

/**
 * Polls the inbox. When the unread count goes up, something changed on a ticket,
 * so ticket lists and dashboard stats are refreshed too: the app feels live
 * without websockets.
 */
export function useNotifications(unreadOnly = false) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: notificationKeys.list(unreadOnly),
    queryFn: () => notificationsApi.list({ unread: unreadOnly }),
    refetchInterval: NOTIFICATION_POLL_MS,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData, // no spinner flash when switching All / Unread
  });

  const unreadCount = query.data?.meta.unreadCount ?? 0;
  const previous = useRef<number | null>(null);
  useEffect(() => {
    if (previous.current !== null && unreadCount > previous.current) {
      void queryClient.invalidateQueries({ queryKey: ticketKeys.all });
      void queryClient.invalidateQueries({ queryKey: statsKeys.summary });
    }
    previous.current = unreadCount;
  }, [unreadCount, queryClient]);

  return { ...query, unreadCount };
}

/** Applies `update` to every cached inbox so the badge and list change instantly. */
function useUpdateCachedInboxes() {
  const queryClient = useQueryClient();
  return (update: (list: NotificationList) => NotificationList) => {
    const snapshots = queryClient.getQueriesData<NotificationList>({
      queryKey: notificationKeys.all,
    });
    for (const [key, list] of snapshots) {
      if (list) queryClient.setQueryData(key, update(list));
    }
    return snapshots;
  };
}

function useInboxMutation<TVars>(
  mutationFn: (vars: TVars) => Promise<unknown>,
  optimistic: (list: NotificationList, vars: TVars) => NotificationList,
) {
  const queryClient = useQueryClient();
  const updateCache = useUpdateCachedInboxes();

  return useMutation({
    mutationFn,
    onMutate: async (vars: TVars) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });
      return { snapshots: updateCache((list) => optimistic(list, vars)) };
    },
    onError: (error, _vars, context) => {
      context?.snapshots.forEach(([key, list]) => queryClient.setQueryData(key, list));
      toast.error(getErrorMessage(error));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

const markOne = (n: AppNotification, id: string, now: string) =>
  n.id === id && !n.readAt ? { ...n, readAt: now } : n;

export function useMarkNotificationRead() {
  return useInboxMutation(
    (id: string) => notificationsApi.markRead(id),
    (list, id) => {
      const target = list.data.find((n) => n.id === id);
      const wasUnread = target ? !target.readAt : false;
      const now = new Date().toISOString();
      return {
        data: list.data.map((n) => markOne(n, id, now)),
        meta: { unreadCount: Math.max(0, list.meta.unreadCount - (wasUnread ? 1 : 0)) },
      };
    },
  );
}

export function useMarkAllNotificationsRead() {
  return useInboxMutation(
    () => notificationsApi.markAllRead(),
    (list) => {
      const now = new Date().toISOString();
      return {
        data: list.data.map((n) => (n.readAt ? n : { ...n, readAt: now })),
        meta: { unreadCount: 0 },
      };
    },
  );
}
