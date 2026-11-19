import { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';
import { PageLoader } from '@/components/ui';
import NotFoundPage from '@/pages/NotFoundPage';
import { ProtectedRoute, RoleRoute, RootRedirect } from './guards';
import { AppLayout } from './layouts/AppLayout';
import { AuthLayout } from './layouts/AuthLayout';

// Route-level code splitting: each screen is its own chunk.
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage'));
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'));
const TicketListPage = lazy(() => import('@/features/tickets/pages/TicketListPage'));
const CreateTicketPage = lazy(() => import('@/features/tickets/pages/CreateTicketPage'));
const TicketDetailPage = lazy(() => import('@/features/tickets/pages/TicketDetailPage'));
const ProfilePage = lazy(() => import('@/features/profile/pages/ProfilePage'));

/** Opt into React Router v7 behaviour now (also silences upgrade warnings). */
export const routerFuture = {
  v7_relativeSplatPath: true,
  v7_fetcherPersist: true,
  v7_normalizeFormMethod: true,
  v7_partialHydration: true,
  v7_skipActionErrorRevalidation: true,
} as const;

/** Exported separately from the router instance so tests can mount it in a memory router. */
export const routes: RouteObject[] = [
  {
    element: <AuthLayout />,
    children: [
      {
        path: '/login',
        element: (
          <Suspense fallback={<PageLoader />}>
            <LoginPage />
          </Suspense>
        ),
      },
      {
        path: '/register',
        element: (
          <Suspense fallback={<PageLoader />}>
            <RegisterPage />
          </Suspense>
        ),
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <RootRedirect /> },
          {
            path: '/dashboard',
            element: (
              <RoleRoute roles={['AGENT', 'ADMIN']}>
                <DashboardPage />
              </RoleRoute>
            ),
          },
          { path: '/tickets', element: <TicketListPage /> },
          { path: '/tickets/new', element: <CreateTicketPage /> },
          { path: '/tickets/:ticketId', element: <TicketDetailPage /> },
          { path: '/profile', element: <ProfilePage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
];
