import { prisma } from '../../lib/prisma';
import { signToken } from '../../lib/jwt';
import { hashPassword, verifyPassword } from '../../lib/password';
import type { Role } from '../../domain/constants';
import { AppError } from '../../utils/AppError';
import { toPublicUser, type PublicUser } from '../users/users.mapper';
import type { LoginInput, RegisterInput } from './auth.schema';

export interface AuthResult {
  token: string;
  user: PublicUser;
}

function issue(user: { id: string; role: string }) {
  return signToken({ sub: user.id, role: user.role as Role });
}

export const authService = {
  async login({ email, password }: LoginInput): Promise<AuthResult> {
    const user = await prisma.user.findUnique({ where: { email } });
    // Same message for unknown email and wrong password to avoid user enumeration.
    const valid = user ? await verifyPassword(password, user.passwordHash) : false;
    if (!user || !valid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }
    return { token: issue(user), user: toPublicUser(user) };
  },

  async register({ name, email, password }: RegisterInput): Promise<AuthResult> {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw AppError.conflict('An account with this email already exists');

    const user = await prisma.user.create({
      data: { name, email, passwordHash: await hashPassword(password), role: 'CUSTOMER' },
    });
    return { token: issue(user), user: toPublicUser(user) };
  },

  async me(userId: string): Promise<PublicUser> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppError.unauthorized('User no longer exists');
    return toPublicUser(user);
  },
};
