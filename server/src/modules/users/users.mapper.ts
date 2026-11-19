import type { User } from '@prisma/client';
import type { Role } from '../../domain/constants';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
}

/** Strips sensitive fields (password hash) before sending a user over the wire. */
export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    createdAt: user.createdAt,
  };
}

/** Minimal projection used when embedding users inside tickets/comments. */
export const userSummarySelect = { id: true, name: true, email: true, role: true } as const;
