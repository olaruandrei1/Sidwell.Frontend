import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type SyncTickerStatus = 'syncing' | 'succeeded' | 'failed';

export interface SyncingTicker {
  symbol: string;
  step: string;
  percent?: number;
  status: SyncTickerStatus;
  updatedAt: number; // Date.now() timestamp for recency sorting
}

// ─────────────────────────────────────────────────────────────────────────────
// Sync Store
// Tracks which tickers are currently syncing via SignalR SYNC_* events.
// Drives the navbar sync pill + per-ticker syncing badges in watchlist/ticker.
// ─────────────────────────────────────────────────────────────────────────────

export const useSyncStore = defineStore('sync', () => {
  // ── State ──────────────────────────────────────────────────────────────────
  /** Map<symbol, SyncingTicker> — only tickers actively syncing */
  const syncingTickers = ref<Map<string, SyncingTicker>>(new Map());

  // ── Computed ───────────────────────────────────────────────────────────────
  /** True when at least one ticker is actively syncing */
  const isSyncing = computed(() => syncingTickers.value.size > 0);

  /** Sorted list of currently syncing tickers (most recently updated first) */
  const activeSyncs = computed(() =>
    Array.from(syncingTickers.value.values())
      .sort((a, b) => b.updatedAt - a.updatedAt)
  );

  // ── Actions ────────────────────────────────────────────────────────────────

  /** SYNC_STARTED — add or reset ticker sync state */
  function startSync(symbol: string, step: string): void {
    const updated = new Map(syncingTickers.value);
    updated.set(symbol, {
      symbol,
      step,
      percent: 0,
      status: 'syncing',
      updatedAt: Date.now(),
    });
    syncingTickers.value = updated;
  }

  /** SYNC_PROGRESS — update step and percent */
  function updateProgress(symbol: string, step: string, percent?: number): void {
    const updated = new Map(syncingTickers.value);
    const existing = updated.get(symbol);
    updated.set(symbol, {
      symbol,
      step,
      percent: percent ?? existing?.percent ?? 0,
      status: 'syncing',
      updatedAt: Date.now(),
    });
    syncingTickers.value = updated;
  }

  /** SYNC_COMPLETE — mark final status and remove after short delay */
  function completeSync(symbol: string, _step: string, status: SyncTickerStatus): void {
    if (status === 'succeeded') {
      // Remove immediately on success — queries will refetch
      const updated = new Map(syncingTickers.value);
      updated.delete(symbol);
      syncingTickers.value = updated;
    } else {
      // On failure, keep briefly so the badge shows the error
      const updated = new Map(syncingTickers.value);
      updated.set(symbol, {
        symbol,
        step: _step,
        percent: 100,
        status,
        updatedAt: Date.now(),
      });
      syncingTickers.value = updated;

      // Auto-clear failed state after 10s
      setTimeout(() => {
        const next = new Map(syncingTickers.value);
        const current = next.get(symbol);
        if (current?.status === 'failed') {
          next.delete(symbol);
          syncingTickers.value = next;
        }
      }, 10_000);
    }
  }

  /** Check if a specific ticker is currently syncing */
  function isTickerSyncing(symbol: string): boolean {
    const entry = syncingTickers.value.get(symbol);
    return entry?.status === 'syncing';
  }

  /** Get full sync state for a specific ticker (for badges) */
  function getTickerSync(symbol: string): SyncingTicker | undefined {
    return syncingTickers.value.get(symbol);
  }

  return {
    syncingTickers,
    isSyncing,
    activeSyncs,
    startSync,
    updateProgress,
    completeSync,
    isTickerSyncing,
    getTickerSync,
  };
});
