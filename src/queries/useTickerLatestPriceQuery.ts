import { useMutation } from '@tanstack/vue-query';
import { api } from '../shared/api/client';

export interface TickerLatestPrice {
  symbol: string;
  price: string | null;
  source: 'YFINANCE' | 'PRICE_HISTORY' | 'NONE';
  asOfDate: string | null;
}

export function useLatestPriceMutation() {
  return useMutation({
    mutationFn: (symbol: string) => api.get<TickerLatestPrice>(`/tickers/${symbol}/latest-price`)
  });
}
