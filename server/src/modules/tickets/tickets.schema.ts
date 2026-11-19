import { z } from 'zod';
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_SORTS,
  TICKET_STATUSES,
} from '../../domain/constants';

export const ticketIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const createTicketSchema = z.object({
  title: z.string().trim().min(5, 'Title must be at least 5 characters').max(120),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(5000),
  category: z.enum(TICKET_CATEGORIES),
  priority: z.enum(TICKET_PRIORITIES).default('MEDIUM'),
});

/** Empty strings from query params (e.g. `?status=`) are treated as "not provided". */
const optionalQuery = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), schema.optional());

export const listTicketsQuerySchema = z.object({
  status: optionalQuery(z.enum([...TICKET_STATUSES, 'ACTIVE'])),
  priority: optionalQuery(z.enum(TICKET_PRIORITIES)),
  category: optionalQuery(z.enum(TICKET_CATEGORIES)),
  /** `me`, `unassigned`, or a user id. */
  assignee: optionalQuery(z.string().min(1)),
  overdue: optionalQuery(z.enum(['true', 'false']).transform((v) => v === 'true')),
  q: optionalQuery(z.string().trim().max(100)),
  sort: optionalQuery(z.enum(TICKET_SORTS)).default('newest'),
  page: optionalQuery(z.coerce.number().int().min(1)).default(1),
  pageSize: optionalQuery(z.coerce.number().int().min(1).max(50)).default(10),
});

export const updateTicketSchema = z
  .object({
    status: z.enum(TICKET_STATUSES).optional(),
    priority: z.enum(TICKET_PRIORITIES).optional(),
    assigneeId: z.string().min(1).nullable().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: 'Provide at least one field to update',
  });

export const createCommentSchema = z.object({
  body: z.string().trim().min(1, 'Comment cannot be empty').max(5000),
  isInternal: z.boolean().default(false),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
