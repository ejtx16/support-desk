import request from 'supertest';
import { createApp } from '../src/app';
import type { Role } from '../src/domain/constants';
import { signToken } from '../src/lib/jwt';
import { hashPassword } from '../src/lib/password';
import { prisma } from '../src/lib/prisma';

export const app = createApp();
export const api = () => request(app);

export const TEST_PASSWORD = 'Password123!';

/** Wipes all tables (children first to respect FKs). */
export async function resetDb() {
  await prisma.notification.deleteMany();
  await prisma.ticketEvent.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.user.deleteMany();
}

export async function createUser(role: Role, overrides: { name?: string; email?: string } = {}) {
  const suffix = Math.random().toString(36).slice(2, 8);
  const user = await prisma.user.create({
    data: {
      name: overrides.name ?? `${role.toLowerCase()} ${suffix}`,
      email: overrides.email ?? `${role.toLowerCase()}-${suffix}@test.dev`,
      role,
      passwordHash: await hashPassword(TEST_PASSWORD),
    },
  });
  return { user, token: signToken({ sub: user.id, role }) };
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

export async function createTicketVia(
  token: string,
  overrides: Partial<{
    title: string;
    description: string;
    category: string;
    priority: string;
  }> = {},
) {
  const res = await api()
    .post('/api/tickets')
    .set(bearer(token))
    .send({
      title: 'Printer is on fire',
      description: 'The office printer started smoking during a print job.',
      category: 'TECHNICAL',
      priority: 'HIGH',
      ...overrides,
    });
  if (res.status !== 201) throw new Error(`Ticket creation failed: ${res.status} ${res.text}`);
  return res.body.data as { id: string; number: number; status: string };
}

export { prisma };
