import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { agentUser, customerUser, makeTicketDetail } from '@/test/fixtures';
import { server } from '@/test/msw/server';
import { renderApp, signIn } from '@/test/render';

describe('ticket list page', () => {
  it('shows the queue for agents', async () => {
    signIn(agentUser);
    renderApp('/tickets');
    expect(await screen.findByRole('heading', { name: 'Ticket queue' })).toBeInTheDocument();
    const table = await screen.findByRole('table');
    expect(within(table).getByText('Charged twice')).toBeInTheDocument();
    expect(within(table).getAllByText(/by Casey Customer/)).toHaveLength(2);
  });

  it('labels the page "My tickets" for customers and hides the assignee filter', async () => {
    signIn(customerUser);
    renderApp('/tickets');
    expect(await screen.findByRole('heading', { name: 'My tickets' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Filter by assignee')).not.toBeInTheDocument();
  });

  it('sends filters to the API and keeps them in the URL', async () => {
    const seen: string[] = [];
    server.use(
      http.get('*/api/tickets', ({ request }) => {
        seen.push(new URL(request.url).search);
        return HttpResponse.json({
          data: [],
          meta: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
        });
      }),
    );
    signIn(agentUser);
    const { user, router } = renderApp('/tickets');

    await user.selectOptions(await screen.findByLabelText('Filter by priority'), 'URGENT');

    await waitFor(() => expect(router.state.location.search).toBe('?priority=URGENT'));
    await waitFor(() => expect(seen.at(-1)).toBe('?priority=URGENT'));
    expect(await screen.findByText('No tickets match these filters')).toBeInTheDocument();
  });

  it('shows an error state with retry when the API fails', async () => {
    server.use(
      http.get('*/api/tickets', () =>
        HttpResponse.json(
          { error: { code: 'X', message: 'Database unavailable' } },
          { status: 500 },
        ),
      ),
    );
    signIn(agentUser);
    renderApp('/tickets');
    expect(await screen.findByText('Database unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

describe('create ticket page', () => {
  it('validates input inline', async () => {
    signIn(customerUser);
    const { user } = renderApp('/tickets/new');
    await user.click(await screen.findByRole('button', { name: 'Submit ticket' }));
    expect(await screen.findByText('Title must be at least 5 characters')).toBeInTheDocument();
    expect(screen.getByText('Choose a category')).toBeInTheDocument();
  });

  it('creates a ticket and opens it', async () => {
    signIn(customerUser);
    const { user, router } = renderApp('/tickets/new');
    await user.type(await screen.findByLabelText('Title'), 'Export is broken');
    await user.type(screen.getByLabelText('Description'), 'CSV export returns an empty file.');
    await user.selectOptions(screen.getByLabelText('Category'), 'TECHNICAL');
    await user.selectOptions(screen.getByLabelText('Priority'), 'HIGH');
    expect(screen.getByText('Response target: 24 hours')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Submit ticket' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/tickets/t-new'));
    expect(await screen.findByText('Ticket #1050 created')).toBeInTheDocument();
  });
});

describe('ticket detail page', () => {
  it('lets agents claim and see internal-note controls', async () => {
    server.use(
      http.post('*/api/tickets/:id/assign', () =>
        HttpResponse.json({
          data: makeTicketDetail({
            status: 'IN_PROGRESS',
            assigneeId: agentUser.id,
            assignee: agentUser,
          }),
        }),
      ),
    );
    signIn(agentUser);
    const { user } = renderApp('/tickets/t-1');

    await user.click(await screen.findByRole('button', { name: 'Claim ticket' }));
    expect(await screen.findByText('Ticket assigned to you')).toBeInTheDocument();
    expect(screen.getByText('(you)')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Internal note' })).toBeInTheDocument();
  });

  it('gives customers a close action but no agent controls', async () => {
    server.use(
      http.get('*/api/tickets/:id', () =>
        HttpResponse.json({ data: makeTicketDetail({ allowedTransitions: ['CLOSED'] }) }),
      ),
    );
    signIn(customerUser);
    renderApp('/tickets/t-1');

    expect(await screen.findByRole('button', { name: 'Close ticket' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Claim ticket' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Status')).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Internal note' })).not.toBeInTheDocument();
  });

  it('shows a not-found page for tickets the user cannot access', async () => {
    server.use(
      http.get('*/api/tickets/:id', () =>
        HttpResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Ticket not found' } },
          { status: 404 },
        ),
      ),
    );
    signIn(customerUser);
    renderApp('/tickets/nope');
    expect(
      await screen.findByText("This ticket doesn't exist or you don't have access to it."),
    ).toBeInTheDocument();
  });
});
