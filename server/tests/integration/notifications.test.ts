import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { resolveRecipients } from '../../src/modules/notifications/notifications.service';
import { api, bearer, createTicketVia, createUser, prisma, resetDb } from '../helpers';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

type Notification = {
  id: string;
  type: string;
  message: string;
  readAt: string | null;
  ticketId: string;
};

async function inbox(token: string, query = '') {
  const res = await api().get(`/api/notifications${query}`).set(bearer(token));
  expect(res.status).toBe(200);
  return res.body as { data: Notification[]; meta: { unreadCount: number } };
}

describe('resolveRecipients', () => {
  it('drops nulls, duplicates and the actor', () => {
    expect(resolveRecipients(['a', null, 'b', 'a', undefined, 'me'], 'me')).toEqual(['a', 'b']);
  });
});

describe('notification triggers', () => {
  it('tells every staff member about a new ticket, but not the customer who opened it', async () => {
    const customer = await createUser('CUSTOMER', { name: 'Casey' });
    const agent = await createUser('AGENT');
    const admin = await createUser('ADMIN');
    const t = await createTicketVia(customer.token, { title: 'Printer is on fire' });

    for (const staff of [agent, admin]) {
      const { data, meta } = await inbox(staff.token);
      expect(meta.unreadCount).toBe(1);
      expect(data[0]).toMatchObject({
        type: 'TICKET_CREATED',
        ticketId: t.id,
        message: `Casey opened #${t.number}: Printer is on fire`,
      });
    }
    expect((await inbox(customer.token)).meta.unreadCount).toBe(0);
  });

  it('notifies the customer when an agent claims, updates and replies', async () => {
    const customer = await createUser('CUSTOMER');
    const agent = await createUser('AGENT', { name: 'Alex' });
    const t = await createTicketVia(customer.token);

    await api().post(`/api/tickets/${t.id}/assign`).set(bearer(agent.token));
    await api()
      .post(`/api/tickets/${t.id}/comments`)
      .set(bearer(agent.token))
      .send({ body: 'Looking into it' });

    const { data } = await inbox(customer.token);
    expect(data.map((n) => n.message)).toEqual([
      `Alex replied to #${t.number}: Printer is on fire`,
      `Alex is now handling your ticket #${t.number}`,
      `Alex changed #${t.number} to In progress`,
    ]);
    // Agents never get notified about their own actions.
    const agentTypes = (await inbox(agent.token)).data.map((n) => n.type);
    expect(agentTypes).toEqual(['TICKET_CREATED']);
  });

  it('never tells customers about internal notes', async () => {
    const customer = await createUser('CUSTOMER');
    const owner = await createUser('AGENT');
    const helper = await createUser('AGENT', { name: 'Sam' });
    const t = await createTicketVia(customer.token);
    await api().post(`/api/tickets/${t.id}/assign`).set(bearer(owner.token));
    const before = (await inbox(customer.token)).meta.unreadCount;

    await api()
      .post(`/api/tickets/${t.id}/comments`)
      .set(bearer(helper.token))
      .send({ body: 'Possible duplicate of #1000', isInternal: true });

    expect((await inbox(customer.token)).meta.unreadCount).toBe(before);
    const ownerInbox = await inbox(owner.token);
    expect(ownerInbox.data[0]).toMatchObject({
      type: 'INTERNAL_NOTE',
      message: `Sam added an internal note on #${t.number}`,
    });
  });

  it('notifies the assigned agent when the customer replies', async () => {
    const customer = await createUser('CUSTOMER', { name: 'Casey' });
    const agent = await createUser('AGENT');
    const t = await createTicketVia(customer.token);
    await api().post(`/api/tickets/${t.id}/assign`).set(bearer(agent.token));

    await api()
      .post(`/api/tickets/${t.id}/comments`)
      .set(bearer(customer.token))
      .send({ body: 'Any update?' });

    expect((await inbox(agent.token)).data[0]).toMatchObject({ type: 'NEW_REPLY' });
  });

  it('notifies an agent when an admin assigns them a ticket', async () => {
    const customer = await createUser('CUSTOMER');
    const agent = await createUser('AGENT');
    const admin = await createUser('ADMIN', { name: 'Ada' });
    const t = await createTicketVia(customer.token);

    await api()
      .patch(`/api/tickets/${t.id}`)
      .set(bearer(admin.token))
      .send({ assigneeId: agent.user.id });

    expect((await inbox(agent.token)).data[0]).toMatchObject({
      type: 'TICKET_ASSIGNED',
      message: `Ada assigned #${t.number} to you: Printer is on fire`,
    });
  });

  it('creates nothing when the change is rejected', async () => {
    const customer = await createUser('CUSTOMER');
    const agent = await createUser('AGENT');
    const t = await createTicketVia(customer.token);
    await api().patch(`/api/tickets/${t.id}`).set(bearer(agent.token)).send({ status: 'CLOSED' });
    const before = (await inbox(customer.token)).meta.unreadCount;

    const res = await api()
      .patch(`/api/tickets/${t.id}`)
      .set(bearer(agent.token))
      .send({ status: 'OPEN' });
    expect(res.status).toBe(422);
    expect((await inbox(customer.token)).meta.unreadCount).toBe(before);
  });
});

describe('notification endpoints', () => {
  async function seedInbox() {
    const customer = await createUser('CUSTOMER');
    const agent = await createUser('AGENT');
    await createTicketVia(customer.token);
    await createTicketVia(customer.token);
    return { customer, agent };
  }

  it('requires authentication', async () => {
    expect((await api().get('/api/notifications')).status).toBe(401);
  });

  it('marks one notification as read', async () => {
    const { agent } = await seedInbox();
    const [first] = (await inbox(agent.token)).data;

    const res = await api().patch(`/api/notifications/${first.id}/read`).set(bearer(agent.token));
    expect(res.status).toBe(200);
    expect(res.body.data.readAt).not.toBeNull();

    const after = await inbox(agent.token);
    expect(after.meta.unreadCount).toBe(1);
    expect((await inbox(agent.token, '?unread=true')).data).toHaveLength(1);
  });

  it("returns 404 for someone else's notification", async () => {
    const { agent, customer } = await seedInbox();
    const [first] = (await inbox(agent.token)).data;
    const res = await api()
      .patch(`/api/notifications/${first.id}/read`)
      .set(bearer(customer.token));
    expect(res.status).toBe(404);
  });

  it('marks everything as read', async () => {
    const { agent } = await seedInbox();
    const res = await api().post('/api/notifications/read-all').set(bearer(agent.token));
    expect(res.body.data.updated).toBe(2);
    expect((await inbox(agent.token)).meta.unreadCount).toBe(0);
  });

  it('respects the limit', async () => {
    const { agent } = await seedInbox();
    const { data, meta } = await inbox(agent.token, '?limit=1');
    expect(data).toHaveLength(1);
    expect(meta.unreadCount).toBe(2);
  });
});
