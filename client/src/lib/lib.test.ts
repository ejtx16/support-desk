import { describe, expect, it } from 'vitest';
import { toQueryParams } from '@/features/tickets/api';
import { parseFilters } from '@/features/tickets/hooks/useTicketFilters';
import { formatRelative } from './formatDate';
import { STATUS_LABELS, toOptions } from './labels';

describe('formatRelative', () => {
  const now = new Date('2026-06-01T12:00:00Z');

  it.each([
    ['2026-06-01T11:59:40Z', 'just now'],
    ['2026-06-01T11:45:00Z', '15 minutes ago'],
    ['2026-06-01T15:00:00Z', 'in 3 hours'],
    ['2026-05-30T12:00:00Z', '2 days ago'],
  ])('%s -> %s', (value, expected) => {
    expect(formatRelative(value, now)).toBe(expected);
  });
});

describe('toOptions', () => {
  it('keeps label map order', () => {
    expect(toOptions(STATUS_LABELS)[0]).toEqual({ value: 'OPEN', label: 'Open' });
    expect(toOptions(STATUS_LABELS)).toHaveLength(5);
  });
});

describe('ticket filter <-> URL mapping', () => {
  it('parses valid params and ignores junk', () => {
    const params = new URLSearchParams(
      'status=ACTIVE&priority=NOPE&overdue=true&page=3&sort=dueAt&q=login',
    );
    expect(parseFilters(params)).toEqual({
      status: 'ACTIVE',
      priority: undefined,
      category: undefined,
      assignee: undefined,
      overdue: true,
      q: 'login',
      sort: 'dueAt',
      page: 3,
    });
  });

  it('treats page 1 and invalid pages as the default', () => {
    expect(parseFilters(new URLSearchParams('page=1')).page).toBeUndefined();
    expect(parseFilters(new URLSearchParams('page=abc')).page).toBeUndefined();
  });

  it('serialises only active filters', () => {
    expect(
      toQueryParams({ status: 'OPEN', q: '', overdue: false, priority: undefined, page: 2 }),
    ).toEqual({ status: 'OPEN', page: '2' });
  });
});
