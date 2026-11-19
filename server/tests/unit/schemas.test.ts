import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from '../../src/modules/auth/auth.schema';
import {
  createTicketSchema,
  listTicketsQuerySchema,
  updateTicketSchema,
} from '../../src/modules/tickets/tickets.schema';

describe('auth schemas', () => {
  it('normalises email casing and whitespace on login', () => {
    const parsed = loginSchema.parse({ email: '  Agent@QueueDesk.TEST ', password: 'x' });
    expect(parsed.email).toBe('agent@queuedesk.test');
  });

  it('requires a password with letters and numbers on register', () => {
    const result = registerSchema.safeParse({ name: 'Al', email: 'a@b.co', password: 'abcdefgh' });
    expect(result.success).toBe(false);
    expect(
      registerSchema.safeParse({ name: 'Al', email: 'a@b.co', password: 'abcdefg1' }).success,
    ).toBe(true);
  });
});

describe('ticket schemas', () => {
  it('defaults priority to MEDIUM', () => {
    const parsed = createTicketSchema.parse({
      title: 'Something broke',
      description: 'It was working yesterday.',
      category: 'TECHNICAL',
    });
    expect(parsed.priority).toBe('MEDIUM');
  });

  it('rejects unknown categories', () => {
    const result = createTicketSchema.safeParse({
      title: 'Something broke',
      description: 'It was working yesterday.',
      category: 'GOSSIP',
    });
    expect(result.success).toBe(false);
  });

  it('coerces and defaults list query params', () => {
    const parsed = listTicketsQuerySchema.parse({ page: '2', status: '', overdue: 'true' });
    expect(parsed).toMatchObject({ page: 2, pageSize: 10, sort: 'newest', overdue: true });
    expect(parsed.status).toBeUndefined();
  });

  it('caps the page size', () => {
    expect(listTicketsQuerySchema.safeParse({ pageSize: '500' }).success).toBe(false);
  });

  it('requires at least one field on update', () => {
    expect(updateTicketSchema.safeParse({}).success).toBe(false);
    expect(updateTicketSchema.safeParse({ assigneeId: null }).success).toBe(true);
  });
});
