import { QueryClient } from '@tanstack/react-query';
import { toApiError } from '@/lib/apiClient';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        // Retrying a 4xx (not found, forbidden, validation) never helps.
        retry: (failureCount, error) => {
          const status = toApiError(error).status;
          return status >= 400 && status < 500 ? false : failureCount < 2;
        },
      },
      mutations: { retry: false },
    },
  });
}
