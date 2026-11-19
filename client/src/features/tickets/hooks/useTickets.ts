import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/apiClient';
import type {
  CreateCommentInput,
  CreateTicketInput,
  TicketDetail,
  TicketFilters,
  UpdateTicketInput,
} from '@/types/api';
import { ticketsApi } from '../api';
import { statsKeys, ticketKeys } from '../queryKeys';

export function useTickets(filters: TicketFilters) {
  return useQuery({
    queryKey: ticketKeys.list(filters),
    queryFn: () => ticketsApi.list(filters),
    placeholderData: keepPreviousData, // no flicker while paging/filtering
  });
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: ticketKeys.detail(id),
    queryFn: () => ticketsApi.get(id),
  });
}

export function useStaff(enabled = true) {
  return useQuery({
    queryKey: ticketKeys.staff,
    queryFn: ticketsApi.listStaff,
    enabled,
    staleTime: 5 * 60_000,
  });
}

/** After any write: store the fresh detail and mark lists + stats stale. */
function useSyncTicket() {
  const queryClient = useQueryClient();
  return (ticket: TicketDetail) => {
    queryClient.setQueryData(ticketKeys.detail(ticket.id), ticket);
    void queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
    void queryClient.invalidateQueries({ queryKey: statsKeys.summary });
  };
}

export function useCreateTicket() {
  const sync = useSyncTicket();
  return useMutation({
    mutationFn: (input: CreateTicketInput) => ticketsApi.create(input),
    onSuccess: (ticket) => {
      sync(ticket);
      toast.success(`Ticket #${ticket.number} created`);
    },
  });
}

/**
 * Optimistically applies status/priority changes so the UI responds instantly,
 * rolling back if the server rejects the change.
 */
export function useUpdateTicket(id: string) {
  const queryClient = useQueryClient();
  const sync = useSyncTicket();
  const key = ticketKeys.detail(id);

  return useMutation({
    mutationFn: (input: UpdateTicketInput) => ticketsApi.update(id, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<TicketDetail>(key);
      if (previous) {
        const { assigneeId: _ignored, ...optimistic } = input;
        queryClient.setQueryData<TicketDetail>(key, { ...previous, ...optimistic });
      }
      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      toast.error(getErrorMessage(error));
    },
    onSuccess: (ticket) => {
      sync(ticket);
      toast.success('Ticket updated');
    },
  });
}

export function useClaimTicket(id: string) {
  const sync = useSyncTicket();
  return useMutation({
    mutationFn: () => ticketsApi.claim(id),
    onSuccess: (ticket) => {
      sync(ticket);
      toast.success('Ticket assigned to you');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useAddComment(id: string) {
  const sync = useSyncTicket();
  return useMutation({
    mutationFn: (input: CreateCommentInput) => ticketsApi.addComment(id, input),
    onSuccess: (ticket, input) => {
      sync(ticket);
      toast.success(input.isInternal ? 'Internal note added' : 'Reply sent');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
