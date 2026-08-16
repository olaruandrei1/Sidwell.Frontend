import { ref, onUnmounted } from 'vue';
import { HubConnectionBuilder, HttpTransportType, LogLevel, type HubConnection } from '@microsoft/signalr';
import { useQueryClient } from '@tanstack/vue-query';
import { getAuthToken } from '../api/client';
import { useToast } from './useToast';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SyncProgressEvent {
  symbol: string;
  current: number;
  total: number;
  status: string;
  percent: number;
}

export type SignalREventName =
  | 'SYNC_STARTED'
  | 'SYNC_PROGRESS'
  | 'SYNC_COMPLETE'
  | 'PRICE_DROP_ALERT'
  | 'CRITICAL_NEWS_ALERT'
  | 'SEC_FILING_SYNCED'
  | 'DIVIDEND_READY'
  | 'BROKER_FEE_READY'
  | 'JOB_FAILED';

// ─────────────────────────────────────────────────────────────────────────────
// Module-level singleton (shared across all composable instances)
// ─────────────────────────────────────────────────────────────────────────────

const isConnected = ref(false);
const syncInProgress = ref(false);
const currentProgress = ref<SyncProgressEvent | null>(null);
const lastAlert = ref<string | null>(null);

let hubConnection: HubConnection | null = null;
let mockInterval: ReturnType<typeof setInterval> | null = null;

// ─────────────────────────────────────────────────────────────────────────────
// composable
// ─────────────────────────────────────────────────────────────────────────────

export function useSignalR() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const start = async () => {
    const useMocks = import.meta.env.VITE_USE_MOCKS === 'true';
    const broadcastUrl = import.meta.env.VITE_BROADCAST_URL;

    if (useMocks && !broadcastUrl) {
      // Mock mode: simulate real-time events locally
      isConnected.value = true;
      startMockEmitter();
      return;
    }

    if (hubConnection) return; // Already initialized

    const baseUrl = (broadcastUrl || 'http://localhost:5001').replace(/\/$/, '');
    hubConnection = new HubConnectionBuilder()
      .withUrl(`${baseUrl}/hub/sync`, {
        accessTokenFactory: () => getAuthToken() ?? '',
        transport: HttpTransportType.WebSockets | HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds(ctx) {
          return Math.min(1000 * Math.pow(2, ctx.previousRetryCount), 30_000);
        },
      })
      .configureLogging(import.meta.env.DEV ? LogLevel.Information : LogLevel.Warning)
      .build();

    // ── Core sync events ──────────────────────────────────────────────────
    hubConnection.on('SYNC_STARTED', () => {
      syncInProgress.value = true;
    });

    hubConnection.on('SYNC_PROGRESS', (data: SyncProgressEvent) => {
      syncInProgress.value = true;
      currentProgress.value = data;
    });

    hubConnection.on('SYNC_COMPLETE', (data?: { symbol?: string }) => {
      const completedSymbol = data?.symbol ?? currentProgress.value?.symbol ?? null;
      syncInProgress.value = false;
      currentProgress.value = null;
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      if (completedSymbol) {
        queryClient.invalidateQueries({ queryKey: ['ticker', completedSymbol] });
        queryClient.invalidateQueries({ queryKey: ['ticker-dividends', completedSymbol] });
        queryClient.invalidateQueries({ queryKey: ['ticker-verdict', completedSymbol] });
        queryClient.invalidateQueries({ queryKey: ['ticker-news', completedSymbol] });
      }
    });

    // ── Alert events ──────────────────────────────────────────────────────
    hubConnection.on('PRICE_DROP_ALERT', (payload: unknown) => {
      const p = payload as { symbol?: string; message?: string };
      lastAlert.value = `[Price Drop] ${p.message ?? ''}`;
      toast.error(`Price Alert${p.symbol ? ` — ${p.symbol}` : ''}`, p.message || 'Price threshold triggered');
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    });

    hubConnection.on('CRITICAL_NEWS_ALERT', (payload: unknown) => {
      const p = payload as { headline?: string; symbol?: string };
      lastAlert.value = `[News] ${p.headline ?? ''}`;
      toast.error('Critical News', p.headline || 'A critical market news event was detected');
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    });

    hubConnection.on('SEC_FILING_SYNCED', (payload: { symbol?: string; formType?: string }) => {
      lastAlert.value = `[SEC] ${payload.symbol ?? ''} ${payload.formType ?? ''}`.trim();
      toast.info(`SEC Filing${payload.symbol ? ` — ${payload.symbol}` : ''}`, `${payload.formType ?? 'Document'} has been synced`);
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    });

    hubConnection.on('DIVIDEND_READY', () => {
      queryClient.invalidateQueries({ queryKey: ['ticker'] });
    });

    hubConnection.on('BROKER_FEE_READY', () => {
      queryClient.invalidateQueries({ queryKey: ['broker-fees'] });
    });

    hubConnection.on('JOB_FAILED', (payload: unknown) => {
      const p = payload as { jobId?: string; message?: string };
      toast.error('Background Job Failed', p.message || 'A background sync job failed. Please retry manually.');
      console.error('[SignalR] JOB_FAILED', p);
    });

    hubConnection.onreconnected(() => { isConnected.value = true; });
    hubConnection.onreconnecting(() => { isConnected.value = false; });
    hubConnection.onclose(() => { isConnected.value = false; });

    try {
      await hubConnection.start();
      isConnected.value = true;
    } catch (e) {
      console.warn('[SignalR] Failed to connect:', e);
      isConnected.value = false;
    }
  };

  const stop = async () => {
    if (mockInterval) {
      clearInterval(mockInterval);
      mockInterval = null;
    }
    if (hubConnection) {
      await hubConnection.stop();
      hubConnection = null;
    }
    isConnected.value = false;
  };

  /** Register a handler for a specific event (for feature-level listeners) */
  function on<T = unknown>(event: SignalREventName, handler: (payload: T) => void): void {
    if (!hubConnection) return;
    hubConnection.on(event, handler);
  }

  function off(event: SignalREventName, handler: (payload: unknown) => void): void {
    if (!hubConnection) return;
    hubConnection.off(event, handler);
  }

  // ── Mock emitter ─────────────────────────────────────────────────────────

  const startMockEmitter = () => {
    if (mockInterval) return;
    let counter = 0;
    mockInterval = setInterval(() => {
      counter = (counter + 1) % 20;
      if (counter === 1) {
        syncInProgress.value = true;
        currentProgress.value = { symbol: 'TLV.RO', current: 1, total: 5, status: 'Fetching BVB quotes...', percent: 20 };
      } else if (counter === 5) {
        currentProgress.value = { symbol: 'H2O.RO', current: 3, total: 5, status: 'Updating dividends...', percent: 60 };
      } else if (counter === 8) {
        syncInProgress.value = false;
        currentProgress.value = null;
      }
    }, 3000);
  };

  onUnmounted(() => {
    // Individual component cleanup — don't stop the global connection
  });

  return {
    isConnected,
    syncInProgress,
    currentProgress,
    lastAlert,
    start,
    stop,
    on,
    off,
  };
}
