import { useQuery, useMutation } from '@tanstack/vue-query';
import { api } from '../shared/api/client';

export interface VapidKeyDto {
  publicKey: string;
}

export function useVapidKeyQuery() {
  return useQuery({
    queryKey: ['webpush', 'vapid-key'],
    queryFn: (): Promise<VapidKeyDto> => api.get('/webpush/vapid-public-key'),
    staleTime: Infinity, // VAPID key never changes at runtime
  });
}

export function useWebPushSubscribeMutation() {
  return useMutation({
    mutationFn: (subscription: PushSubscriptionJSON): Promise<{ ok: boolean }> =>
      api.post('/webpush/subscribe', subscription),
  });
}
