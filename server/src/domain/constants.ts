/**
 * Single source of truth for enumerated values.
 * SQLite has no native enums, so the DB stores plain strings and
 * these tuples (plus the zod schemas built from them) enforce validity.
 */
export const ROLES = ['CUSTOMER', 'AGENT', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_CATEGORIES = ['BILLING', 'TECHNICAL', 'ACCOUNT', 'OTHER'] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const TICKET_EVENT_TYPES = [
  'CREATED',
  'STATUS_CHANGED',
  'PRIORITY_CHANGED',
  'ASSIGNED',
] as const;
export type TicketEventType = (typeof TICKET_EVENT_TYPES)[number];

export const NOTIFICATION_TYPES = [
  'TICKET_CREATED',
  'TICKET_ASSIGNED',
  'STATUS_CHANGED',
  'PRIORITY_CHANGED',
  'NEW_REPLY',
  'INTERNAL_NOTE',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const TICKET_SORTS = ['newest', 'oldest', 'priority', 'dueAt'] as const;
export type TicketSort = (typeof TICKET_SORTS)[number];

/** Statuses that still need attention (count towards queue / SLA). */
export const ACTIVE_STATUSES: readonly TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'PENDING'];

/** SLA response window per priority, in hours. */
export const SLA_HOURS: Record<TicketPriority, number> = {
  URGENT: 4,
  HIGH: 24,
  MEDIUM: 48,
  LOW: 72,
};

/** Numeric weight used for priority sorting (higher = more important). */
export const PRIORITY_WEIGHT: Record<TicketPriority, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  URGENT: 4,
};
