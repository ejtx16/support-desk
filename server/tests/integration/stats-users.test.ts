import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { api, bearer, createTicketVia, createUser, prisma, resetDb } from '../helpers';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe('GET /api/stats/summary', () => {
  it('is restricted to staff', async () => {
    const { token } = await createUser('CUSTOMER');
    const res = await api().get('/api/stats/summary').set(bearer(token));
    expect(res.status).toBe(403);
  });

  it('summarises the queue', async () => {
    const customer = await createUser('CUSTOMER');
    const agent = await createUser('AGENT');

    const a = await createTicketVia(customer.token, { priority: 'URGENT' });
    const b = await createTicketVia(customer.token, { priority: 'LOW' });
    await createTicketVia(customer.token, { priority: 'LOW' });

    await api().post(`/api/tickets/${a.id}/assign`).set(bearer(agent.token));
    await api().patch(`/api/tickets/${b.id}`).set(bearer(agent.token)).send({ status: 'RESOLVED' });
    await prisma.ticket.update({ where: { id: a.id }, data: { dueAt: new Date(Date.now() - 1) } });

    const res = await api().get('/api/stats/summary').set(bearer(agent.token));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      total: 3,
      active: 2,
      unassigned: 1,
      overdue: 1,
      assignedToMe: 1,
      resolvedToday: 1,
      byStatus: { OPEN: 1, IN_PROGRESS: 1, PENDING: 0, RESOLVED: 1, CLOSED: 0 },
      byPriority: { URGENT: 1, HIGH: 0, MEDIUM: 0, LOW: 1 },
    });
  });
});

describe('GET /api/users', () => {
  it('lists staff for the assignee picker without leaking password hashes', async () => {
    await createUser('CUSTOMER');
    const agent = await createUser('AGENT');
    await createUser('ADMIN');

    const res = await api().get('/api/users?role=STAFF').set(bearer(agent.token));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data.every((u: { role: string }) => u.role !== 'CUSTOMER')).toBe(true);
    expect(res.body.data[0].passwordHash).toBeUndefined();
  });

  it('is forbidden for customers', async () => {
    const { token } = await createUser('CUSTOMER');
    const res = await api().get('/api/users').set(bearer(token));
    expect(res.status).toBe(403);
  });
});
