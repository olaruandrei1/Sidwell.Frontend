import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { api } from '../shared/api/client';
import type { WatchlistRow } from '../shared/api/types';
import { mockWatchlist } from '../mocks/fixtures/portfolio';

export function useWatchlistQuery() {
  const useMocks = import.meta.env.VITE_USE_MOCKS === 'true';
  return useQuery({
    queryKey: ['watchlist'],
    queryFn: () => api.get<WatchlistRow[]>('/watchlist'),
    initialData: useMocks ? mockWatchlist : undefined,
    staleTime: 30 * 1000
  });
}

export function useAddToWatchlistMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (symbol: string) => api.post<WatchlistRow>('/watchlist', { symbol }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    }
  });
}

export function useRemoveFromWatchlistMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (symbol: string) => api.delete(`/watchlist/${symbol}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    }
  });
}
