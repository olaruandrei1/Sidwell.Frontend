import { ref, computed, watch, type MaybeRef, unref } from 'vue';
import { api } from '../shared/api/client';
import type { IndicatorSeriesDto } from '../shared/api/types';

function keyOf(dto: IndicatorSeriesDto): string {
  const period = (dto.params as Record<string, number> | undefined)?.period;
  return typeof period === 'number' ? `${dto.type}${period}` : dto.type;
}

// Per-type cache so toggling one indicator only fetches the newly-added type(s) instead of
// re-requesting every active indicator every time the active set changes.
export function useTickerIndicatorsQuery(symbolRef: MaybeRef<string>, typesRef: MaybeRef<string[]>) {
  const cache = ref(new Map<string, IndicatorSeriesDto>());
  const isLoading = ref(false);

  watch(
    [() => unref(symbolRef), () => [...unref(typesRef)].sort().join(',')],
    async ([symbol, sortedTypesStr], prev) => {
      const prevSymbol = prev?.[0];
      const types = sortedTypesStr ? sortedTypesStr.split(',') : [];
      if (!symbol || types.length === 0) return;

      if (symbol !== prevSymbol) {
        cache.value = new Map();
      }

      const missing = types.filter((t) => !cache.value.has(t));
      if (missing.length === 0) return;

      isLoading.value = true;
      try {
        const fetched = await api.get<IndicatorSeriesDto[]>(`/tickers/${encodeURIComponent(symbol)}/indicators`, {
          params: { types: missing.join(',') },
        });
        const next = new Map(cache.value);
        for (const dto of fetched) {
          next.set(keyOf(dto), dto);
        }
        cache.value = next;
      } finally {
        isLoading.value = false;
      }
    },
    { immediate: true }
  );

  const data = computed<IndicatorSeriesDto[]>(() => {
    const types = [...unref(typesRef)];
    return types.map((t) => cache.value.get(t)).filter((d): d is IndicatorSeriesDto => Boolean(d));
  });

  return { data, isLoading };
}
