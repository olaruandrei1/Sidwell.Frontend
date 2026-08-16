import { useQuery, useMutation } from '@tanstack/vue-query';
import { api } from '../shared/api/client';
import type { BrokerDto, BrokerFeeEstimate } from '../shared/api/types';

export function useBrokersQuery() {
  return useQuery({
    queryKey: ['brokers'],
    queryFn: () => api.get<BrokerDto[]>('/brokers'),
    staleTime: 60 * 60 * 1000 // 1 hour
  });
}

export interface EstimateFeeInput {
  broker: string;
  symbol: string;
  shares: string;
  price: string;
  currency: string;
}

export function useEstimateFeeMutation() {
  return useMutation({
    mutationFn: (input: EstimateFeeInput) =>
      api.post<BrokerFeeEstimate>(`/brokers/${input.broker}/estimate-fee`, {
        symbol: input.symbol,
        shares: input.shares,
        price: input.price,
        currency: input.currency
      })
  });
}
