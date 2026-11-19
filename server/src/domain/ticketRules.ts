/**
 * Pure business rules for tickets. No I/O here, so everything is trivially unit-testable.
 */
import {
  ACTIVE_STATUSES,
  SLA_HOURS,
  type Role,
  type TicketPriority,
  type TicketStatus,
} from './constants';

/** Allowed status transitions (the ticket workflow state machine). */
export const STATUS_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  OPEN: ['IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'],
  PENDING: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['IN_PROGRESS', 'CLOSED'], // re-open goes back to IN_PROGRESS
  CLOSED: [],
};

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return STATUS_TRANSITIONS[from].includes(to);
}

export function getAllowedTransitions(from: TicketStatus): readonly TicketStatus[] {
  return STATUS_TRANSITIONS[from];
}

const HOUR_MS = 60 * 60 * 1000;

/** SLA due date based on priority, measured from `from` (defaults to now). */
export function calculateDueAt(priority: TicketPriority, from: Date = new Date()): Date {
  return new Date(from.getTime() + SLA_HOURS[priority] * HOUR_MS);
}

export function isActiveStatus(status: TicketStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

/** A ticket is overdue when it still needs attention and its SLA due date has passed. */
export function isOverdue(
  ticket: { status: TicketStatus; dueAt: Date },
  now: Date = new Date(),
): boolean {
  return isActiveStatus(ticket.status) && ticket.dueAt.getTime() < now.getTime();
}

export function isStaff(role: Role): boolean {
  return role === 'AGENT' || role === 'ADMIN';
}

interface Actor {
  id: string;
  role: Role;
}

interface TicketOwnership {
  requesterId: string;
  assigneeId: string | null;
}

export function canViewTicket(actor: Actor, ticket: TicketOwnership): boolean {
  return isStaff(actor.role) || ticket.requesterId === actor.id;
}

export function canCommentOnTicket(actor: Actor, ticket: TicketOwnership): boolean {
  return canViewTicket(actor, ticket);
}

export interface TicketChanges {
  status?: TicketStatus;
  priority?: TicketPriority;
  assigneeId?: string | null;
}

/**
 * Returns a human-readable reason why `actor` may NOT apply `changes`, or null if allowed.
 * - Staff may change status / priority / assignee.
 * - Customers may only close their own ticket.
 * - Only admins may assign a ticket to someone other than themselves.
 */
export function getUpdateDenialReason(
  actor: Actor,
  ticket: TicketOwnership,
  changes: TicketChanges,
): string | null {
  if (!canViewTicket(actor, ticket)) return 'You do not have access to this ticket';

  if (!isStaff(actor.role)) {
    const onlyClosing =
      changes.status === 'CLOSED' &&
      changes.priority === undefined &&
      changes.assigneeId === undefined;
    return onlyClosing ? null : 'Customers can only close their own tickets';
  }

  if (
    changes.assigneeId !== undefined &&
    changes.assigneeId !== null &&
    changes.assigneeId !== actor.id &&
    actor.role !== 'ADMIN'
  ) {
    return 'Only admins can assign tickets to other agents';
  }

  return null;
}
