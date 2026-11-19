import { prisma } from '../../lib/prisma';
import type { Role } from '../../domain/constants';
import { toPublicUser } from './users.mapper';

export const usersService = {
  async list(role?: Role | 'STAFF') {
    const where =
      role === 'STAFF' ? { role: { in: ['AGENT', 'ADMIN'] } } : role ? { role } : undefined;
    const users = await prisma.user.findMany({ where, orderBy: { name: 'asc' } });
    return users.map(toPublicUser);
  },
};
