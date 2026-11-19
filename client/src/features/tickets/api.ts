import { apiClient } from '@/lib/apiClient';
import type {
  CreateCommentInput,
  CreateTicketInput,
  Paginated,
  TicketDetail,
  TicketFilters,
  TicketListItem,
  UpdateTicketInput,
  User,
} from '@/types/api';

/** Drops empty values so the URL only contains active filters. */
export function toQueryParams(filters: TicketFilters): Record<string, string> {
  return Object.fromEntries(
    Object.entries(filters)
      .filter(([, v]) => v !== undefined && v !== '' && v !== false)
      .map(([k, v]) => [k, String(v)]),
  );
}

type Data<T> = { data: T };

export const ticketsApi = {
  list: (filters: TicketFilters) =>
    apiClient
      .get<Paginated<TicketListItem>>('/tickets', { params: toQueryParams(filters) })
      .then((r) => r.data),

  get: (id: string) => apiClient.get<Data<TicketDetail>>(`/tickets/${id}`).then((r) => r.data.data),

  create: (input: CreateTicketInput) =>
    apiClient.post<Data<TicketDetail>>('/tickets', input).then((r) => r.data.data),

  update: (id: string, input: UpdateTicketInput) =>
    apiClient.patch<Data<TicketDetail>>(`/tickets/${id}`, input).then((r) => r.data.data),

  claim: (id: string) =>
    apiClient.post<Data<TicketDetail>>(`/tickets/${id}/assign`).then((r) => r.data.data),

  addComment: (id: string, input: CreateCommentInput) =>
    apiClient.post<Data<TicketDetail>>(`/tickets/${id}/comments`, input).then((r) => r.data.data),

  listStaff: () =>
    apiClient.get<Data<User[]>>('/users', { params: { role: 'STAFF' } }).then((r) => r.data.data),
};
