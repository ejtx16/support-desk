import type { TicketCategory, TicketPriority, TicketSort, TicketStatus } from '@/types/api';

export const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  PENDING: 'Pending',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  BILLING: 'Billing',
  TECHNICAL: 'Technical',
  ACCOUNT: 'Account',
  OTHER: 'Other',
};

export const SORT_LABELS: Record<TicketSort, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  priority: 'Highest priority',
  dueAt: 'Due soonest',
};

/** Builds `<Select>` options from a label map, preserving key order. */
export function toOptions<K extends string>(labels: Record<K, string>) {
  return (Object.entries(labels) as [K, string][]).map(([value, label]) => ({ value, label }));
}
