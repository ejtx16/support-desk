import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi, type LoginInput, type RegisterInput } from '../api';
import { isStaffRole, useAuthStore } from '../store';
import type { AuthResponse } from '@/types/api';

/** Where a user lands after authenticating (unless they were redirected from somewhere). */
export const homePathFor = (role: AuthResponse['user']['role']) =>
  isStaffRole(role) ? '/dashboard' : '/tickets';

function useOnAuthenticated(redirectTo?: string) {
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return ({ token, user }: AuthResponse) => {
    queryClient.clear(); // never show cached data from a previous user
    setSession(token, user);
    navigate(redirectTo ?? homePathFor(user.role), { replace: true });
  };
}

export function useLogin(redirectTo?: string) {
  const onSuccess = useOnAuthenticated(redirectTo);
  return useMutation({ mutationFn: (input: LoginInput) => authApi.login(input), onSuccess });
}

export function useRegister() {
  const onSuccess = useOnAuthenticated();
  return useMutation({ mutationFn: (input: RegisterInput) => authApi.register(input), onSuccess });
}

export function useLogout() {
  const logout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return () => {
    logout();
    queryClient.clear();
    navigate('/login', { replace: true });
  };
}

/** Re-validates the persisted session against the API once per app load. */
export function useSessionRefresh() {
  const token = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);
  const query = useQuery({
    queryKey: ['auth', 'me', token],
    queryFn: authApi.me,
    enabled: Boolean(token),
    staleTime: Infinity,
    retry: false,
  });

  useEffect(() => {
    if (query.data) setUser(query.data);
  }, [query.data, setUser]);
}
