import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PriorityBadge, SlaIndicator, StatusBadge } from './TicketBadges';

describe('ticket badges', () => {
  it('renders human-readable status and priority labels', () => {
    render(
      <>
        <StatusBadge status="IN_PROGRESS" />
        <PriorityBadge priority="URGENT" />
      </>,
    );
    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.getByText('Urgent')).toBeInTheDocument();
  });
});

describe('SlaIndicator', () => {
  const past = new Date(Date.now() - 2 * 3_600_000).toISOString();
  const future = new Date(Date.now() + 5 * 3_600_000).toISOString();

  it('flags overdue tickets', () => {
    render(<SlaIndicator dueAt={past} isOverdue status="OPEN" />);
    expect(screen.getByText(/overdue/i)).toHaveTextContent('Overdue 2 hours ago');
  });

  it('shows time remaining for on-track tickets', () => {
    render(<SlaIndicator dueAt={future} isOverdue={false} status="IN_PROGRESS" />);
    expect(screen.getByText('Due in 5 hours')).toBeInTheDocument();
  });

  it('hides the SLA once a ticket is resolved', () => {
    render(<SlaIndicator dueAt={past} isOverdue={false} status="RESOLVED" />);
    expect(screen.queryByText(/due|overdue/i)).not.toBeInTheDocument();
  });
});
