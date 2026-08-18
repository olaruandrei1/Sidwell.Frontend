import { ref, computed, watch, type MaybeRef, unref } from 'vue';
import { api } from '../shared/api/client';
import type { IndicatorSeriesDto } from '../shared/api/types';

// Per-type cache so toggling one indicator only fetches the newly-added type(s) instead of
// re-requesting every active indicator every time the active set changes. Cached by the exact
// requested type string (e.g. "sma20"), paired positionally with the response array — the
// backend preserves request order (Core computes indicators via an order-preserving LINQ
// projection), so this avoids reverse-engineering a matching key from the response shape.
export function useTickerIndicatorsQuery(symbolRef: MaybeRef<string>, typesRef: MaybeRef<string[]>) {
  const cache = ref(new Map<string, IndicatorSeriesDto>());
  const isLoading = ref(false);
  let pendingSymbol: string | null = null;

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

      // Guards against an in-flight fetch's response overwriting a newer request's cache
      // entries if the user toggles indicators again before the first fetch resolves.
      const requestToken = symbol;
      pendingSymbol = requestToken;

      isLoading.value = true;
      try {
        const fetched = await api.get<IndicatorSeriesDto[]>(`/tickers/${encodeURIComponent(symbol)}/indicators`, {
          params: { types: missing.join(',') },
        });

        if (pendingSymbol !== requestToken) return;

        const next = new Map(cache.value);
        missing.forEach((type, idx) => {
          const dto = fetched[idx];
          if (dto) next.set(type, dto);
        });
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
