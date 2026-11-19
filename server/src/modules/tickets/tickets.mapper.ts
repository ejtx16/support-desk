import type { Prisma } from '@prisma/client';
import type { Role, TicketStatus } from '../../domain/constants';
import { getAllowedTransitions, isOverdue, isStaff } from '../../domain/ticketRules';
import { userSummarySelect } from '../users/users.mapper';

export const ticketListInclude = {
  requester: { select: userSummarySelect },
  assignee: { select: userSummarySelect },
  _count: { select: { comments: true } },
} satisfies Prisma.TicketInclude;

export const ticketDetailInclude = {
  requester: { select: userSummarySelect },
  assignee: { select: userSummarySelect },
  comments: { include: { author: { select: userSummarySelect } }, orderBy: { createdAt: 'asc' } },
  events: { include: { actor: { select: userSummarySelect } }, orderBy: { createdAt: 'asc' } },
} satisfies Prisma.TicketInclude;

type TicketListRow = Prisma.TicketGetPayload<{ include: typeof ticketListInclude }>;
type TicketDetailRow = Prisma.TicketGetPayload<{ include: typeof ticketDetailInclude }>;
type TicketBase = Omit<TicketListRow, '_count' | 'priorityRank'>;

function toBase({ priorityRank: _rank, ...ticket }: TicketBase & { priorityRank: number }) {
  return {
    ...ticket,
    isOverdue: isOverdue({ status: ticket.status as TicketStatus, dueAt: ticket.dueAt }),
  };
}

export function toTicketListItem({ _count, ...ticket }: TicketListRow) {
  return { ...toBase(ticket), commentCount: _count.comments };
}

/**
 * Detail view tailored to the viewer: customers never see internal notes and
 * only get the transitions they are allowed to perform (closing their own ticket).
 */
export function toTicketDetail(ticket: TicketDetailRow, viewer: { id: string; role: Role }) {
  const staff = isStaff(viewer.role);
  const { comments, events, ...rest } = ticket;
  const transitions = getAllowedTransitions(ticket.status as TicketStatus);

  return {
    ...toBase(rest),
    comments: staff ? comments : comments.filter((c) => !c.isInternal),
    events,
    allowedTransitions: staff ? transitions : transitions.filter((s) => s === 'CLOSED'),
  };
}

export type TicketListItemDto = ReturnType<typeof toTicketListItem>;
export type TicketDetailDto = ReturnType<typeof toTicketDetail>;
