import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { type Ref, unref } from 'vue';
import { api } from '../shared/api/client';
import type { ScreenerResultRow, ScreenerPreset } from '../shared/api/types';

export function useScreenerQuery(criteria: Ref<Record<string, any>> | Record<string, any>) {
  return useQuery({
    queryKey: ['screener', criteria],
    queryFn: () => api.post<ScreenerResultRow[]>('/screener', unref(criteria)),
    staleTime: 60 * 1000
  });
}

export function useScreenerPresetsQuery() {
  return useQuery({
    queryKey: ['screener-presets'],
    queryFn: () => api.get<ScreenerPreset[]>('/screener/presets'),
    staleTime: 5 * 60 * 1000
  });
}

export function useCreatePresetMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (preset: Omit<ScreenerPreset, 'id'>) =>
      api.post<ScreenerPreset>('/screener/presets', preset),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screener-presets'] });
    }
  });
}

export function useDeletePresetMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/screener/presets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screener-presets'] });
    }
  });
}
