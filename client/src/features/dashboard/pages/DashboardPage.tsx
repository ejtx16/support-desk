import { PageHeader } from '@/components/PageHeader';
import {
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorState,
  PageLoader,
} from '@/components/ui';
import { useCurrentUser } from '@/features/auth/store';
import { TicketTable } from '@/features/tickets/components/TicketTable';
import { useTickets } from '@/features/tickets/hooks/useTickets';
import { getErrorMessage } from '@/lib/apiClient';
import { PRIORITY_LABELS, STATUS_LABELS } from '@/lib/labels';
import { TICKET_PRIORITIES, TICKET_STATUSES } from '@/types/api';
import { useStatsSummary } from '../api';
import { BreakdownBar } from '../components/BreakdownBar';
import { StatCard } from '../components/StatCard';

const STATUS_COLORS = {
  OPEN: 'bg-sky-500',
  IN_PROGRESS: 'bg-violet-500',
  PENDING: 'bg-amber-500',
  RESOLVED: 'bg-emerald-500',
  CLOSED: 'bg-slate-400',
} as const;

const PRIORITY_COLORS = {
  URGENT: 'bg-rose-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-sky-500',
  LOW: 'bg-slate-400',
} as const;

export default function DashboardPage() {
  const { user } = useCurrentUser();
  const stats = useStatsSummary();
  // "Needs attention": the most urgent unassigned work.
  const urgent = useTickets({
    status: 'ACTIVE',
    assignee: 'unassigned',
    sort: 'priority',
    pageSize: 5,
  });

  if (stats.isPending) return <PageLoader label="Loading dashboard" />;
  if (stats.isError) {
    return (
      <ErrorState message={getErrorMessage(stats.error)} onRetry={() => void stats.refetch()} />
    );
  }

  const s = stats.data;
  const firstName = user?.name.split(' ')[0] ?? 'there';

  return (
    <>
      <PageHeader
        title={`Hi ${firstName}`}
        description="Here's how the support queue looks right now."
        actions={<ButtonLink to="/tickets?status=ACTIVE&sort=priority">Open queue</ButtonLink>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Active" value={s.active} to="/tickets?status=ACTIVE" tone="brand" />
        <StatCard
          label="Unassigned"
          value={s.unassigned}
          to="/tickets?status=ACTIVE&assignee=unassigned&sort=priority"
        />
        <StatCard
          label="Overdue"
          value={s.overdue}
          to="/tickets?overdue=true&sort=dueAt"
          tone={s.overdue > 0 ? 'danger' : 'default'}
          hint="Past SLA due date"
        />
        <StatCard
          label="Assigned to me"
          value={s.assignedToMe}
          to="/tickets?status=ACTIVE&assignee=me"
        />
        <StatCard
          label="Resolved today"
          value={s.resolvedToday}
          to="/tickets?status=RESOLVED"
          tone="success"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="By status" description={`${s.total} tickets in total`} />
          <CardBody>
            <BreakdownBar
              items={TICKET_STATUSES.map((status) => ({
                key: status,
                label: STATUS_LABELS[status],
                value: s.byStatus[status],
                color: STATUS_COLORS[status],
                to: `/tickets?status=${status}`,
              }))}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Active by priority" description="Open, in progress and pending" />
          <CardBody>
            <BreakdownBar
              items={[...TICKET_PRIORITIES].reverse().map((priority) => ({
                key: priority,
                label: PRIORITY_LABELS[priority],
                value: s.byPriority[priority],
                color: PRIORITY_COLORS[priority],
                to: `/tickets?status=ACTIVE&priority=${priority}`,
              }))}
            />
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Needs an owner"
          description="Highest-priority active tickets nobody has claimed yet."
          action={
            <ButtonLink
              to="/tickets?status=ACTIVE&assignee=unassigned&sort=priority"
              variant="ghost"
              size="sm"
            >
              View all
            </ButtonLink>
          }
        />
        {urgent.isPending ? (
          <PageLoader />
        ) : (
          <TicketTable
            tickets={urgent.data?.data ?? []}
            showRequester
            empty={<EmptyState title="Every active ticket has an owner" description="Nice work." />}
          />
        )}
      </Card>
    </>
  );
}
