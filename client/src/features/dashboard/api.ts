import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { statsKeys } from '@/features/tickets/queryKeys';
import type { StatsSummary } from '@/types/api';

export const statsApi = {
  summary: () => apiClient.get<{ data: StatsSummary }>('/stats/summary').then((r) => r.data.data),
};

export function useStatsSummary() {
  return useQuery({
    queryKey: statsKeys.summary,
    queryFn: statsApi.summary,
    refetchInterval: 60_000, // keep the dashboard reasonably live
  });
}
