/** Mirrors NOTIFICATION_TYPES in server/src/domain/constants.ts. */
export type NotificationType =
  | 'TICKET_CREATED'
  | 'TICKET_ASSIGNED'
  | 'STATUS_CHANGED'
  | 'PRIORITY_CHANGED'
  | 'NEW_REPLY'
  | 'INTERNAL_NOTE';

export interface AppNotification {
  id: string;
  type: NotificationType;
  message: string;
  ticketId: string;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationList {
  data: AppNotification[];
  meta: { unreadCount: number };
}
