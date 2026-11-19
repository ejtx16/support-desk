import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { homePathFor } from '@/features/auth/hooks/useAuth';
import { useAuthStore } from '@/features/auth/store';
import type { Role } from '@/types/api';

/** Requires a signed-in user; otherwise redirects to /login and remembers where to return. */
export function ProtectedRoute() {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
}

/** Restricts a page to the given roles; other users go to their home page. */
export function RoleRoute({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={homePathFor(user.role)} replace />;
  return <>{children}</>;
}

/** `/` sends each role to the right starting screen. */
export function RootRedirect() {
  const user = useAuthStore((s) => s.user);
  return <Navigate to={user ? homePathFor(user.role) : '/login'} replace />;
}
