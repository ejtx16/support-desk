import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { ticketsController } from './tickets.controller';
import {
  createCommentSchema,
  createTicketSchema,
  listTicketsQuerySchema,
  ticketIdParamsSchema,
  updateTicketSchema,
} from './tickets.schema';

export const ticketsRouter = Router();

ticketsRouter.use(authenticate);

ticketsRouter
  .route('/')
  .get(validate(listTicketsQuerySchema, 'query'), asyncHandler(ticketsController.list))
  .post(validate(createTicketSchema), asyncHandler(ticketsController.create));

ticketsRouter
  .route('/:id')
  .all(validate(ticketIdParamsSchema, 'params'))
  .get(asyncHandler(ticketsController.getById))
  .patch(validate(updateTicketSchema), asyncHandler(ticketsController.update));

ticketsRouter.post(
  '/:id/assign',
  authorize('AGENT', 'ADMIN'),
  validate(ticketIdParamsSchema, 'params'),
  asyncHandler(ticketsController.claim),
);

ticketsRouter.post(
  '/:id/comments',
  validate(ticketIdParamsSchema, 'params'),
  validate(createCommentSchema),
  asyncHandler(ticketsController.addComment),
);
