import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { api } from '../shared/api/client';
import type { PortfolioDto, HoldingDto, TransactionResult } from '../shared/api/types';
import { usePortfolioStore } from '../stores/portfolio';
import { mockPortfolio } from '../mocks/fixtures/portfolio';

export function usePortfolioQuery() {
  const store = usePortfolioStore();
  const useMocks = import.meta.env.VITE_USE_MOCKS === 'true';

  const query = useQuery({
    queryKey: ['portfolio'],
    queryFn: async () => {
      const data = await api.get<PortfolioDto>('/portfolio');
      store.setPortfolio(data);
      return data;
    },
    initialData: useMocks ? mockPortfolio : undefined,
    staleTime: 30 * 1000
  });

  if (useMocks && !store.portfolioData) {
    store.setPortfolio(mockPortfolio);
  }

  return query;
}

export interface CreateTransactionInput {
  symbol: string;
  side: 'BUY' | 'SELL';
  shares: string;
  broker: string;
  // When priceAuto is true the backend resolves the price from price_history
  // (latest close for a today/recent row, at-or-before close for a back-dated row)
  // and echoes it back as TransactionResult.resolvedPrice. `price` is then optional
  // (used only as a fallback if the ticker has no synced history yet).
  price?: string;
  priceAuto?: boolean;
  fee?: string;
  executedAt?: string;
  fxRateAtExecution?: string;
  targetShares?: string;
  force?: boolean;
}

export function useCreateTransactionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTransactionInput) => api.post<TransactionResult>('/transactions', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['ticker-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['ticker'] });
    }
  });
}

export function useDeletePositionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (symbol: string) => api.delete<void>(`/portfolio/positions/${symbol}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    }
  });
}

export function useRecalcPositionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (symbol: string) => api.post<{ holding: HoldingDto | null }>(`/portfolio/positions/${symbol}/recalc`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['ticker'] });
    }
  });
}

export function useRecalcAllMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ recomputed: number }>('/portfolio/recalc-all', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['ticker'] });
    }
  });
}

export function useUpdateTransactionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CreateTransactionInput> }) =>
      api.put<TransactionResult>(`/transactions/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['ticker-transactions'] });
    }
  });
}

export function useDeleteTransactionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ holding: HoldingDto | null }>(`/transactions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['ticker-transactions'] });
    }
  });
}
