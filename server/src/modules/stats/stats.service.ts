import { prisma } from '../../lib/prisma';
import {
  ACTIVE_STATUSES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type TicketPriority,
  type TicketStatus,
} from '../../domain/constants';

function zeroed<K extends string>(keys: readonly K[]): Record<K, number> {
  return Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
}

export const statsService = {
  /** Queue health KPIs for the agent dashboard. */
  async summary(userId: string) {
    const active = { status: { in: [...ACTIVE_STATUSES] } };
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [byStatusRows, byPriorityRows, unassigned, overdue, assignedToMe, resolvedToday] =
      await prisma.$transaction([
        prisma.ticket.groupBy({ by: ['status'], _count: { _all: true }, orderBy: { status: 'asc' } }),
        prisma.ticket.groupBy({
          by: ['priority'],
          where: active,
          _count: { _all: true },
          orderBy: { priority: 'asc' },
        }),
        prisma.ticket.count({ where: { ...active, assigneeId: null } }),
        prisma.ticket.count({ where: { ...active, dueAt: { lt: new Date() } } }),
        prisma.ticket.count({ where: { ...active, assigneeId: userId } }),
        prisma.ticket.count({ where: { resolvedAt: { gte: startOfToday } } }),
      ]);

    const byStatus = zeroed(TICKET_STATUSES);
    for (const row of byStatusRows) {
      const count = row._count as { _all: number };
      byStatus[row.status as TicketStatus] = count._all;
    }

    const byPriority = zeroed(TICKET_PRIORITIES);
    for (const row of byPriorityRows) {
      const count = row._count as { _all: number };
      byPriority[row.priority as TicketPriority] = count._all;
    }

    const total = Object.values(byStatus).reduce((sum, n) => sum + n, 0);
    const activeCount = ACTIVE_STATUSES.reduce((sum, s) => sum + byStatus[s], 0);

    return {
      total,
      active: activeCount,
      unassigned,
      overdue,
      assignedToMe,
      resolvedToday,
      byStatus,
      byPriority,
    };
  },
};
