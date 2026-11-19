import { useEffect, useState } from 'react';
import { Button, Input, Select } from '@/components/ui';
import { useDebounce } from '@/hooks/useDebounce';
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  SORT_LABELS,
  STATUS_LABELS,
  toOptions,
} from '@/lib/labels';
import type { TicketFilters } from '@/types/api';

interface TicketFiltersBarProps {
  filters: TicketFilters;
  onChange: (patch: Partial<TicketFilters>) => void;
  onClear: () => void;
  activeCount: number;
  showAssignee: boolean;
}

const statusOptions = [
  { value: 'ACTIVE', label: 'Active (open, in progress, pending)' },
  ...toOptions(STATUS_LABELS),
];
const assigneeOptions = [
  { value: 'me', label: 'Assigned to me' },
  { value: 'unassigned', label: 'Unassigned' },
];

export function TicketFiltersBar({
  filters,
  onChange,
  onClear,
  activeCount,
  showAssignee,
}: TicketFiltersBarProps) {
  const [search, setSearch] = useState(filters.q ?? '');
  const debounced = useDebounce(search, 350);

  // Push debounced search into the URL.
  useEffect(() => {
    if ((filters.q ?? '') !== debounced) onChange({ q: debounced || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to typing
  }, [debounced]);

  // Keep the input in sync when filters are cleared / changed via navigation.
  useEffect(() => {
    setSearch(filters.q ?? '');
  }, [filters.q]);

  const set =
    <K extends keyof TicketFilters>(key: K) =>
    (e: React.ChangeEvent<HTMLSelectElement>) =>
      onChange({ [key]: (e.target.value || undefined) as TicketFilters[K] });

  return (
    <div className="space-y-3 border-b border-slate-100 px-5 py-4">
      <div className="flex flex-col gap-3 md:flex-row">
        <Input
          type="search"
          aria-label="Search tickets"
          placeholder="Search by title, description or #number"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="md:flex-1"
        />
        <Select
          aria-label="Sort by"
          options={toOptions(SORT_LABELS)}
          value={filters.sort ?? 'newest'}
          onChange={set('sort')}
          className="md:w-48"
        />
      </div>
      <div className="grid grid-cols-2 gap-3 md:flex md:flex-wrap md:items-center">
        <Select
          aria-label="Filter by status"
          placeholder="All statuses"
          options={statusOptions}
          value={filters.status ?? ''}
          onChange={set('status')}
          className="md:w-56"
        />
        <Select
          aria-label="Filter by priority"
          placeholder="All priorities"
          options={toOptions(PRIORITY_LABELS)}
          value={filters.priority ?? ''}
          onChange={set('priority')}
          className="md:w-40"
        />
        <Select
          aria-label="Filter by category"
          placeholder="All categories"
          options={toOptions(CATEGORY_LABELS)}
          value={filters.category ?? ''}
          onChange={set('category')}
          className="md:w-40"
        />
        {showAssignee && (
          <Select
            aria-label="Filter by assignee"
            placeholder="Anyone"
            options={assigneeOptions}
            value={filters.assignee ?? ''}
            onChange={set('assignee')}
            className="md:w-44"
          />
        )}
        <label className="col-span-2 inline-flex items-center gap-2 text-sm text-slate-700 md:col-span-1">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            checked={Boolean(filters.overdue)}
            onChange={(e) => onChange({ overdue: e.target.checked || undefined })}
          />
          Overdue only
        </label>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onClear} className="col-span-2 md:ml-auto">
            Clear filters ({activeCount})
          </Button>
        )}
      </div>
    </div>
  );
}
