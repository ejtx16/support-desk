import { describe, expect, it } from 'vitest';
import {
  calculateDueAt,
  canTransition,
  canViewTicket,
  getAllowedTransitions,
  getUpdateDenialReason,
  isOverdue,
  isStaff,
} from '../../src/domain/ticketRules';

const HOUR = 60 * 60 * 1000;

describe('status transitions', () => {
  it('allows the normal happy path', () => {
    expect(canTransition('OPEN', 'IN_PROGRESS')).toBe(true);
    expect(canTransition('IN_PROGRESS', 'PENDING')).toBe(true);
    expect(canTransition('PENDING', 'RESOLVED')).toBe(true);
    expect(canTransition('RESOLVED', 'CLOSED')).toBe(true);
  });

  it('allows re-opening a resolved ticket', () => {
    expect(canTransition('RESOLVED', 'IN_PROGRESS')).toBe(true);
  });

  it('treats CLOSED as terminal', () => {
    expect(getAllowedTransitions('CLOSED')).toEqual([]);
    expect(canTransition('CLOSED', 'OPEN')).toBe(false);
  });

  it('rejects skipping back to OPEN from PENDING or RESOLVED', () => {
    expect(canTransition('PENDING', 'OPEN')).toBe(false);
    expect(canTransition('RESOLVED', 'OPEN')).toBe(false);
  });
});

describe('calculateDueAt', () => {
  const from = new Date('2026-01-01T00:00:00Z');

  it.each([
    ['URGENT', 4],
    ['HIGH', 24],
    ['MEDIUM', 48],
    ['LOW', 72],
  ] as const)('%s tickets are due %i hours after creation', (priority, hours) => {
    expect(calculateDueAt(priority, from).getTime() - from.getTime()).toBe(hours * HOUR);
  });
});

describe('isOverdue', () => {
  const now = new Date('2026-01-02T00:00:00Z');
  const past = new Date(now.getTime() - HOUR);
  const future = new Date(now.getTime() + HOUR);

  it('is overdue when active and past due', () => {
    expect(isOverdue({ status: 'OPEN', dueAt: past }, now)).toBe(true);
    expect(isOverdue({ status: 'PENDING', dueAt: past }, now)).toBe(true);
  });

  it('is not overdue before the due date', () => {
    expect(isOverdue({ status: 'OPEN', dueAt: future }, now)).toBe(false);
  });

  it('is never overdue once resolved or closed', () => {
    expect(isOverdue({ status: 'RESOLVED', dueAt: past }, now)).toBe(false);
    expect(isOverdue({ status: 'CLOSED', dueAt: past }, now)).toBe(false);
  });
});

describe('permissions', () => {
  const customer = { id: 'c1', role: 'CUSTOMER' as const };
  const otherCustomer = { id: 'c2', role: 'CUSTOMER' as const };
  const agent = { id: 'a1', role: 'AGENT' as const };
  const admin = { id: 'ad1', role: 'ADMIN' as const };
  const ticket = { requesterId: 'c1', assigneeId: null };

  it('identifies staff roles', () => {
    expect(isStaff('AGENT')).toBe(true);
    expect(isStaff('ADMIN')).toBe(true);
    expect(isStaff('CUSTOMER')).toBe(false);
  });

  it('lets requesters and staff view a ticket, but not other customers', () => {
    expect(canViewTicket(customer, ticket)).toBe(true);
    expect(canViewTicket(agent, ticket)).toBe(true);
    expect(canViewTicket(otherCustomer, ticket)).toBe(false);
  });

  it('lets a customer close their own ticket only', () => {
    expect(getUpdateDenialReason(customer, ticket, { status: 'CLOSED' })).toBeNull();
    expect(getUpdateDenialReason(customer, ticket, { status: 'RESOLVED' })).toMatch(/only close/);
    expect(getUpdateDenialReason(customer, ticket, { priority: 'URGENT' })).toMatch(/only close/);
    expect(getUpdateDenialReason(otherCustomer, ticket, { status: 'CLOSED' })).toMatch(/access/);
  });

  it('lets agents assign to themselves or unassign, but not to others', () => {
    expect(getUpdateDenialReason(agent, ticket, { assigneeId: agent.id })).toBeNull();
    expect(getUpdateDenialReason(agent, ticket, { assigneeId: null })).toBeNull();
    expect(getUpdateDenialReason(agent, ticket, { assigneeId: 'a2' })).toMatch(/Only admins/);
  });

  it('lets admins assign to anyone', () => {
    expect(getUpdateDenialReason(admin, ticket, { assigneeId: 'a2' })).toBeNull();
  });
});
