import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store';
import { homePathFor } from '@/features/auth/hooks/useAuth';
import { Logo } from './Logo';

/** Layout for public auth pages. Already-signed-in users are sent home. */
export function AuthLayout() {
  const user = useAuthStore((s) => s.user);
  if (user) return <Navigate to={homePathFor(user.role)} replace />;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Logo className="mb-8" />
      <main className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Outlet />
      </main>
      <p className="mt-6 text-xs text-slate-400">QueueDesk · ticket support queue</p>
    </div>
  );
}
