import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { computed, type MaybeRef, unref } from 'vue';
import { api } from '../shared/api/client';
import type { TickerNoteDto, TickerNoteSectionDto, TickerNoteAttachmentDto } from '../shared/api/types';

export type { TickerNoteSectionDto, TickerNoteAttachmentDto };

export interface UpsertNotePayload {
  title: string;
  sections: TickerNoteSectionDto[];
  attachments: TickerNoteAttachmentDto[];
}

export function useTickerNotesQuery(symbolRef: MaybeRef<string>) {
  return useQuery({
    queryKey: computed(() => ['ticker-notes', unref(symbolRef)]),
    queryFn: (): Promise<TickerNoteDto[]> =>
      api.get(`/tickers/${encodeURIComponent(unref(symbolRef))}/notes`),
    enabled: () => Boolean(unref(symbolRef)),
    staleTime: 10_000,
  });
}

export function useCreateTickerNoteMutation(symbolRef: MaybeRef<string>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertNotePayload): Promise<TickerNoteDto> =>
      api.post(`/tickers/${encodeURIComponent(unref(symbolRef))}/notes`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticker-notes', unref(symbolRef)] });
    },
  });
}

export function useUpdateTickerNoteMutation(symbolRef: MaybeRef<string>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpsertNotePayload }): Promise<TickerNoteDto> =>
      api.put(`/tickers/${encodeURIComponent(unref(symbolRef))}/notes/${encodeURIComponent(id)}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticker-notes', unref(symbolRef)] });
    },
  });
}

export function useDeleteTickerNoteMutation(symbolRef: MaybeRef<string>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string): Promise<void> =>
      api.delete(`/tickers/${encodeURIComponent(unref(symbolRef))}/notes/${encodeURIComponent(id)}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticker-notes', unref(symbolRef)] });
    },
  });
}
