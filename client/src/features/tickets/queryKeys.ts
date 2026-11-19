import type { TicketFilters } from '@/types/api';

/** Hierarchical query keys: invalidating `all` refreshes every ticket query. */
export const ticketKeys = {
  all: ['tickets'] as const,
  lists: () => [...ticketKeys.all, 'list'] as const,
  list: (filters: TicketFilters) => [...ticketKeys.lists(), filters] as const,
  details: () => [...ticketKeys.all, 'detail'] as const,
  detail: (id: string) => [...ticketKeys.details(), id] as const,
  staff: ['users', 'staff'] as const,
};

export const statsKeys = {
  summary: ['stats', 'summary'] as const,
};
