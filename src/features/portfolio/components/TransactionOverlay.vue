<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useCreateTransactionMutation, type CreateTransactionInput } from '../../../queries/usePortfolioQuery';
import { useBrokersQuery, useEstimateFeeMutation } from '../../../queries/useBrokersQuery';
import { useLatestPriceMutation } from '../../../queries/useTickerLatestPriceQuery';
import { useToast } from '../../../shared/composables/useToast';
import AdaptiveOverlay from '../../../shared/ui/organisms/AdaptiveOverlay.vue';
import FormField from '../../../shared/ui/molecules/FormField.vue';
import BrokerDropdown from '../../../shared/ui/molecules/BrokerDropdown.vue';
import AppButton from '../../../shared/ui/atoms/AppButton.vue';
import AppInput from '../../../shared/ui/atoms/AppInput.vue';
import MoneyInput from '../../../shared/ui/atoms/MoneyInput.vue';
import TickerSearchInput, { type TickerSearchResult } from '../../../shared/ui/molecules/TickerSearchInput.vue';

function onTickerSelected(item: TickerSearchResult) {
  if (item.currency && !formCurrency.value) {
    formCurrency.value = item.currency.toUpperCase();
  }
}
import type { BrokerCode, TransactionResult, ApiError } from '../../../shared/api/types';

// ── Props & Emits ────────────────────────────────────────────────────────────
const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    /** Pre-fill symbol (from ticker/watchlist).  When set the field is locked. */
    prefillSymbol?: string;
  }>(),
  { prefillSymbol: '' }
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  /** Emitted after at least one row succeeds (caller can refresh data). */
  'submitted': [];
}>();

const { t } = useI18n();

// ── Row type ─────────────────────────────────────────────────────────────────
interface TxRow {
  id: number;
  shares: string;
  price: string;
  priceAuto: boolean;
  priceConfirmed: boolean;
  commission: string;
  executedAt: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string;
  resolvedPrice: string;
  priceSource: 'MANUAL' | 'AUTO' | 'MANUAL_FALLBACK' | '';
  priceDate: string;
}

let rowIdSeq = 0;
const makeRow = (): TxRow => ({
  id: ++rowIdSeq,
  shares: '',
  price: '',
  priceAuto: true,
  priceConfirmed: true,
  commission: '',
  executedAt: todayStr(),
  status: 'idle',
  error: '',
  resolvedPrice: '',
  priceSource: '',
  priceDate: ''
});

function todayStr(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// ── Shared header state ──────────────────────────────────────────────────────
const formSymbol = ref(props.prefillSymbol || '');
const formSide = ref<'BUY' | 'SELL'>('BUY');
const formBroker = ref<BrokerCode>('TRADEVILLE');
const formCurrency = ref('RON');
const formTargetShares = ref('');

// Sync prefillSymbol when prop changes
watch(
  () => props.prefillSymbol,
  (v) => {
    if (v) formSymbol.value = v;
  }
);

// Reset form when overlay opens
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      formSymbol.value = props.prefillSymbol || '';
      formSide.value = 'BUY';
      formTargetShares.value = '';
      rows.length = 0;
      rows.push(makeRow());
      isSubmitting.value = false;
    }
  }
);

const isSymbolLocked = computed(() => Boolean(props.prefillSymbol));

// ── Transaction rows ─────────────────────────────────────────────────────────
const rows = reactive<TxRow[]>([makeRow()]);

const addRow = () => {
  rows.push(makeRow());
  if (formSymbol.value.trim()) {
    void fetchLatestPrice(formSymbol.value.trim());
  }
};

const removeRow = (idx: number) => {
  if (rows.length <= 1) return;
  rows.splice(idx, 1);
};

const latestPriceMutation = useLatestPriceMutation();
let symbolDebounceTimer: ReturnType<typeof setTimeout> | null = null;

watch(formSymbol, (v) => {
  if (symbolDebounceTimer) clearTimeout(symbolDebounceTimer);
  const trimmed = v.trim();
  if (!trimmed) return;
  symbolDebounceTimer = setTimeout(() => {
    void fetchLatestPrice(trimmed);
  }, 500);
});

async function fetchLatestPrice(symbol: string) {
  try {
    const result = await latestPriceMutation.mutateAsync(symbol.toUpperCase());
    if (!result.price) return;
    const targetRow = rows.find((r) => !r.price);
    if (!targetRow) return;
    targetRow.price = result.price;
    targetRow.priceAuto = false;
    targetRow.priceConfirmed = false;
  } catch {
    return;
  }
}

function onRowPriceInput(row: TxRow, value: string) {
  row.price = value;
  row.priceConfirmed = true;
}

// ── Fee estimation ───────────────────────────────────────────────────────────
const { data: brokers } = useBrokersQuery();
const estimateFeeMutation = useEstimateFeeMutation();

async function estimateRowCommission(row: TxRow) {
  if (!row.shares) return;
  const priceForFee = row.priceAuto ? '' : row.price;
  if (!priceForFee) return;
  try {
    const est = await estimateFeeMutation.mutateAsync({
      broker: formBroker.value,
      symbol: formSymbol.value,
      shares: row.shares,
      price: priceForFee,
      currency: formCurrency.value
    });
    row.commission = est.fee;
  } catch {
    return;
  }
}

// ── Submission ───────────────────────────────────────────────────────────────
const toast = useToast();
const createTxMutation = useCreateTransactionMutation();
const isSubmitting = ref(false);

const canSubmit = computed(() => {
  if (!formSymbol.value.trim()) return false;
  return rows.some((r) => {
    if (!r.shares || r.status === 'loading') return false;
    // Manual price rows must have a price
    if (!r.priceAuto && !r.price) return false;
    return true;
  });
});

const handleSubmit = async () => {
  isSubmitting.value = true;
  let successCount = 0;

  for (const row of rows) {
    if (row.status === 'success') continue;
    if (!row.shares) {
      row.error = 'Shares required';
      row.status = 'error';
      continue;
    }
    if (!row.priceAuto && !row.price) {
      row.error = 'Price required when AUTO is off';
      row.status = 'error';
      continue;
    }

    row.status = 'loading';
    row.error = '';

    const input: CreateTransactionInput = {
      symbol: formSymbol.value.trim().toUpperCase(),
      side: formSide.value,
      shares: row.shares,
      broker: formBroker.value,
      priceAuto: row.priceAuto,
      executedAt: row.executedAt || todayStr(),
      ...(row.commission.trim() ? { fee: row.commission.trim() } : {}),
      ...(formTargetShares.value ? { targetShares: formTargetShares.value } : {})
    };

    if (!row.priceAuto) {
      input.price = row.price;
    }

    try {
      const result: TransactionResult = await createTxMutation.mutateAsync(input);

      row.status = 'success';
      row.resolvedPrice = result.resolvedPrice;
      row.priceSource = result.priceSource;
      row.priceDate = result.priceDate || '';
      row.price = result.resolvedPrice;
      successCount++;
    } catch (err: unknown) {
      const msg = isApiError(err) ? err.message : (err instanceof Error ? err.message : 'Unknown error');
      const looksLikeSanity = /latest close|per-share|force=true/i.test(msg);
      if (looksLikeSanity && !input.force && confirm(`${msg}\n\nSubmit anyway?`)) {
        try {
          const result: TransactionResult = await createTxMutation.mutateAsync({ ...input, force: true });
          row.status = 'success';
          row.resolvedPrice = result.resolvedPrice;
          row.priceSource = result.priceSource;
          row.priceDate = result.priceDate || '';
          row.price = result.resolvedPrice;
          successCount++;
          continue;
        } catch (err2: unknown) {
          row.status = 'error';
          row.error = isApiError(err2) ? err2.message : (err2 instanceof Error ? err2.message : 'Unknown error');
          continue;
        }
      }
      row.status = 'error';
      row.error = msg;
    }
  }

  isSubmitting.value = false;

  if (successCount > 0) {
    emit('submitted');
    toast.success(
      'Transactions Saved',
      `${successCount} ${formSide.value} order${successCount > 1 ? 's' : ''} for ${formSymbol.value}`
    );
  }

  // Close if all rows succeeded
  const allDone = rows.every((r) => r.status === 'success');
  if (allDone) {
    emit('update:modelValue', false);
  }
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function isApiError(err: unknown): err is ApiError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    'code' in err &&
    'message' in err
  );
}

const toggleAutoPrice = (row: TxRow) => {
  row.priceAuto = !row.priceAuto;
  if (row.priceAuto) {
    // Clear manual price when switching to auto
    row.price = '';
  }
};

function rowNotional(row: TxRow): string {
  const s = parseFloat(row.shares);
  const p = parseFloat(row.price);
  if (!isFinite(s) || s <= 0 || !isFinite(p) || p <= 0) return '';
  return `${s} × ${p.toFixed(4)} = ${(s * p).toFixed(2)} ${formCurrency.value}`;
}
</script>

<template>
  <AdaptiveOverlay
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    title="Add Transaction Order"
    :persistent="true"
    initial-snap="full"
    :max-width="720"
  >
    <div class="space-y-5 font-mono text-sm">
      <!-- ═══════════════ HEADER FIELDS ═══════════════ -->
      <div class="space-y-3">
        <!-- Row 1: Side toggle + Symbol -->
        <div class="grid grid-cols-[140px_1fr] gap-3">
          <FormField label="Side" required>
            <div class="flex rounded-md overflow-hidden border border-terminal-border">
              <button
                type="button"
                @click="formSide = 'BUY'"
                class="flex-1 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors duration-150"
                :class="formSide === 'BUY'
                  ? 'bg-terminal-up/20 text-terminal-up border-r border-terminal-border'
                  : 'bg-terminal-surface text-gray-500 hover:text-gray-300 border-r border-terminal-border'"
              >
                BUY
              </button>
              <button
                type="button"
                @click="formSide = 'SELL'"
                class="flex-1 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors duration-150"
                :class="formSide === 'SELL'
                  ? 'bg-terminal-down/20 text-terminal-down'
                  : 'bg-terminal-surface text-gray-500 hover:text-gray-300'"
              >
                SELL
              </button>
            </div>
          </FormField>

          <FormField label="Ticker Symbol" required>
            <TickerSearchInput
              v-model="formSymbol"
              placeholder="Căutare ticker (ex: TLV, MIC, AAP)..."
              :disabled="isSymbolLocked"
              @select="onTickerSelected"
            />
          </FormField>
        </div>

        <!-- Row 2: Broker + Currency + Target Shares -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FormField label="Executing Broker" required>
            <BrokerDropdown v-model="formBroker" :brokers="brokers || []" />
          </FormField>

          <FormField label="Currency">
            <select
              v-model="formCurrency"
              class="w-full bg-terminal-surface border border-terminal-border rounded-md px-3 py-1.5 text-sm text-gray-200"
            >
              <option value="RON">RON</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </FormField>

          <FormField label="Target Shares (Optional)" help="When reached, mark complete">
            <AppInput
              v-model="formTargetShares"
              type="number"
              placeholder="e.g. 500"
              monospace
            />
          </FormField>
        </div>
      </div>

      <!-- ═══════════════ TRANSACTION ROWS GRID ═══════════════ -->
      <template v-if="formSymbol.trim().length > 0">
        <div class="sm:hidden -mx-1 px-1 flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 scrollbar-none">
          <div
            v-for="(row, idx) in rows"
            :key="row.id"
            class="snap-center shrink-0 w-[85vw] max-w-[340px] min-h-[420px] border border-terminal-border rounded-lg bg-terminal-surface/60 p-3 flex flex-col gap-3"
            :class="{
              'bg-terminal-up/5 border-terminal-up/40': row.status === 'success',
              'bg-terminal-down/5 border-terminal-down/40': row.status === 'error'
            }"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <span v-if="row.status === 'loading'" class="inline-block animate-spin text-terminal-accent text-xs">⟳</span>
                <span v-else-if="row.status === 'success'" class="text-terminal-up text-sm">✓</span>
                <span v-else-if="row.status === 'error'" class="text-terminal-down text-sm">✕</span>
                <span v-else class="text-gray-500 text-[11px] font-bold uppercase tracking-wider">Row {{ idx + 1 }}</span>
              </div>
              <button
                type="button"
                @click="removeRow(idx)"
                :disabled="rows.length <= 1 || row.status === 'loading' || row.status === 'success'"
                class="text-gray-600 hover:text-terminal-down transition-colors text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                title="Remove row"
              >
                ✕
              </button>
            </div>

            <div>
              <label class="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">Shares</label>
              <input
                v-model="row.shares"
                type="text"
                inputmode="decimal"
                placeholder="100"
                :disabled="row.status === 'loading' || row.status === 'success'"
                class="w-full bg-terminal-bg border border-terminal-border rounded px-2.5 py-2 text-sm font-mono tabular-nums text-gray-200 placeholder-gray-600 focus:outline-none focus:border-terminal-accent transition-colors disabled:opacity-50"
              />
            </div>

            <div>
              <label class="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">Price / share</label>
              <div class="flex items-center gap-1.5">
                <MoneyInput
                  :model-value="row.price"
                  @update:model-value="onRowPriceInput(row, $event)"
                  class="flex-1 min-w-0"
                  placeholder="29.00"
                  :currency="formCurrency"
                  :disabled="row.priceAuto || row.status === 'loading' || row.status === 'success'"
                />
                <button
                  v-if="!row.priceConfirmed"
                  type="button"
                  @click="row.priceConfirmed = true"
                  :disabled="row.status === 'loading' || row.status === 'success'"
                  class="shrink-0 px-2 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider border transition-all duration-150 select-none whitespace-nowrap bg-terminal-accent/15 text-terminal-accent border-terminal-accent/40 hover:bg-terminal-accent/25"
                  title="Confirm suggested price"
                >
                  {{ t('transactionOverlay.priceConfirm') }}
                </button>
                <button
                  v-else
                  type="button"
                  @click="toggleAutoPrice(row)"
                  :disabled="row.status === 'loading' || row.status === 'success'"
                  class="shrink-0 px-2 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider border transition-all duration-150 select-none whitespace-nowrap"
                  :class="row.priceAuto
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/40 hover:bg-amber-500/25'
                    : 'bg-transparent text-gray-500 border-terminal-border hover:text-gray-300 hover:border-gray-500'"
                  :title="row.priceAuto ? 'Auto: backend fills market price' : 'Click to enable auto-price'"
                >
                  AUTO
                </button>
              </div>
            </div>

            <div>
              <label class="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">{{ t('transactionOverlay.commission') }}</label>
              <div class="flex items-center gap-1.5">
                <MoneyInput
                  v-model="row.commission"
                  class="flex-1 min-w-0"
                  placeholder="0.00"
                  :currency="formCurrency"
                  :disabled="row.status === 'loading' || row.status === 'success'"
                />
                <button
                  type="button"
                  @click="estimateRowCommission(row)"
                  :disabled="row.status === 'loading' || row.status === 'success' || !row.shares"
                  class="shrink-0 px-2 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider border transition-all duration-150 select-none whitespace-nowrap bg-transparent text-gray-500 border-terminal-border hover:text-gray-300 hover:border-gray-500 disabled:opacity-40"
                  :title="t('transactionOverlay.commissionAuto')"
                >
                  {{ t('transactionOverlay.commissionAuto') }}
                </button>
              </div>
            </div>

            <div>
              <label class="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">Date</label>
              <input
                v-model="row.executedAt"
                type="date"
                :disabled="row.status === 'loading' || row.status === 'success'"
                class="w-full bg-terminal-bg border border-terminal-border rounded px-2.5 py-2 text-sm font-mono text-gray-200 focus:outline-none focus:border-terminal-accent transition-colors disabled:opacity-50"
              />
            </div>

            <div class="mt-auto pt-2 border-t border-terminal-border/40 space-y-1">
              <div v-if="rowNotional(row)" class="text-[11px] font-mono text-gray-500">
                {{ rowNotional(row) }}
              </div>
              <div v-if="row.status === 'success' && row.priceSource" class="text-[10px] leading-tight">
                <span v-if="row.priceSource === 'AUTO'" class="text-amber-400/80">
                  AUTO · {{ row.priceDate }}
                </span>
                <span v-else-if="row.priceSource === 'MANUAL_FALLBACK'" class="text-amber-600">
                  used your price; ticker still syncing
                </span>
                <span v-else class="text-gray-500">MANUAL</span>
              </div>
              <p v-if="row.error" class="text-[10px] text-terminal-down">
                ⚠ {{ row.error }}
              </p>
            </div>
          </div>

          <button
            type="button"
            @click="addRow"
            :disabled="isSubmitting"
            class="snap-center shrink-0 w-[85vw] max-w-[340px] min-h-[420px] border-2 border-dashed border-terminal-border rounded-lg flex items-center justify-center text-gray-400 hover:text-terminal-accent hover:border-terminal-accent/50 transition-colors duration-150 disabled:opacity-40"
          >
            {{ t('transactionOverlay.addRow') }}
          </button>
        </div>

        <div class="hidden sm:block border border-terminal-border rounded-lg overflow-hidden bg-terminal-surface/60">
          <!-- Grid Header -->
          <div class="grid grid-cols-[24px_1fr_1fr_1fr_140px_28px] gap-2 px-3 py-2 bg-terminal-surface border-b border-terminal-border text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
            <span></span>
            <span>Shares</span>
            <span>Price / share</span>
            <span>{{ t('transactionOverlay.commission') }}</span>
            <span>Date</span>
            <span></span>
          </div>

          <!-- Rows -->
          <div
            v-for="(row, idx) in rows"
            :key="row.id"
            class="grid grid-cols-[24px_1fr_1fr_1fr_140px_28px] gap-2 px-3 py-2 items-center border-b border-terminal-border/40 last:border-0 transition-colors duration-100"
            :class="{
              'bg-terminal-up/5': row.status === 'success',
              'bg-terminal-down/5': row.status === 'error'
            }"
          >
            <!-- Status Indicator -->
            <div class="flex items-center justify-center w-5 h-5">
              <span v-if="row.status === 'loading'" class="inline-block animate-spin text-terminal-accent text-xs">⟳</span>
              <span v-else-if="row.status === 'success'" class="text-terminal-up text-sm">✓</span>
              <span v-else-if="row.status === 'error'" class="text-terminal-down text-sm">✕</span>
              <span v-else class="text-gray-600 text-[10px] font-bold">{{ idx + 1 }}</span>
            </div>

            <!-- Shares -->
            <div>
              <input
                v-model="row.shares"
                type="text"
                inputmode="decimal"
                placeholder="100"
                :disabled="row.status === 'loading' || row.status === 'success'"
                class="w-full bg-terminal-bg border border-terminal-border rounded px-2 py-1 text-xs font-mono tabular-nums text-gray-200 placeholder-gray-600 focus:outline-none focus:border-terminal-accent transition-colors disabled:opacity-50"
              />
            </div>

            <!-- Price + AUTO/CONFIRM chip -->
            <div class="space-y-1">
              <div class="flex items-center gap-1">
                <MoneyInput
                  :model-value="row.price"
                  @update:model-value="onRowPriceInput(row, $event)"
                  class="flex-1 min-w-0"
                  placeholder="29.00"
                  :currency="formCurrency"
                  :disabled="row.priceAuto || row.status === 'loading' || row.status === 'success'"
                />
                <button
                  v-if="!row.priceConfirmed"
                  type="button"
                  @click="row.priceConfirmed = true"
                  :disabled="row.status === 'loading' || row.status === 'success'"
                  class="shrink-0 px-1.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider border transition-all duration-150 select-none whitespace-nowrap bg-terminal-accent/15 text-terminal-accent border-terminal-accent/40 hover:bg-terminal-accent/25"
                  title="Confirm suggested price"
                >
                  {{ t('transactionOverlay.priceConfirm') }}
                </button>
                <button
                  v-else
                  type="button"
                  @click="toggleAutoPrice(row)"
                  :disabled="row.status === 'loading' || row.status === 'success'"
                  class="shrink-0 px-1.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider border transition-all duration-150 select-none whitespace-nowrap"
                  :class="row.priceAuto
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/40 hover:bg-amber-500/25'
                    : 'bg-transparent text-gray-500 border-terminal-border hover:text-gray-300 hover:border-gray-500'"
                  :title="row.priceAuto ? 'Auto: backend fills market price' : 'Click to enable auto-price'"
                >
                  AUTO
                </button>
              </div>
              <!-- Resolved price caption (shown after success) -->
              <div v-if="row.status === 'success' && row.priceSource" class="text-[9px] leading-tight">
                <span v-if="row.priceSource === 'AUTO'" class="text-amber-400/80">
                  AUTO · {{ row.priceDate }}
                </span>
                <span v-else-if="row.priceSource === 'MANUAL_FALLBACK'" class="text-amber-600">
                  used your price; ticker still syncing
                </span>
                <span v-else class="text-gray-500">MANUAL</span>
              </div>
            </div>

            <div>
              <div class="flex items-center gap-1">
                <MoneyInput
                  v-model="row.commission"
                  class="flex-1 min-w-0"
                  placeholder="0.00"
                  :currency="formCurrency"
                  :disabled="row.status === 'loading' || row.status === 'success'"
                />
                <button
                  type="button"
                  @click="estimateRowCommission(row)"
                  :disabled="row.status === 'loading' || row.status === 'success' || !row.shares"
                  class="shrink-0 px-1.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider border transition-all duration-150 select-none whitespace-nowrap bg-transparent text-gray-500 border-terminal-border hover:text-gray-300 hover:border-gray-500 disabled:opacity-40"
                  :title="t('transactionOverlay.commissionAuto')"
                >
                  {{ t('transactionOverlay.commissionAuto') }}
                </button>
              </div>
            </div>

            <!-- Date -->
            <div>
              <input
                v-model="row.executedAt"
                type="date"
                :disabled="row.status === 'loading' || row.status === 'success'"
                class="w-full bg-terminal-bg border border-terminal-border rounded px-2 py-1 text-xs font-mono text-gray-200 focus:outline-none focus:border-terminal-accent transition-colors disabled:opacity-50"
              />
            </div>

            <!-- Remove button -->
            <div class="flex items-center justify-center">
              <button
                type="button"
                @click="removeRow(idx)"
                :disabled="rows.length <= 1 || row.status === 'loading' || row.status === 'success'"
                class="text-gray-600 hover:text-terminal-down transition-colors text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                title="Remove row"
              >
                ✕
              </button>
            </div>

            <!-- Live notional per row -->
            <div v-if="rowNotional(row)" class="col-span-6 -mt-1 pl-6 flex items-center justify-between text-[10px] font-mono text-gray-500">
              <span>{{ rowNotional(row) }}</span>
            </div>

            <!-- Inline error (spans full row width below) -->
            <div v-if="row.error" class="col-span-6 -mt-1">
              <p class="text-[10px] text-terminal-down pl-6">
                ⚠ {{ row.error }}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          @click="addRow"
          :disabled="isSubmitting"
          class="hidden sm:block w-full py-1.5 text-xs text-gray-400 hover:text-terminal-accent border border-dashed border-terminal-border hover:border-terminal-accent/50 rounded-md transition-colors duration-150 disabled:opacity-40"
        >
          {{ t('transactionOverlay.addRow') }}
        </button>
      </template>
      <p v-else class="text-xs text-gray-500 border border-dashed border-terminal-border rounded-md px-3 py-4 text-center">
        {{ t('transactionOverlay.enterTickerHint') }}
      </p>

      <!-- ═══════════════ SUBMIT ═══════════════ -->
      <div class="pt-2">
        <AppButton
          type="button"
          variant="primary"
          block
          :loading="isSubmitting"
          :disabled="!canSubmit"
          @click="handleSubmit"
        >
          {{ isSubmitting ? 'Submitting…' : `Confirm & Save ${rows.length > 1 ? rows.length + ' Orders' : 'Order'}` }}
        </AppButton>
      </div>
    </div>
  </AdaptiveOverlay>
</template>
