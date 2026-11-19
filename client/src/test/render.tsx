import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toaster } from 'react-hot-toast';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routerFuture, routes } from '@/app/routes';
import { useAuthStore } from '@/features/auth/store';
import type { User } from '@/types/api';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
}

export function signIn(user: User) {
  useAuthStore.setState({ token: 'test-token', user });
}

/** Renders the full app route tree at `path` (real guards, layouts and pages). */
export function renderApp(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path], future: routerFuture });
  const queryClient = createTestQueryClient();
  const user = userEvent.setup();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
      <Toaster />
    </QueryClientProvider>,
  );
  return { ...utils, router, user, queryClient };
}
