import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { api } from '../shared/api/client';
import type {
  SimulationConfig,
  SimulationResult,
  SavedSimulation,
} from '../shared/api/types';

// ─────────────────────────────────────────────────────────────────────────────
// Saved Simulations — CRUD
// ─────────────────────────────────────────────────────────────────────────────

export function useSimulationsQuery() {
  return useQuery({
    queryKey: ['finances', 'simulations'],
    queryFn: (): Promise<SavedSimulation[]> => api.get('/finances/simulations'),
    staleTime: 60_000,
  });
}

export function useSaveSimulationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; config: SimulationConfig }): Promise<SavedSimulation> =>
      api.post('/finances/simulations', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances', 'simulations'] });
    },
  });
}

export function useUpdateSimulationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      name,
      config,
    }: {
      id: string;
      name: string;
      config: SimulationConfig;
    }): Promise<SavedSimulation> =>
      api.put(`/finances/simulations/${encodeURIComponent(id)}`, { name, config }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances', 'simulations'] });
    },
  });
}

export function useDeleteSimulationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string): Promise<void> =>
      api.delete(`/finances/simulations/${encodeURIComponent(id)}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances', 'simulations'] });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Run simulation (live, unsaved)
// ─────────────────────────────────────────────────────────────────────────────

export function useRunSimulationMutation() {
  return useMutation({
    mutationFn: (config: SimulationConfig): Promise<SimulationResult> =>
      api.post('/finances/simulations/run', { config }),
  });
}
