import type { NextFunction, Request, Response } from 'express';
import type { Role } from '../domain/constants';
import { AppError } from '../utils/AppError';

/** Role guard. Must be mounted after `authenticate`. */
export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!roles.includes(req.user.role)) return next(AppError.forbidden());
    return next();
  };
}
