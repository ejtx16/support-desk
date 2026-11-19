import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { CategoryBadge, PriorityBadge, SlaIndicator, StatusBadge } from '@/components/TicketBadges';
import { Avatar, Card, CardBody, CardHeader, ErrorState, PageLoader } from '@/components/ui';
import { useCurrentUser } from '@/features/auth/store';
import { getErrorMessage, toApiError } from '@/lib/apiClient';
import { formatDateTime } from '@/lib/formatDate';
import NotFoundPage from '@/pages/NotFoundPage';
import { ActivityFeed } from '../components/ActivityFeed';
import { CommentComposer } from '../components/CommentComposer';
import { TicketActionsPanel } from '../components/TicketActionsPanel';
import {
  useAddComment,
  useClaimTicket,
  useStaff,
  useTicket,
  useUpdateTicket,
} from '../hooks/useTickets';

export default function TicketDetailPage() {
  const { ticketId = '' } = useParams();
  const { user, isStaff, isAdmin } = useCurrentUser();
  const { data: ticket, isPending, isError, error, refetch } = useTicket(ticketId);
  const staffQuery = useStaff(isAdmin);
  const updateTicket = useUpdateTicket(ticketId);
  const claimTicket = useClaimTicket(ticketId);
  const addComment = useAddComment(ticketId);

  if (isPending) return <PageLoader label="Loading ticket" />;
  if (isError) {
    if (toApiError(error).status === 404)
      return <NotFoundPage message="This ticket doesn't exist or you don't have access to it." />;
    return <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />;
  }
  if (!user) return null;

  return (
    <>
      <PageHeader
        breadcrumb={
          <Link to="/tickets" className="hover:text-slate-700">
            ← {isStaff ? 'Ticket queue' : 'My tickets'}
          </Link>
        }
        title={
          <>
            <span className="mr-2 text-slate-400">#{ticket.number}</span>
            {ticket.title}
          </>
        }
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            <CategoryBadge category={ticket.category} />
            <SlaIndicator
              dueAt={ticket.dueAt}
              isOverdue={ticket.isOverdue}
              status={ticket.status}
            />
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Card>
            <CardBody>
              <div className="mb-3 flex items-center gap-2 text-sm">
                <Avatar name={ticket.requester.name} size="sm" />
                <span className="font-medium text-slate-900">{ticket.requester.name}</span>
                <span className="text-slate-500">opened {formatDateTime(ticket.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {ticket.description}
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Activity" description="Replies and changes, oldest first." />
            <CardBody className="space-y-6">
              <ActivityFeed comments={ticket.comments} events={ticket.events} />
              <div className="border-t border-slate-100 pt-5">
                <CommentComposer
                  allowInternal={isStaff}
                  isSubmitting={addComment.isPending}
                  onSubmit={(input) => addComment.mutateAsync(input)}
                  disabledReason={
                    ticket.status === 'CLOSED'
                      ? 'This ticket is closed. Open a new ticket if you need more help.'
                      : undefined
                  }
                />
              </div>
            </CardBody>
          </Card>
        </div>

        <aside className="space-y-6">
          <TicketActionsPanel
            ticket={ticket}
            currentUser={user}
            isStaff={isStaff}
            isAdmin={isAdmin}
            staff={staffQuery.data ?? []}
            isUpdating={updateTicket.isPending}
            isClaiming={claimTicket.isPending}
            onUpdate={(input) => updateTicket.mutate(input)}
            onClaim={() => claimTicket.mutate()}
          />
          <Card>
            <CardBody className="space-y-2 text-xs text-slate-500">
              <p>
                <span className="font-medium text-slate-700">Created:</span>{' '}
                {formatDateTime(ticket.createdAt)}
              </p>
              <p>
                <span className="font-medium text-slate-700">SLA due:</span>{' '}
                {formatDateTime(ticket.dueAt)}
              </p>
              {ticket.resolvedAt && (
                <p>
                  <span className="font-medium text-slate-700">Resolved:</span>{' '}
                  {formatDateTime(ticket.resolvedAt)}
                </p>
              )}
            </CardBody>
          </Card>
        </aside>
      </div>
    </>
  );
}
