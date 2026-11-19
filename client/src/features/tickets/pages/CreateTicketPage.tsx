import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardBody } from '@/components/ui';
import { toApiError } from '@/lib/apiClient';
import type { CreateTicketInput } from '@/types/api';
import { TicketForm } from '../components/TicketForm';
import { useCreateTicket } from '../hooks/useTickets';

export default function CreateTicketPage() {
  const navigate = useNavigate();
  const createTicket = useCreateTicket();

  const fieldErrors = createTicket.error ? toApiError(createTicket.error).fieldErrors : {};
  const serverErrors = Object.fromEntries(
    Object.entries(fieldErrors).map(([k, v]) => [k, v?.[0]]),
  ) as Partial<Record<keyof CreateTicketInput, string>>;

  const handleSubmit = (values: CreateTicketInput) => {
    createTicket.mutate(values, {
      onSuccess: (ticket) => navigate(`/tickets/${ticket.id}`),
      onError: (error) => toast.error(toApiError(error).message),
    });
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        breadcrumb={
          <Link to="/tickets" className="hover:text-slate-700">
            ← Back to tickets
          </Link>
        }
        title="New ticket"
        description="Tell us what's going on. The more detail, the faster we can help."
      />
      <Card>
        <CardBody className="py-6">
          <TicketForm
            onSubmit={handleSubmit}
            onCancel={() => navigate(-1)}
            isSubmitting={createTicket.isPending}
            serverErrors={serverErrors}
          />
        </CardBody>
      </Card>
    </div>
  );
}
