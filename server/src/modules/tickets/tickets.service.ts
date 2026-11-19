import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import {
  ACTIVE_STATUSES,
  PRIORITY_WEIGHT,
  type Role,
  type TicketEventType,
  type TicketStatus,
} from '../../domain/constants';
import {
  calculateDueAt,
  canCommentOnTicket,
  canTransition,
  canViewTicket,
  getUpdateDenialReason,
  isStaff,
} from '../../domain/ticketRules';
import { AppError } from '../../utils/AppError';
import { notify, staffIds } from '../notifications/notifications.service';
import {
  ticketDetailInclude,
  ticketListInclude,
  toTicketDetail,
  toTicketListItem,
} from './tickets.mapper';
import type {
  CreateCommentInput,
  CreateTicketInput,
  ListTicketsQuery,
  UpdateTicketInput,
} from './tickets.schema';

export interface Actor {
  id: string;
  role: Role;
}

type Tx = Prisma.TransactionClient;

const FIRST_TICKET_NUMBER = 1001;

const STATUS_TEXT: Record<TicketStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  PENDING: 'Pending',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

async function actorName(tx: Tx, actorId: string) {
  const user = await tx.user.findUnique({ where: { id: actorId }, select: { name: true } });
  return user?.name ?? 'Someone';
}

const SORT_ORDER: Record<ListTicketsQuery['sort'], Prisma.TicketOrderByWithRelationInput[]> = {
  newest: [{ createdAt: 'desc' }],
  oldest: [{ createdAt: 'asc' }],
  priority: [{ priorityRank: 'desc' }, { dueAt: 'asc' }],
  dueAt: [{ dueAt: 'asc' }],
};

function buildListWhere(query: ListTicketsQuery, actor: Actor): Prisma.TicketWhereInput {
  const and: Prisma.TicketWhereInput[] = [];

  // Customers are always scoped to their own tickets.
  if (!isStaff(actor.role)) and.push({ requesterId: actor.id });

  if (query.status === 'ACTIVE') and.push({ status: { in: [...ACTIVE_STATUSES] } });
  else if (query.status) and.push({ status: query.status });

  if (query.priority) and.push({ priority: query.priority });
  if (query.category) and.push({ category: query.category });

  if (query.assignee === 'me') and.push({ assigneeId: actor.id });
  else if (query.assignee === 'unassigned') and.push({ assigneeId: null });
  else if (query.assignee) and.push({ assigneeId: query.assignee });

  if (query.overdue) {
    and.push({ status: { in: [...ACTIVE_STATUSES] }, dueAt: { lt: new Date() } });
  }

  if (query.q) {
    const asNumber = Number(query.q.replace(/^#/, ''));
    and.push({
      OR: [
        { title: { contains: query.q } },
        { description: { contains: query.q } },
        ...(Number.isInteger(asNumber) ? [{ number: asNumber }] : []),
      ],
    });
  }

  return and.length ? { AND: and } : {};
}

async function nextTicketNumber(tx: Tx): Promise<number> {
  const last = await tx.ticket.findFirst({ orderBy: { number: 'desc' }, select: { number: true } });
  return last ? last.number + 1 : FIRST_TICKET_NUMBER;
}

async function findTicketOrThrow(id: string, tx: Tx = prisma) {
  const ticket = await tx.ticket.findUnique({ where: { id } });
  if (!ticket) throw AppError.notFound('Ticket not found');
  return ticket;
}

async function loadDetail(id: string, viewer: Actor) {
  const ticket = await prisma.ticket.findUniqueOrThrow({
    where: { id },
    include: ticketDetailInclude,
  });
  return toTicketDetail(ticket, viewer);
}

function recordEvent(
  tx: Tx,
  ticketId: string,
  actorId: string,
  type: TicketEventType,
  fromValue: string | null = null,
  toValue: string | null = null,
) {
  return tx.ticketEvent.create({ data: { ticketId, actorId, type, fromValue, toValue } });
}

export const ticketsService = {
  async list(query: ListTicketsQuery, actor: Actor) {
    const where = buildListWhere(query, actor);
    const [total, rows] = await prisma.$transaction([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({
        where,
        include: ticketListInclude,
        orderBy: SORT_ORDER[query.sort],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      data: rows.map(toTicketListItem),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    };
  },

  async getById(id: string, actor: Actor) {
    const ticket = await findTicketOrThrow(id);
    // 404 (not 403) so customers cannot probe for other people's ticket ids.
    if (!canViewTicket(actor, ticket)) throw AppError.notFound('Ticket not found');
    return loadDetail(id, actor);
  },

  async create(input: CreateTicketInput, actor: Actor) {
    const ticket = await prisma.$transaction(async (tx) => {
      const created = await tx.ticket.create({
        data: {
          number: await nextTicketNumber(tx),
          title: input.title,
          description: input.description,
          category: input.category,
          priority: input.priority,
          priorityRank: PRIORITY_WEIGHT[input.priority],
          status: 'OPEN',
          dueAt: calculateDueAt(input.priority),
          requesterId: actor.id,
        },
      });
      await recordEvent(tx, created.id, actor.id, 'CREATED', null, 'OPEN');
      await notify(tx, {
        type: 'TICKET_CREATED',
        ticketId: created.id,
        actorId: actor.id,
        message: `${await actorName(tx, actor.id)} opened #${created.number}: ${created.title}`,
        recipientIds: await staffIds(tx),
      });
      return created;
    });
    return loadDetail(ticket.id, actor);
  },

  async update(id: string, input: UpdateTicketInput, actor: Actor) {
    await prisma.$transaction(async (tx) => {
      const ticket = await findTicketOrThrow(id, tx);
      if (!canViewTicket(actor, ticket)) throw AppError.notFound('Ticket not found');

      const denial = getUpdateDenialReason(actor, ticket, input);
      if (denial) throw AppError.forbidden(denial);

      const data: Prisma.TicketUncheckedUpdateInput = {};
      const currentStatus = ticket.status as TicketStatus;
      const name = await actorName(tx, actor.id);
      const ref = `#${ticket.number}`;
      // Queued and sent after the ticket row is updated; a rejected change rolls them back too.
      const pending: Parameters<typeof notify>[1][] = [];
      const base = { ticketId: id, actorId: actor.id };

      if (input.status && input.status !== currentStatus) {
        if (!canTransition(currentStatus, input.status)) {
          throw AppError.unprocessable(
            `Cannot move a ticket from ${currentStatus} to ${input.status}`,
          );
        }
        data.status = input.status;
        if (input.status === 'RESOLVED' || input.status === 'CLOSED') {
          data.resolvedAt = ticket.resolvedAt ?? new Date();
        } else {
          data.resolvedAt = null;
        }
        await recordEvent(tx, id, actor.id, 'STATUS_CHANGED', currentStatus, input.status);
        pending.push({
          ...base,
          type: 'STATUS_CHANGED',
          message: `${name} changed ${ref} to ${STATUS_TEXT[input.status]}`,
          recipientIds: [ticket.requesterId, input.assigneeId ?? ticket.assigneeId],
        });
      }

      if (input.priority && input.priority !== ticket.priority) {
        data.priority = input.priority;
        data.priorityRank = PRIORITY_WEIGHT[input.priority];
        // SLA is always measured from creation time.
        data.dueAt = calculateDueAt(input.priority, ticket.createdAt);
        await recordEvent(tx, id, actor.id, 'PRIORITY_CHANGED', ticket.priority, input.priority);
        pending.push({
          ...base,
          type: 'PRIORITY_CHANGED',
          message: `${name} changed the priority of ${ref} to ${input.priority.toLowerCase()}`,
          recipientIds: [input.assigneeId ?? ticket.assigneeId],
        });
      }

      if (input.assigneeId !== undefined && input.assigneeId !== ticket.assigneeId) {
        const [from, to] = await Promise.all([
          ticket.assigneeId ? tx.user.findUnique({ where: { id: ticket.assigneeId } }) : null,
          input.assigneeId ? tx.user.findUnique({ where: { id: input.assigneeId } }) : null,
        ]);
        if (input.assigneeId && (!to || !isStaff(to.role as Role))) {
          throw AppError.unprocessable('Assignee must be an existing agent');
        }
        data.assigneeId = input.assigneeId;
        await recordEvent(tx, id, actor.id, 'ASSIGNED', from?.name ?? null, to?.name ?? null);
        if (to) {
          pending.push({
            ...base,
            type: 'TICKET_ASSIGNED',
            message: `${name} assigned ${ref} to you: ${ticket.title}`,
            recipientIds: [to.id],
          });
          pending.push({
            ...base,
            type: 'TICKET_ASSIGNED',
            message: `${to.name} is now handling your ticket ${ref}`,
            recipientIds: [ticket.requesterId],
          });
        }
      }

      if (Object.keys(data).length) {
        await tx.ticket.update({ where: { id }, data });
      }
      for (const n of pending) await notify(tx, n);
    });
    return loadDetail(id, actor);
  },

  /** Agent claims a ticket. An OPEN ticket automatically moves to IN_PROGRESS. */
  async claim(id: string, actor: Actor) {
    if (!isStaff(actor.role)) throw AppError.forbidden('Only agents can claim tickets');
    const ticket = await findTicketOrThrow(id);
    if (ticket.status === 'CLOSED')
      throw AppError.unprocessable('Closed tickets cannot be claimed');

    return ticketsService.update(
      id,
      {
        assigneeId: actor.id,
        ...(ticket.status === 'OPEN' ? { status: 'IN_PROGRESS' as const } : {}),
      },
      actor,
    );
  },

  /**
   * Adds a reply or internal note. A customer replying to a PENDING (waiting on customer)
   * or RESOLVED ticket re-opens it for the team by moving it back to IN_PROGRESS.
   */
  async addComment(id: string, input: CreateCommentInput, actor: Actor) {
    await prisma.$transaction(async (tx) => {
      const ticket = await findTicketOrThrow(id, tx);
      if (!canCommentOnTicket(actor, ticket)) throw AppError.notFound('Ticket not found');
      if (ticket.status === 'CLOSED') {
        throw AppError.unprocessable('Closed tickets cannot receive new comments');
      }
      if (input.isInternal && !isStaff(actor.role)) {
        throw AppError.forbidden('Only agents can add internal notes');
      }

      await tx.comment.create({
        data: { ticketId: id, authorId: actor.id, body: input.body, isInternal: input.isInternal },
      });

      const name = await actorName(tx, actor.id);
      const ref = `#${ticket.number}`;
      if (input.isInternal) {
        await notify(tx, {
          type: 'INTERNAL_NOTE',
          ticketId: id,
          actorId: actor.id,
          message: `${name} added an internal note on ${ref}`,
          recipientIds: [ticket.assigneeId],
        });
      } else {
        // Public replies reach the customer and the agent who owns the ticket.
        await notify(tx, {
          type: 'NEW_REPLY',
          ticketId: id,
          actorId: actor.id,
          message: `${name} replied to ${ref}: ${ticket.title}`,
          recipientIds: [ticket.requesterId, ticket.assigneeId],
        });
      }

      const reopen =
        !isStaff(actor.role) && (ticket.status === 'PENDING' || ticket.status === 'RESOLVED');
      if (reopen) {
        await tx.ticket.update({
          where: { id },
          data: { status: 'IN_PROGRESS', resolvedAt: null },
        });
        await recordEvent(tx, id, actor.id, 'STATUS_CHANGED', ticket.status, 'IN_PROGRESS');
      } else {
        // Touch updatedAt so "recently active" ordering reflects new replies.
        await tx.ticket.update({ where: { id }, data: { updatedAt: new Date() } });
      }
    });
    return loadDetail(id, actor);
  },
};
