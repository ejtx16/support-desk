import type { TicketDetail, TicketListItem, User } from '@/types/api';

export const agentUser: User = {
  id: 'u-agent',
  name: 'Alex Agent',
  email: 'agent@queuedesk.test',
  role: 'AGENT',
  createdAt: '2026-01-01T00:00:00.000Z',
};

export const customerUser: User = {
  id: 'u-customer',
  name: 'Casey Customer',
  email: 'customer@queuedesk.test',
  role: 'CUSTOMER',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const inOneDay = () => new Date(Date.now() + 24 * 3_600_000).toISOString();

export function makeTicket(overrides: Partial<TicketListItem> = {}): TicketListItem {
  return {
    id: 't-1',
    number: 1001,
    title: 'Cannot log in after password reset',
    description: 'The new password is rejected on the login page.',
    category: 'ACCOUNT',
    priority: 'HIGH',
    status: 'OPEN',
    dueAt: inOneDay(),
    resolvedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    requesterId: customerUser.id,
    assigneeId: null,
    requester: customerUser,
    assignee: null,
    isOverdue: false,
    commentCount: 0,
    ...overrides,
  };
}

export function makeTicketDetail(overrides: Partial<TicketDetail> = {}): TicketDetail {
  const { commentCount: _c, ...base } = makeTicket();
  return {
    ...base,
    comments: [],
    events: [
      {
        id: 'e-1',
        type: 'CREATED',
        fromValue: null,
        toValue: 'OPEN',
        createdAt: base.createdAt,
        actor: customerUser,
      },
    ],
    allowedTransitions: ['IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED'],
    ...overrides,
  };
}
