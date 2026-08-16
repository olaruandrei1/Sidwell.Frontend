import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { api } from '../shared/api/client';

// ─────────────────────────────────────────────────────────────────────────────
// Admin DTOs
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminUserDto {
  id: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
  whitelisted: boolean;
  createdAt: string;
}

export interface AdminWhoamiDto {
  isAdmin: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────────────

export function useAdminWhoamiQuery() {
  return useQuery({
    queryKey: ['admin', 'whoami'],
    queryFn: (): Promise<AdminWhoamiDto> => api.get('/admin/whoami'),
    staleTime: 60_000,
    retry: false, // Don't retry 403s
  });
}

export function useAdminUsersQuery(enabled: boolean = true) {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: (): Promise<AdminUserDto[]> => api.get('/admin/users'),
    enabled,
    staleTime: 30_000,
  });
}

export function useAdminWhitelistQuery(enabled: boolean = true) {
  return useQuery({
    queryKey: ['admin', 'whitelist'],
    queryFn: (): Promise<{ emails: string[] }> => api.get('/admin/whitelist'),
    enabled,
    staleTime: 30_000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

export function useGrantAccessMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (email: string): Promise<{ ok: boolean }> =>
      api.post('/admin/access', { email }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}

export function useRevokeAccessMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (email: string): Promise<void> =>
      api.delete(`/admin/access/${encodeURIComponent(email)}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}
