/** Mirrors server/src/domain/constants.ts. Keep in sync. */
export const ROLES = ['CUSTOMER', 'AGENT', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_CATEGORIES = ['BILLING', 'TECHNICAL', 'ACCOUNT', 'OTHER'] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const TICKET_SORTS = ['newest', 'oldest', 'priority', 'dueAt'] as const;
export type TicketSort = (typeof TICKET_SORTS)[number];

export type TicketEventType = 'CREATED' | 'STATUS_CHANGED' | 'PRIORITY_CHANGED' | 'ASSIGNED';

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface User extends UserSummary {
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Ticket {
  id: string;
  number: number;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  dueAt: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  requesterId: string;
  assigneeId: string | null;
  requester: UserSummary;
  assignee: UserSummary | null;
  isOverdue: boolean;
}

export interface TicketListItem extends Ticket {
  commentCount: number;
}

export interface Comment {
  id: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
  author: UserSummary;
}

export interface TicketEvent {
  id: string;
  type: TicketEventType;
  fromValue: string | null;
  toValue: string | null;
  createdAt: string;
  actor: UserSummary;
}

export interface TicketDetail extends Ticket {
  comments: Comment[];
  events: TicketEvent[];
  allowedTransitions: TicketStatus[];
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface StatsSummary {
  total: number;
  active: number;
  unassigned: number;
  overdue: number;
  assignedToMe: number;
  resolvedToday: number;
  byStatus: Record<TicketStatus, number>;
  byPriority: Record<TicketPriority, number>;
}

export interface TicketFilters {
  status?: TicketStatus | 'ACTIVE';
  priority?: TicketPriority;
  category?: TicketCategory;
  assignee?: string;
  overdue?: boolean;
  q?: string;
  sort?: TicketSort;
  page?: number;
  pageSize?: number;
}

export interface CreateTicketInput {
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
}

export interface UpdateTicketInput {
  status?: TicketStatus;
  priority?: TicketPriority;
  assigneeId?: string | null;
}

export interface CreateCommentInput {
  body: string;
  isInternal?: boolean;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: Record<string, string[] | undefined> };
}
