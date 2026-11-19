import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { agentUser } from '@/test/fixtures';
import { server } from '@/test/msw/server';
import { renderApp, signIn } from '@/test/render';
import { formatBadge } from './format';
import type { AppNotification } from './types';

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

function makeNotification(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: 'n-1',
    type: 'NEW_REPLY',
    message: 'Casey Customer replied to #1001: Cannot log in',
    ticketId: 't-1',
    readAt: null,
    createdAt: minutesAgo(5),
    ...overrides,
  };
}

/** In-memory inbox behind MSW so read state changes behave like the real API. */
function mockInbox(initial: AppNotification[]) {
  let inbox = [...initial];
  const calls = { markRead: [] as string[], markAll: 0 };
  const unread = () => inbox.filter((n) => !n.readAt).length;

  server.use(
    http.get('*/api/notifications', ({ request }) => {
      const unreadOnly = new URL(request.url).searchParams.get('unread') === 'true';
      const data = unreadOnly ? inbox.filter((n) => !n.readAt) : inbox;
      return HttpResponse.json({ data, meta: { unreadCount: unread() } });
    }),
    http.patch('*/api/notifications/:id/read', ({ params }) => {
      calls.markRead.push(String(params.id));
      inbox = inbox.map((n) =>
        n.id === params.id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n,
      );
      return HttpResponse.json({ data: inbox.find((n) => n.id === params.id) });
    }),
    http.post('*/api/notifications/read-all', () => {
      calls.markAll += 1;
      const updated = unread();
      inbox = inbox.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() }));
      return HttpResponse.json({ data: { updated } });
    }),
  );
  return calls;
}

const sampleInbox = [
  makeNotification({ id: 'n-1', message: 'Casey Customer replied to #1001: Cannot log in' }),
  makeNotification({
    id: 'n-2',
    type: 'TICKET_CREATED',
    ticketId: 't-2',
    message: 'Jordan Lee opened #1002: Charged twice',
    createdAt: minutesAgo(60),
  }),
  makeNotification({
    id: 'n-3',
    type: 'STATUS_CHANGED',
    message: 'Sam Support changed #1001 to Pending',
    readAt: minutesAgo(30),
    createdAt: minutesAgo(120),
  }),
];

describe('formatBadge', () => {
  it('caps the badge at 9+', () => {
    expect(formatBadge(3)).toBe('3');
    expect(formatBadge(9)).toBe('9');
    expect(formatBadge(10)).toBe('9+');
  });
});

describe('notification bell', () => {
  it('shows the unread count in the header', async () => {
    mockInbox(sampleInbox);
    signIn(agentUser);
    renderApp('/tickets');
    expect(
      await screen.findByRole('button', { name: 'Notifications, 2 unread' }),
    ).toBeInTheDocument();
  });

  it('has no badge when everything is read', async () => {
    mockInbox([makeNotification({ readAt: minutesAgo(1) })]);
    signIn(agentUser);
    renderApp('/tickets');
    expect(await screen.findByRole('button', { name: 'Notifications' })).toBeInTheDocument();
  });

  it('opens a panel listing notifications and filters to unread', async () => {
    mockInbox(sampleInbox);
    signIn(agentUser);
    const { user } = renderApp('/tickets');

    await user.click(await screen.findByRole('button', { name: /notifications, 2 unread/i }));
    const panel = await screen.findByRole('dialog', { name: 'Notifications' });
    const list = await within(panel).findByRole('list', { name: 'Notification list' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(within(panel).getAllByText('(unread)')).toHaveLength(2);

    await user.click(within(panel).getByRole('tab', { name: 'Unread (2)' }));
    // The list re-renders for the new filter, so query the panel again rather than the old list node.
    await waitFor(() => expect(within(panel).queryByText(/changed #1001 to Pending/)).toBeNull());
    expect(within(panel).getByText(/Jordan Lee opened #1002/)).toBeInTheDocument();
  });

  it('marks a notification read and opens its ticket when clicked', async () => {
    const calls = mockInbox(sampleInbox);
    signIn(agentUser);
    const { user, router } = renderApp('/tickets');

    await user.click(await screen.findByRole('button', { name: /notifications/i }));
    await user.click(await screen.findByText(/Jordan Lee opened #1002/));

    await waitFor(() => expect(router.state.location.pathname).toBe('/tickets/t-2'));
    expect(calls.markRead).toEqual(['n-2']);
    expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: 'Notifications, 1 unread' }),
    ).toBeInTheDocument();
  });

  it('marks everything as read', async () => {
    const calls = mockInbox(sampleInbox);
    signIn(agentUser);
    const { user } = renderApp('/tickets');

    await user.click(await screen.findByRole('button', { name: /notifications/i }));
    await user.click(await screen.findByRole('button', { name: 'Mark all as read' }));

    expect(await screen.findByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    expect(calls.markAll).toBe(1);
    expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeDisabled();
  });

  it('shows an empty state and closes with Escape', async () => {
    mockInbox([]);
    signIn(agentUser);
    const { user } = renderApp('/tickets');

    await user.click(await screen.findByRole('button', { name: 'Notifications' }));
    expect(await screen.findByText("You're all caught up")).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument();
  });
});
