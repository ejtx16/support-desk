import { apiClient } from '@/lib/apiClient';
import type { AppNotification, NotificationList } from './types';

export const notificationsApi = {
  list: (params: { unread?: boolean; limit?: number } = {}) =>
    apiClient
      .get<NotificationList>('/notifications', {
        params: { limit: params.limit ?? 20, ...(params.unread ? { unread: 'true' } : {}) },
      })
      .then((r) => r.data),

  markRead: (id: string) =>
    apiClient
      .patch<{ data: AppNotification }>(`/notifications/${id}/read`)
      .then((r) => r.data.data),

  markAllRead: () =>
    apiClient
      .post<{ data: { updated: number } }>('/notifications/read-all')
      .then((r) => r.data.data),
};
