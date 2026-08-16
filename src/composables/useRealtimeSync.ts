import { onMounted, onUnmounted } from 'vue';
import { useQueryClient } from '@tanstack/vue-query';
import { useSignalR } from '../lib/signalr';
import { useToast } from '../shared/composables/useToast';

// ─────────────────────────────────────────────────────────────────────────────
// useRealtimeSync
// Wires all SignalR events to the app's state/query layer.
// Mount this once in App.vue after auth is confirmed.
// In mock mode (VITE_USE_MOCKS=true), events are simulated by MSW WebSocket
// interceptors and don't require a real Broadcasting service.
// ─────────────────────────────────────────────────────────────────────────────

export function useRealtimeSync() {
  const { connect, disconnect, on, off, state } = useSignalR();
  const queryClient = useQueryClient();
  const toast = useToast();

  const useMocks = import.meta.env.VITE_USE_MOCKS === 'true';
  const broadcastUrl = import.meta.env.VITE_BROADCAST_URL;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const onSyncStarted = (_payload: unknown) => {
    console.debug('[SignalR] SYNC_STARTED');
  };

  const onSyncProgress = (_payload: unknown) => {
    console.debug('[SignalR] SYNC_PROGRESS');
  };

  const onSyncComplete = (payload: unknown) => {
    // Refetch watchlist and portfolio to reflect fresh data
    queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    console.debug('[SignalR] SYNC_COMPLETE', payload);
  };

  const onPriceDropAlert = (payload: unknown) => {
    const p = payload as { symbol?: string; message?: string };
    toast.error(
      `Price Alert${p.symbol ? ` — ${p.symbol}` : ''}`,
      p.message || 'Price threshold triggered'
    );
    queryClient.invalidateQueries({ queryKey: ['alerts'] });
  };

  const onCriticalNewsAlert = (payload: unknown) => {
    const p = payload as { headline?: string; symbol?: string };
    toast.error(
      'Critical News',
      p.headline || 'A critical market news event was detected'
    );
    queryClient.invalidateQueries({ queryKey: ['alerts'] });
  };

  const onSecFilingSynced = (payload: unknown) => {
    const p = payload as { symbol?: string; formType?: string };
    toast.info(
      `SEC Filing${p.symbol ? ` — ${p.symbol}` : ''}`,
      `${p.formType ?? 'Document'} has been synced`
    );
    queryClient.invalidateQueries({ queryKey: ['alerts'] });
  };

  const onDividendReady = (_payload: unknown) => {
    queryClient.invalidateQueries({ queryKey: ['ticker'] });
  };

  const onBrokerFeeReady = (_payload: unknown) => {
    queryClient.invalidateQueries({ queryKey: ['broker-fees'] });
  };

  const onJobFailed = (payload: unknown) => {
    const p = payload as { jobId?: string; message?: string };
    toast.error(
      'Background Job Failed',
      p.message || 'A background sync job failed. Please retry manually.'
    );
    console.error('[SignalR] JOB_FAILED', p);
  };

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  onMounted(async () => {
    // In mock mode without a real Broadcasting URL, skip SignalR entirely
    if (useMocks && !broadcastUrl) {
      console.debug('[SignalR] Mock mode — SignalR connection skipped');
      return;
    }

    on('SYNC_STARTED', onSyncStarted);
    on('SYNC_PROGRESS', onSyncProgress);
    on('SYNC_COMPLETE', onSyncComplete);
    on('PRICE_DROP_ALERT', onPriceDropAlert);
    on('CRITICAL_NEWS_ALERT', onCriticalNewsAlert);
    on('SEC_FILING_SYNCED', onSecFilingSynced);
    on('DIVIDEND_READY', onDividendReady);
    on('BROKER_FEE_READY', onBrokerFeeReady);
    on('JOB_FAILED', onJobFailed);

    await connect();
  });

  onUnmounted(async () => {
    off('SYNC_STARTED', onSyncStarted);
    off('SYNC_PROGRESS', onSyncProgress);
    off('SYNC_COMPLETE', onSyncComplete);
    off('PRICE_DROP_ALERT', onPriceDropAlert);
    off('CRITICAL_NEWS_ALERT', onCriticalNewsAlert);
    off('SEC_FILING_SYNCED', onSecFilingSynced);
    off('DIVIDEND_READY', onDividendReady);
    off('BROKER_FEE_READY', onBrokerFeeReady);
    off('JOB_FAILED', onJobFailed);

    await disconnect();
  });

  return { state };
}
