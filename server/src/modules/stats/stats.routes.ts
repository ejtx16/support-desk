import { Router } from 'express';
import { authenticate, requireUser } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { asyncHandler } from '../../utils/asyncHandler';
import { statsService } from './stats.service';

export const statsRouter = Router();

statsRouter.get(
  '/summary',
  authenticate,
  authorize('AGENT', 'ADMIN'),
  asyncHandler(async (req, res) => {
    res.json({ data: await statsService.summary(requireUser(req).id) });
  }),
);
