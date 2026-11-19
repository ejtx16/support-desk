import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { Toaster } from 'react-hot-toast';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router-dom';
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

/** Renders a single component with router + query providers. */
export function renderWithProviders(ui: ReactElement, { path = '/' } = {}) {
  const queryClient = createTestQueryClient();
  const user = userEvent.setup();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={[path]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        {ui}
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...utils, user, queryClient };
}
