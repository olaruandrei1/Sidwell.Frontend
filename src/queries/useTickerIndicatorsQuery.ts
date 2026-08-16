import { useQuery } from '@tanstack/vue-query';
import { computed, type MaybeRef, unref } from 'vue';
import { api } from '../shared/api/client';
import type { IndicatorSeriesDto } from '../shared/api/types';

export function useTickerIndicatorsQuery(symbolRef: MaybeRef<string>, typesRef: MaybeRef<string[]>) {
  return useQuery({
    queryKey: computed(() => ['ticker-indicators', unref(symbolRef), [...unref(typesRef)].sort()]),
    queryFn: (): Promise<IndicatorSeriesDto[]> =>
      api.get(`/tickers/${encodeURIComponent(unref(symbolRef))}/indicators`, {
        params: { types: unref(typesRef).join(',') },
      }),
    enabled: () => Boolean(unref(symbolRef)) && unref(typesRef).length > 0,
    staleTime: 60_000,
  });
}
