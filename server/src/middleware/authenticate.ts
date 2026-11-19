import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../lib/jwt';
import { AppError } from '../utils/AppError';

/** Requires a valid `Authorization: Bearer <jwt>` header and populates `req.user`. */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(AppError.unauthorized());
  }

  try {
    const payload = verifyToken(header.slice('Bearer '.length).trim());
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch {
    return next(AppError.unauthorized('Invalid or expired token'));
  }
}

/** Narrows `req.user` for handlers mounted behind `authenticate`. */
export function requireUser(req: Request) {
  if (!req.user) throw AppError.unauthorized();
  return req.user;
}
