import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { api, bearer, createTicketVia, createUser, prisma, resetDb } from '../helpers';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function setup() {
  const customer = await createUser('CUSTOMER');
  const otherCustomer = await createUser('CUSTOMER');
  const agent = await createUser('AGENT');
  const admin = await createUser('ADMIN');
  return { customer, otherCustomer, agent, admin };
}

describe('creating tickets', () => {
  it('creates an OPEN ticket with an SLA due date and a CREATED event', async () => {
    const { customer } = await setup();
    const before = Date.now();
    const ticket = await createTicketVia(customer.token, { priority: 'URGENT' });

    const res = await api().get(`/api/tickets/${ticket.id}`).set(bearer(customer.token));
    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data).toMatchObject({ status: 'OPEN', priority: 'URGENT', number: 1001 });
    const dueInHours = (new Date(data.dueAt).getTime() - before) / 3_600_000;
    expect(dueInHours).toBeGreaterThan(3.9);
    expect(dueInHours).toBeLessThan(4.1);
    expect(data.events.map((e: { type: string }) => e.type)).toEqual(['CREATED']);
    expect(data.priorityRank).toBeUndefined();
  });

  it('assigns sequential ticket numbers', async () => {
    const { customer } = await setup();
    const a = await createTicketVia(customer.token);
    const b = await createTicketVia(customer.token);
    expect(b.number).toBe(a.number + 1);
  });

  it('validates the payload', async () => {
    const { customer } = await setup();
    const res = await api()
      .post('/api/tickets')
      .set(bearer(customer.token))
      .send({ title: 'x', category: 'NOPE' });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.error.details)).toEqual(
      expect.arrayContaining(['title', 'description', 'category']),
    );
  });
});

describe('listing tickets', () => {
  it('scopes customers to their own tickets but shows staff everything', async () => {
    const { customer, otherCustomer, agent } = await setup();
    await createTicketVia(customer.token);
    await createTicketVia(otherCustomer.token);

    const mine = await api().get('/api/tickets').set(bearer(customer.token));
    expect(mine.body.meta.total).toBe(1);

    const all = await api().get('/api/tickets').set(bearer(agent.token));
    expect(all.body.meta.total).toBe(2);
  });

  it('filters, searches, sorts and paginates', async () => {
    const { customer, agent } = await setup();
    await createTicketVia(customer.token, { title: 'Billing is wrong', priority: 'LOW' });
    await createTicketVia(customer.token, { title: 'Server is down', priority: 'URGENT' });
    const third = await createTicketVia(customer.token, {
      title: 'Password help',
      priority: 'MEDIUM',
    });
    await api().post(`/api/tickets/${third.id}/assign`).set(bearer(agent.token));

    const search = await api().get('/api/tickets?q=server').set(bearer(agent.token));
    expect(search.body.data.map((t: { title: string }) => t.title)).toEqual(['Server is down']);

    const byPriority = await api().get('/api/tickets?sort=priority').set(bearer(agent.token));
    expect(byPriority.body.data.map((t: { priority: string }) => t.priority)).toEqual([
      'URGENT',
      'MEDIUM',
      'LOW',
    ]);

    const unassigned = await api().get('/api/tickets?assignee=unassigned').set(bearer(agent.token));
    expect(unassigned.body.meta.total).toBe(2);

    const mine = await api().get('/api/tickets?assignee=me').set(bearer(agent.token));
    expect(mine.body.data[0].id).toBe(third.id);

    const page2 = await api().get('/api/tickets?pageSize=2&page=2').set(bearer(agent.token));
    expect(page2.body.data).toHaveLength(1);
    expect(page2.body.meta).toMatchObject({ page: 2, pageSize: 2, total: 3, totalPages: 2 });
  });

  it('filters overdue tickets', async () => {
    const { customer, agent } = await setup();
    const t = await createTicketVia(customer.token);
    await prisma.ticket.update({
      where: { id: t.id },
      data: { dueAt: new Date(Date.now() - 1000) },
    });
    await createTicketVia(customer.token);

    const res = await api().get('/api/tickets?overdue=true').set(bearer(agent.token));
    expect(res.body.meta.total).toBe(1);
    expect(res.body.data[0]).toMatchObject({ id: t.id, isOverdue: true });
  });
});

describe('viewing a ticket', () => {
  it('hides other customers’ tickets behind a 404', async () => {
    const { customer, otherCustomer } = await setup();
    const t = await createTicketVia(customer.token);
    const res = await api().get(`/api/tickets/${t.id}`).set(bearer(otherCustomer.token));
    expect(res.status).toBe(404);
  });

  it('hides internal notes from customers', async () => {
    const { customer, agent } = await setup();
    const t = await createTicketVia(customer.token);
    await api()
      .post(`/api/tickets/${t.id}/comments`)
      .set(bearer(agent.token))
      .send({ body: 'Public reply' });
    await api()
      .post(`/api/tickets/${t.id}/comments`)
      .set(bearer(agent.token))
      .send({ body: 'Secret note', isInternal: true });

    const asCustomer = await api().get(`/api/tickets/${t.id}`).set(bearer(customer.token));
    expect(asCustomer.body.data.comments.map((c: { body: string }) => c.body)).toEqual([
      'Public reply',
    ]);

    const asAgent = await api().get(`/api/tickets/${t.id}`).set(bearer(agent.token));
    expect(asAgent.body.data.comments).toHaveLength(2);
  });
});

describe('agent triage workflow', () => {
  it('claim -> pending -> customer reply re-opens -> resolve, with a full event log', async () => {
    const { customer, agent } = await setup();
    const t = await createTicketVia(customer.token);

    const claimed = await api().post(`/api/tickets/${t.id}/assign`).set(bearer(agent.token));
    expect(claimed.status).toBe(200);
    expect(claimed.body.data).toMatchObject({ status: 'IN_PROGRESS', assigneeId: agent.user.id });

    const pending = await api()
      .patch(`/api/tickets/${t.id}`)
      .set(bearer(agent.token))
      .send({ status: 'PENDING' });
    expect(pending.body.data.status).toBe('PENDING');

    const reply = await api()
      .post(`/api/tickets/${t.id}/comments`)
      .set(bearer(customer.token))
      .send({ body: 'Here is the info you asked for' });
    expect(reply.status).toBe(201);
    expect(reply.body.data.status).toBe('IN_PROGRESS');

    const resolved = await api()
      .patch(`/api/tickets/${t.id}`)
      .set(bearer(agent.token))
      .send({ status: 'RESOLVED' });
    expect(resolved.body.data.status).toBe('RESOLVED');
    expect(resolved.body.data.resolvedAt).not.toBeNull();

    const types = resolved.body.data.events.map(
      (e: { type: string; toValue: string }) => `${e.type}:${e.toValue}`,
    );
    expect(types).toEqual([
      'CREATED:OPEN',
      'STATUS_CHANGED:IN_PROGRESS',
      `ASSIGNED:${agent.user.name}`,
      'STATUS_CHANGED:PENDING',
      'STATUS_CHANGED:IN_PROGRESS',
      'STATUS_CHANGED:RESOLVED',
    ]);
  });

  it('rejects invalid status transitions with 422', async () => {
    const { customer, agent } = await setup();
    const t = await createTicketVia(customer.token);
    await api().patch(`/api/tickets/${t.id}`).set(bearer(agent.token)).send({ status: 'CLOSED' });

    const res = await api()
      .patch(`/api/tickets/${t.id}`)
      .set(bearer(agent.token))
      .send({ status: 'OPEN' });
    expect(res.status).toBe(422);
  });

  it('recalculates the SLA when priority changes', async () => {
    const { customer, agent } = await setup();
    const t = await createTicketVia(customer.token, { priority: 'LOW' });
    const res = await api()
      .patch(`/api/tickets/${t.id}`)
      .set(bearer(agent.token))
      .send({ priority: 'URGENT' });
    const { createdAt, dueAt } = res.body.data;
    expect(new Date(dueAt).getTime() - new Date(createdAt).getTime()).toBe(4 * 3_600_000);
  });

  it('only lets admins assign tickets to another agent', async () => {
    const { customer, agent, admin } = await setup();
    const other = await createUser('AGENT');
    const t = await createTicketVia(customer.token);

    const asAgent = await api()
      .patch(`/api/tickets/${t.id}`)
      .set(bearer(agent.token))
      .send({ assigneeId: other.user.id });
    expect(asAgent.status).toBe(403);

    const asAdmin = await api()
      .patch(`/api/tickets/${t.id}`)
      .set(bearer(admin.token))
      .send({ assigneeId: other.user.id });
    expect(asAdmin.status).toBe(200);
    expect(asAdmin.body.data.assignee.id).toBe(other.user.id);
  });

  it('refuses to assign tickets to customers', async () => {
    const { customer, admin } = await setup();
    const t = await createTicketVia(customer.token);
    const res = await api()
      .patch(`/api/tickets/${t.id}`)
      .set(bearer(admin.token))
      .send({ assigneeId: customer.user.id });
    expect(res.status).toBe(422);
  });
});

describe('customer permissions', () => {
  it('can close their own ticket but not change priority', async () => {
    const { customer } = await setup();
    const t = await createTicketVia(customer.token);

    const priority = await api()
      .patch(`/api/tickets/${t.id}`)
      .set(bearer(customer.token))
      .send({ priority: 'URGENT' });
    expect(priority.status).toBe(403);

    const close = await api()
      .patch(`/api/tickets/${t.id}`)
      .set(bearer(customer.token))
      .send({ status: 'CLOSED' });
    expect(close.status).toBe(200);
    expect(close.body.data.status).toBe('CLOSED');
    expect(close.body.data.allowedTransitions).toEqual([]);
  });

  it('cannot add internal notes or claim tickets', async () => {
    const { customer } = await setup();
    const t = await createTicketVia(customer.token);

    const note = await api()
      .post(`/api/tickets/${t.id}/comments`)
      .set(bearer(customer.token))
      .send({ body: 'sneaky', isInternal: true });
    expect(note.status).toBe(403);

    const claim = await api().post(`/api/tickets/${t.id}/assign`).set(bearer(customer.token));
    expect(claim.status).toBe(403);
  });

  it('cannot comment on closed tickets', async () => {
    const { customer } = await setup();
    const t = await createTicketVia(customer.token);
    await api()
      .patch(`/api/tickets/${t.id}`)
      .set(bearer(customer.token))
      .send({ status: 'CLOSED' });
    const res = await api()
      .post(`/api/tickets/${t.id}/comments`)
      .set(bearer(customer.token))
      .send({ body: 'hello?' });
    expect(res.status).toBe(422);
  });
});
