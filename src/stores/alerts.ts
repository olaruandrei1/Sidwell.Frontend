import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AlertType = 'price_drop' | 'critical_news' | 'job_failed';

export interface AlertItem {
  id: string;
  type: AlertType;
  symbol?: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  /** Extra structured data per alert type */
  meta: PriceDropMeta | CriticalNewsMeta | JobFailedMeta;
}

export interface PriceDropMeta {
  type: 'price_drop';
  latestClose: string; // Money = always string
  previousClose: string;
  changePct: string;
  date: string;
}

export interface CriticalNewsMeta {
  type: 'critical_news';
  newsTitle: string;
  url: string;
  sentiment: string | null;
  publishedAt: string;
}

export interface JobFailedMeta {
  type: 'job_failed';
  jobId: string;
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — Money is ALWAYS string, never number
// ─────────────────────────────────────────────────────────────────────────────

function toMoneyString(value: unknown): string {
  if (value === null || value === undefined) return '0';
  return String(value);
}

function generateId(): string {
  return `alert-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Alerts Store
// Holds realtime alerts pushed from SignalR (price drops, critical news, job
// failures). These are ephemeral in-memory alerts — server-side notifications
// are fetched separately via the existing /notifications endpoint.
// ─────────────────────────────────────────────────────────────────────────────

export const useAlertsStore = defineStore('alerts', () => {
  // ── State ──────────────────────────────────────────────────────────────────
  const realtimeAlerts = ref<AlertItem[]>([]);

  // ── Computed ───────────────────────────────────────────────────────────────
  const unreadCount = computed(() => realtimeAlerts.value.filter((a) => !a.isRead).length);

  const sortedAlerts = computed(() =>
    [...realtimeAlerts.value].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  );

  // ── Actions ────────────────────────────────────────────────────────────────

  /** Add a price drop alert from PRICE_DROP_ALERT event */
  function addPriceDropAlert(payload: Record<string, unknown>): AlertItem {
    const symbol = String(payload.symbol ?? '');
    const changePct = toMoneyString(payload.changePct);
    const alert: AlertItem = {
      id: generateId(),
      type: 'price_drop',
      symbol,
      title: `⚠️ ${symbol} dropped ${changePct}%`,
      body: `Latest close: ${toMoneyString(payload.latestClose)} → Previous: ${toMoneyString(payload.previousClose)}`,
      isRead: false,
      createdAt: new Date().toISOString(),
      meta: {
        type: 'price_drop',
        latestClose: toMoneyString(payload.latestClose),
        previousClose: toMoneyString(payload.previousClose),
        changePct,
        date: String(payload.date ?? new Date().toISOString()),
      },
    };
    realtimeAlerts.value = [alert, ...realtimeAlerts.value];
    return alert;
  }

  /** Add a critical news alert from CRITICAL_NEWS_ALERT event */
  function addCriticalNewsAlert(payload: Record<string, unknown>): AlertItem {
    const symbol = String(payload.symbol ?? '');
    const title = String(payload.title ?? payload.headline ?? 'Breaking News');
    const alert: AlertItem = {
      id: generateId(),
      type: 'critical_news',
      symbol,
      title: `${symbol}: ${title}`,
      body: title,
      isRead: false,
      createdAt: new Date().toISOString(),
      meta: {
        type: 'critical_news',
        newsTitle: title,
        url: String(payload.url ?? ''),
        sentiment: payload.sentiment != null ? toMoneyString(payload.sentiment) : null,
        publishedAt: String(payload.publishedAt ?? new Date().toISOString()),
      },
    };
    realtimeAlerts.value = [alert, ...realtimeAlerts.value];
    return alert;
  }

  /** Add a job failed alert from JOB_FAILED event */
  function addJobFailedAlert(payload: Record<string, unknown>): AlertItem {
    const jobId = String(payload.jobId ?? '');
    const message = String(payload.message ?? 'A background sync job failed');
    const alert: AlertItem = {
      id: generateId(),
      type: 'job_failed',
      title: '❌ Background Job Failed',
      body: message,
      isRead: false,
      createdAt: new Date().toISOString(),
      meta: {
        type: 'job_failed',
        jobId,
        message,
      },
    };
    realtimeAlerts.value = [alert, ...realtimeAlerts.value];
    return alert;
  }

  /** Mark a single alert as read */
  function markRead(alertId: string): void {
    realtimeAlerts.value = realtimeAlerts.value.map((a) =>
      a.id === alertId ? { ...a, isRead: true } : a
    );
  }

  /** Mark all realtime alerts as read */
  function markAllRead(): void {
    realtimeAlerts.value = realtimeAlerts.value.map((a) => ({ ...a, isRead: true }));
  }

  /** Remove a single alert */
  function dismiss(alertId: string): void {
    realtimeAlerts.value = realtimeAlerts.value.filter((a) => a.id !== alertId);
  }

  return {
    realtimeAlerts,
    unreadCount,
    sortedAlerts,
    addPriceDropAlert,
    addCriticalNewsAlert,
    addJobFailedAlert,
    markRead,
    markAllRead,
    dismiss,
  };
});
