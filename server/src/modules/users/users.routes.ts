import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { ROLES } from '../../domain/constants';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { usersService } from './users.service';

const listUsersQuerySchema = z.object({
  /** `STAFF` = agents + admins (handy for the assignee picker). */
  role: z.enum([...ROLES, 'STAFF']).optional(),
});

export const usersRouter = Router();

usersRouter.get(
  '/',
  authenticate,
  authorize('AGENT', 'ADMIN'),
  validate(listUsersQuerySchema, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    const { role } = req.query as z.infer<typeof listUsersQuerySchema>;
    res.json({ data: await usersService.list(role) });
  }),
);
