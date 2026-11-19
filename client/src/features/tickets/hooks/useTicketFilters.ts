import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_SORTS,
  TICKET_STATUSES,
  type TicketFilters,
} from '@/types/api';
import { toQueryParams } from '../api';

const STATUS_VALUES = [...TICKET_STATUSES, 'ACTIVE'] as const;

function pick<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

/** Parses untrusted URL params into typed filters (invalid values are ignored). */
export function parseFilters(params: URLSearchParams): TicketFilters {
  const page = Number(params.get('page'));
  return {
    status: pick(params.get('status'), STATUS_VALUES),
    priority: pick(params.get('priority'), TICKET_PRIORITIES),
    category: pick(params.get('category'), TICKET_CATEGORIES),
    assignee: params.get('assignee') || undefined,
    overdue: params.get('overdue') === 'true' || undefined,
    q: params.get('q') || undefined,
    sort: pick(params.get('sort'), TICKET_SORTS),
    page: Number.isInteger(page) && page > 1 ? page : undefined,
  };
}

/**
 * Ticket filters stored in the URL query string: shareable links, working
 * back/forward buttons, and dashboard cards can deep-link into a filtered queue.
 */
export function useTicketFilters() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(params), [params]);

  const setFilters = useCallback(
    (patch: Partial<TicketFilters>) => {
      // Any filter change except paging resets to page 1.
      const resetPage = !('page' in patch);
      const next = { ...parseFilters(params), ...patch, ...(resetPage ? { page: undefined } : {}) };
      setParams(toQueryParams(next), { replace: resetPage && 'q' in patch });
    },
    [params, setParams],
  );

  const clearFilters = useCallback(() => setParams({}), [setParams]);

  const activeCount = Object.entries(filters).filter(
    ([k, v]) => v !== undefined && k !== 'page' && k !== 'sort',
  ).length;

  return { filters, setFilters, clearFilters, activeCount };
}
