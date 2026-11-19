import { Router } from 'express';
import { authRouter } from './modules/auth/auth.routes';
import { notificationsRouter } from './modules/notifications/notifications.routes';
import { statsRouter } from './modules/stats/stats.routes';
import { ticketsRouter } from './modules/tickets/tickets.routes';
import { usersRouter } from './modules/users/users.routes';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/tickets', ticketsRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/stats', statsRouter);
apiRouter.use('/notifications', notificationsRouter);
