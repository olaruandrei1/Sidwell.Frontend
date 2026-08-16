import * as signalR from '@microsoft/signalr';
import { getAuthToken } from '../shared/api/client';
import { ref } from 'vue';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

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

export type SignalRHandler<T = unknown> = (payload: T) => void;

// ─────────────────────────────────────────────────────────────────────────────
// Singleton hub connection
// ─────────────────────────────────────────────────────────────────────────────

let _connection: signalR.HubConnection | null = null;

export const signalRState = ref<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');

function buildConnection(): signalR.HubConnection {
  const broadcastUrl = (import.meta.env.VITE_BROADCAST_URL || 'http://localhost:5001').replace(/\/$/, '');
  return new signalR.HubConnectionBuilder()
    .withUrl(`${broadcastUrl}/hub/sync`, {
      accessTokenFactory: () => getAuthToken() ?? '',
      transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
    })
    .withAutomaticReconnect({
      nextRetryDelayInMilliseconds(retryContext) {
        // Exponential backoff: 1s, 2s, 4s, 8s, 30s max
        const delay = Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30_000);
        return delay;
      },
    })
    .configureLogging(
      import.meta.env.DEV ? signalR.LogLevel.Information : signalR.LogLevel.Warning
    )
    .build();
}

function getOrCreateConnection(): signalR.HubConnection {
  if (!_connection) {
    _connection = buildConnection();

    _connection.onreconnecting(() => {
      signalRState.value = 'connecting';
    });
    _connection.onreconnected(() => {
      signalRState.value = 'connected';
    });
    _connection.onclose(() => {
      signalRState.value = 'disconnected';
    });
  }
  return _connection;
}

// ─────────────────────────────────────────────────────────────────────────────
// useSignalR composable
// ─────────────────────────────────────────────────────────────────────────────

export function useSignalR() {
  const connection = getOrCreateConnection();

  async function connect(): Promise<void> {
    if (
      connection.state === signalR.HubConnectionState.Connected ||
      connection.state === signalR.HubConnectionState.Connecting
    ) {
      return;
    }
    signalRState.value = 'connecting';
    try {
      await connection.start();
      signalRState.value = 'connected';
    } catch (err) {
      signalRState.value = 'error';
      console.error('[SignalR] Connection failed:', err);
    }
  }

  async function disconnect(): Promise<void> {
    if (connection.state !== signalR.HubConnectionState.Disconnected) {
      await connection.stop();
    }
    signalRState.value = 'disconnected';
  }

  function on<T = unknown>(event: SignalREventName, handler: SignalRHandler<T>): void {
    connection.on(event, handler);
  }

  function off(event: SignalREventName, handler: SignalRHandler): void {
    connection.off(event, handler);
  }

  return {
    state: signalRState,
    connect,
    disconnect,
    on,
    off,
    connection,
  };
}
