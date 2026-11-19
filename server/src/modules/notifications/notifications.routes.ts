import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireUser } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { notificationsService } from './notifications.service';

const listQuerySchema = z.object({
  unread: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const idParamsSchema = z.object({ id: z.string().min(1) });

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);

notificationsRouter.get(
  '/',
  validate(listQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as z.infer<typeof listQuerySchema>;
    res.json(await notificationsService.list(requireUser(req).id, query));
  }),
);

// Static path registered before `/:id/read` so it can never be captured as an id.
notificationsRouter.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    res.json({ data: await notificationsService.markAllRead(requireUser(req).id) });
  }),
);

notificationsRouter.patch(
  '/:id/read',
  validate(idParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    res.json({ data: await notificationsService.markRead(requireUser(req).id, req.params.id) });
  }),
);
