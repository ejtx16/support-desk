import { http, HttpResponse } from 'msw';
import { useAuthStore } from '@/features/auth/store';
import { agentUser, makeTicket, makeTicketDetail } from '../fixtures';

/** Default happy-path API. Individual tests override with `server.use(...)`. */
export const handlers = [
  http.post('*/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    if (body.password !== 'Password123!') {
      return HttpResponse.json(
        { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } },
        { status: 401 },
      );
    }
    return HttpResponse.json({ token: 'test-token', user: { ...agentUser, email: body.email } });
  }),

  // Echo back whoever the test signed in as.
  http.get('*/api/auth/me', () =>
    HttpResponse.json({ user: useAuthStore.getState().user ?? agentUser }),
  ),

  http.get('*/api/tickets', () =>
    HttpResponse.json({
      data: [
        makeTicket(),
        makeTicket({ id: 't-2', number: 1002, title: 'Charged twice', priority: 'URGENT' }),
      ],
      meta: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
    }),
  ),

  http.get('*/api/tickets/:id', ({ params }) =>
    HttpResponse.json({ data: makeTicketDetail({ id: String(params.id) }) }),
  ),

  http.post('*/api/tickets', async ({ request }) => {
    const body = (await request.json()) as Record<string, string>;
    return HttpResponse.json(
      { data: makeTicketDetail({ id: 't-new', number: 1050, ...body }) },
      { status: 201 },
    );
  }),

  http.get('*/api/users', () => HttpResponse.json({ data: [agentUser] })),

  http.get('*/api/stats/summary', () =>
    HttpResponse.json({
      data: {
        total: 10,
        active: 6,
        unassigned: 3,
        overdue: 2,
        assignedToMe: 1,
        resolvedToday: 1,
        byStatus: { OPEN: 3, IN_PROGRESS: 2, PENDING: 1, RESOLVED: 2, CLOSED: 2 },
        byPriority: { LOW: 1, MEDIUM: 2, HIGH: 2, URGENT: 1 },
      },
    }),
  ),
];
