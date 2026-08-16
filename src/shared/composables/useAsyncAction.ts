import { ref } from 'vue';
import type { ApiError } from '../api/types';
import { isApiError } from '../utils/guards';

export function useAsyncAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>
) {
  const loading = ref(false);
  const error = ref<ApiError | null>(null);

  const execute = async (...args: TArgs): Promise<TResult | null> => {
    if (loading.value) return null; // Guard against double execution
    loading.value = true;
    error.value = null;
    try {
      const res = await action(...args);
      return res;
    } catch (err: unknown) {
      if (isApiError(err)) {
        error.value = err;
      } else {
        error.value = {
          status: 500,
          code: 'UNEXPECTED_ERROR',
          message: err instanceof Error ? err.message : String(err)
        };
      }
      return null;
    } finally {
      loading.value = false;
    }
  };

  return {
    loading,
    error,
    execute,
    reset: () => {
      loading.value = false;
      error.value = null;
    }
  };
}
