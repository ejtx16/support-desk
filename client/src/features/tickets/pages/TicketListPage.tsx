import { PageHeader } from '@/components/PageHeader';
import {
  Button,
  ButtonLink,
  Card,
  EmptyState,
  ErrorState,
  Pagination,
  Spinner,
} from '@/components/ui';
import { getErrorMessage } from '@/lib/apiClient';
import { useCurrentUser } from '@/features/auth/store';
import { TicketFiltersBar } from '../components/TicketFiltersBar';
import { TicketTable } from '../components/TicketTable';
import { useTicketFilters } from '../hooks/useTicketFilters';
import { useTickets } from '../hooks/useTickets';

export default function TicketListPage() {
  const { isStaff } = useCurrentUser();
  const { filters, setFilters, clearFilters, activeCount } = useTicketFilters();
  const { data, isPending, isError, error, refetch, isFetching } = useTickets(filters);

  const newTicketButton = <ButtonLink to="/tickets/new">New ticket</ButtonLink>;

  return (
    <>
      <PageHeader
        title={isStaff ? 'Ticket queue' : 'My tickets'}
        description={
          isStaff
            ? 'Every support request across all customers.'
            : 'Track the status of your support requests.'
        }
        actions={newTicketButton}
      />

      <Card>
        <TicketFiltersBar
          filters={filters}
          onChange={setFilters}
          onClear={clearFilters}
          activeCount={activeCount}
          showAssignee={isStaff}
        />

        <div className="relative">
          {isFetching && !isPending && (
            <div className="absolute right-4 top-3 z-10">
              <Spinner size="sm" label="Refreshing" />
            </div>
          )}

          {isPending ? (
            <div className="flex justify-center py-16">
              <Spinner size="lg" label="Loading tickets" />
            </div>
          ) : isError ? (
            <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
          ) : (
            <>
              <TicketTable
                tickets={data.data}
                showRequester={isStaff}
                empty={
                  activeCount > 0 ? (
                    <EmptyState
                      title="No tickets match these filters"
                      description="Try removing a filter or searching for something else."
                      action={
                        <Button variant="secondary" onClick={clearFilters}>
                          Clear filters
                        </Button>
                      }
                    />
                  ) : (
                    <EmptyState
                      title={isStaff ? 'The queue is empty' : 'No tickets yet'}
                      description={
                        isStaff
                          ? 'New customer requests will show up here.'
                          : 'Need help with something? Open a ticket and our team will get back to you.'
                      }
                      action={isStaff ? undefined : newTicketButton}
                    />
                  )
                }
              />
              <Pagination {...data.meta} onPageChange={(page) => setFilters({ page })} />
            </>
          )}
        </div>
      </Card>
    </>
  );
}
