import { Link, useNavigate } from 'react-router-dom';
import { CategoryBadge, PriorityBadge, SlaIndicator, StatusBadge } from '@/components/TicketBadges';
import { Avatar, DataTable, type Column } from '@/components/ui';
import { formatRelative } from '@/lib/formatDate';
import type { TicketListItem } from '@/types/api';

interface TicketTableProps {
  tickets: TicketListItem[];
  showRequester: boolean;
  empty?: React.ReactNode;
}

export function TicketTable({ tickets, showRequester, empty }: TicketTableProps) {
  const navigate = useNavigate();

  const columns: Column<TicketListItem>[] = [
    {
      key: 'title',
      header: 'Ticket',
      cell: (t) => (
        <div className="min-w-[14rem]">
          <Link
            to={`/tickets/${t.id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-medium text-slate-900 hover:text-brand-600"
          >
            <span className="mr-1.5 text-slate-400">#{t.number}</span>
            {t.title}
          </Link>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
            <CategoryBadge category={t.category} />
            {showRequester && <span>by {t.requester.name}</span>}
            {t.commentCount > 0 && <span>· {t.commentCount} replies</span>}
          </div>
        </div>
      ),
    },
    { key: 'status', header: 'Status', cell: (t) => <StatusBadge status={t.status} /> },
    { key: 'priority', header: 'Priority', cell: (t) => <PriorityBadge priority={t.priority} /> },
    {
      key: 'assignee',
      header: 'Assignee',
      hideOnMobile: true,
      cell: (t) =>
        t.assignee ? (
          <span className="flex items-center gap-2 text-slate-700">
            <Avatar name={t.assignee.name} size="sm" />
            {t.assignee.name}
          </span>
        ) : (
          <span className="text-slate-400">Unassigned</span>
        ),
    },
    {
      key: 'sla',
      header: 'SLA',
      hideOnMobile: true,
      cell: (t) => <SlaIndicator dueAt={t.dueAt} isOverdue={t.isOverdue} status={t.status} />,
    },
    {
      key: 'updated',
      header: 'Updated',
      hideOnMobile: true,
      cell: (t) => <span className="text-slate-500">{formatRelative(t.updatedAt)}</span>,
    },
  ];

  return (
    <DataTable
      caption="Tickets"
      columns={columns}
      rows={tickets}
      getRowKey={(t) => t.id}
      onRowClick={(t) => navigate(`/tickets/${t.id}`)}
      empty={empty}
    />
  );
}
