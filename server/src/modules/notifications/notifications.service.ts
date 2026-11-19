import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import type { NotificationType } from '../../domain/constants';
import { AppError } from '../../utils/AppError';

type Tx = Prisma.TransactionClient;

export interface NotifyInput {
  type: NotificationType;
  ticketId: string;
  /** The user who caused the event. They are never notified about their own actions. */
  actorId: string;
  message: string;
  /** Candidate recipients. Nulls, duplicates and the actor are filtered out. */
  recipientIds: (string | null | undefined)[];
}

/** Pure helper: who should actually receive a notification. */
export function resolveRecipients(
  recipientIds: (string | null | undefined)[],
  actorId: string,
): string[] {
  return [...new Set(recipientIds.filter((id): id is string => Boolean(id) && id !== actorId))];
}

/** Creates one notification per recipient. Runs inside the caller's transaction. */
export async function notify(tx: Tx, input: NotifyInput): Promise<number> {
  const userIds = resolveRecipients(input.recipientIds, input.actorId);
  if (userIds.length === 0) return 0;
  const { count } = await tx.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      ticketId: input.ticketId,
      type: input.type,
      message: input.message,
    })),
  });
  return count;
}

/** Ids of every agent and admin (new tickets go to the whole support team). */
export async function staffIds(tx: Tx): Promise<string[]> {
  const staff = await tx.user.findMany({
    where: { role: { in: ['AGENT', 'ADMIN'] } },
    select: { id: true },
  });
  return staff.map((u) => u.id);
}

const notificationSelect = {
  id: true,
  type: true,
  message: true,
  readAt: true,
  createdAt: true,
  ticketId: true,
} as const;

export const notificationsService = {
  async list(userId: string, { unread, limit }: { unread?: boolean; limit: number }) {
    const [data, unreadCount] = await prisma.$transaction([
      prisma.notification.findMany({
        where: { userId, ...(unread ? { readAt: null } : {}) },
        // id breaks ties between notifications created in the same millisecond (cuids sort by time).
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit,
        select: notificationSelect,
      }),
      prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    return { data, meta: { unreadCount } };
  },

  async markRead(userId: string, id: string) {
    const notification = await prisma.notification.findUnique({ where: { id } });
    // 404 for other people's notifications so ids can't be probed.
    if (!notification || notification.userId !== userId) {
      throw AppError.notFound('Notification not found');
    }
    return prisma.notification.update({
      where: { id },
      data: { readAt: notification.readAt ?? new Date() },
      select: notificationSelect,
    });
  },

  async markAllRead(userId: string) {
    const { count } = await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: count };
  },
};
