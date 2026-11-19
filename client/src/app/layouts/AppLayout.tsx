import { Suspense } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Avatar, Button, PageLoader } from '@/components/ui';
import { useLogout, useSessionRefresh } from '@/features/auth/hooks/useAuth';
import { useCurrentUser } from '@/features/auth/store';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { cn } from '@/lib/cn';
import { ROLE_LABELS } from '@/lib/labels';
import { Logo } from './Logo';

function NavItem({ to, children, end }: { to: string; children: React.ReactNode; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
          isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100',
        )
      }
    >
      {children}
    </NavLink>
  );
}

/** Authenticated shell: top navigation + routed page content. */
export function AppLayout() {
  useSessionRefresh();
  const { user, isStaff } = useCurrentUser();
  const logout = useLogout();
  if (!user) return null;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link to="/" aria-label="QueueDesk home">
            <Logo />
          </Link>
          <nav aria-label="Main" className="flex items-center gap-1">
            {isStaff && <NavItem to="/dashboard">Dashboard</NavItem>}
            <NavItem to="/tickets" end>
              {isStaff ? 'Queue' : 'My tickets'}
            </NavItem>
            <NavItem to="/tickets/new">New ticket</NavItem>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <NotificationBell />
            <Link
              to="/profile"
              aria-label="Your profile"
              className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-100"
            >
              <Avatar name={user.name} size="sm" />
              <div className="hidden leading-tight sm:block">
                <p className="text-sm font-medium text-slate-800">{user.name}</p>
                <p className="text-xs text-slate-500">{ROLE_LABELS[user.role]}</p>
              </div>
            </Link>
            <Button variant="ghost" size="sm" onClick={logout}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
