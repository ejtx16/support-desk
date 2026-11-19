import { useState } from 'react';
import { Avatar, Button, Card, CardBody, CardHeader, ConfirmDialog, Select } from '@/components/ui';
import { PRIORITY_LABELS, STATUS_LABELS, toOptions } from '@/lib/labels';
import type { TicketDetail, TicketPriority, TicketStatus, User } from '@/types/api';

interface TicketActionsPanelProps {
  ticket: TicketDetail;
  currentUser: User;
  isStaff: boolean;
  isAdmin: boolean;
  staff: User[];
  isUpdating: boolean;
  isClaiming: boolean;
  onUpdate: (input: {
    status?: TicketStatus;
    priority?: TicketPriority;
    assigneeId?: string | null;
  }) => void;
  onClaim: () => void;
}

/** Right-hand panel on the ticket page: who owns it and what can be done next. */
export function TicketActionsPanel({
  ticket,
  currentUser,
  isStaff,
  isAdmin,
  staff,
  isUpdating,
  isClaiming,
  onUpdate,
  onClaim,
}: TicketActionsPanelProps) {
  const [confirmClose, setConfirmClose] = useState(false);
  const isClosed = ticket.status === 'CLOSED';
  const statusOptions = [...new Set([ticket.status, ...ticket.allowedTransitions])].map((s) => ({
    value: s,
    label: STATUS_LABELS[s],
  }));

  return (
    <Card>
      <CardHeader title="Details" />
      <CardBody className="space-y-5">
        <section aria-label="Assignee" className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assignee</p>
          {ticket.assignee ? (
            <p className="flex items-center gap-2 text-sm text-slate-800">
              <Avatar name={ticket.assignee.name} size="sm" />
              {ticket.assignee.name}
              {ticket.assignee.id === currentUser.id && (
                <span className="text-slate-400">(you)</span>
              )}
            </p>
          ) : (
            <p className="text-sm text-slate-500">Nobody yet</p>
          )}

          {isStaff && !isClosed && ticket.assigneeId !== currentUser.id && (
            <Button size="sm" variant="secondary" isLoading={isClaiming} onClick={onClaim}>
              {ticket.assignee ? 'Take over ticket' : 'Claim ticket'}
            </Button>
          )}

          {isAdmin && !isClosed && (
            <Select
              aria-label="Assign to"
              placeholder="Unassigned"
              options={staff.map((u) => ({ value: u.id, label: u.name }))}
              value={ticket.assigneeId ?? ''}
              disabled={isUpdating}
              onChange={(e) => onUpdate({ assigneeId: e.target.value || null })}
            />
          )}
        </section>

        {isStaff && (
          <>
            <section className="space-y-2">
              <label
                htmlFor="ticket-status"
                className="text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Status
              </label>
              <Select
                id="ticket-status"
                options={statusOptions}
                value={ticket.status}
                disabled={isClosed || isUpdating}
                onChange={(e) => onUpdate({ status: e.target.value as TicketStatus })}
              />
            </section>
            <section className="space-y-2">
              <label
                htmlFor="ticket-priority"
                className="text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Priority
              </label>
              <Select
                id="ticket-priority"
                options={toOptions(PRIORITY_LABELS)}
                value={ticket.priority}
                disabled={isClosed || isUpdating}
                onChange={(e) => onUpdate({ priority: e.target.value as TicketPriority })}
              />
              <p className="text-xs text-slate-500">
                Changing priority recalculates the SLA due date.
              </p>
            </section>
          </>
        )}

        {!isStaff && ticket.allowedTransitions.includes('CLOSED') && (
          <>
            <Button variant="secondary" fullWidth onClick={() => setConfirmClose(true)}>
              Close ticket
            </Button>
            <ConfirmDialog
              open={confirmClose}
              title="Close this ticket?"
              message="Closed tickets can't be re-opened or replied to. Open a new ticket if the problem comes back."
              confirmLabel="Close ticket"
              tone="danger"
              isLoading={isUpdating}
              onCancel={() => setConfirmClose(false)}
              onConfirm={() => {
                onUpdate({ status: 'CLOSED' });
                setConfirmClose(false);
              }}
            />
          </>
        )}
      </CardBody>
    </Card>
  );
}
