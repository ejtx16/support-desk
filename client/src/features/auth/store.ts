import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { configureApiClient } from '@/lib/apiClient';
import type { User } from '@/types/api';

interface AuthState {
  token: string | null;
  user: User | null;
  setSession: (token: string, user: User) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

/** Client-side session. Server state (tickets, stats) lives in TanStack Query instead. */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: (token, user) => set({ token, user }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'queuedesk-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ token, user }) => ({ token, user }),
    },
  ),
);

// Wire the HTTP client to the store once, at module load.
configureApiClient({
  getToken: () => useAuthStore.getState().token,
  onUnauthorized: () => useAuthStore.getState().logout(),
});

export const isStaffRole = (role: User['role'] | undefined) => role === 'AGENT' || role === 'ADMIN';

/** Convenience selector hook. */
export function useCurrentUser() {
  const user = useAuthStore((s) => s.user);
  return { user, isStaff: isStaffRole(user?.role), isAdmin: user?.role === 'ADMIN' };
}
