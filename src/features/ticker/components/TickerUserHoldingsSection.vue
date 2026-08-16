<script setup lang="ts">
import { ref, computed } from 'vue';
import MoneyText from '../../../shared/ui/atoms/MoneyText.vue';
import TagBadge from '../../../shared/ui/atoms/TagBadge.vue';
import { formatDateTime } from '../../../shared/utils/format';
import { useMyProjectionQuery } from '../../../queries/useTickersQuery';
import { useDeleteTransactionMutation } from '../../../queries/usePortfolioQuery';
import { useToast } from '../../../shared/composables/useToast';
import type { HoldingDto, TransactionDto } from '../../../shared/api/types';

const props = withDefaults(
  defineProps<{
    symbol: string;
    holding?: HoldingDto | null | undefined;
    transactions?: TransactionDto[] | null | undefined;
    currency?: string | undefined;
    growthCagr?: number;
  }>(),
  { growthCagr: 8 }
);

const hasPosition = computed(() =>
  !!props.holding && parseFloat(String(props.holding.shares)) > 0
);

const { data: rawProjection, isLoading: projLoading } = useMyProjectionQuery(
  computed(() => props.symbol)
);

const modelLabel = computed(() => `${props.growthCagr}% p.a.`);

// Re-project the server rows at the shared growth rate so this panel and the
// Target Share Projection are driven by the same model selected above them.
const myProjection = computed(() => {
  const base = rawProjection.value;
  if (!base) return null;
  const start = parseFloat(String(base.currentValue));
  if (!Number.isFinite(start)) return base;
  const rate = props.growthCagr / 100;
  return {
    ...base,
    rows: base.rows.map((r, i) => ({
      ...r,
      value: (start * Math.pow(1 + rate, i + 1)).toFixed(2),
    })),
  };
});

// ── Delete transaction ────────────────────────────────────────────────────────
const toast = useToast();
const deleteMutation = useDeleteTransactionMutation();

/** ID of the row currently showing the inline confirm prompt. */
const pendingDeleteId = ref<string | null>(null);
/** IDs of rows actively being deleted (awaiting the API response). */
const deletingIds = ref<Set<string>>(new Set());

const requestDelete = (id: string) => {
  pendingDeleteId.value = id;
};

const cancelDelete = () => {
  pendingDeleteId.value = null;
};

const confirmDelete = async (tx: TransactionDto) => {
  pendingDeleteId.value = null;
  deletingIds.value.add(tx.id);

  try {
    await deleteMutation.mutateAsync(tx.id);
    toast.success('Transaction Deleted', `${tx.side} of ${tx.shares} shares removed.`);
  } catch {
    toast.error('Delete Failed', 'Could not delete transaction. Please try again.');
  } finally {
    deletingIds.value.delete(tx.id);
  }
};
</script>

<template>
  <div v-if="holding || (transactions && transactions.length > 0)" class="space-y-4 font-mono">
    <!-- Title on the background -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
      <div class="flex items-center gap-2.5">
        <h3 class="text-sm font-bold text-gray-100 uppercase tracking-wider">
          My Holding &amp; Position Evolution
        </h3>
        <TagBadge variant="accent" size="sm">AUTHENTICATED</TagBadge>
      </div>

      <div v-if="holding" class="flex items-center gap-4 text-xs">
        <div>
          <span class="text-gray-400">Current Shares:</span>
          <span class="font-bold text-gray-100 ml-1 sw-private">{{ Math.trunc(parseFloat(String(holding.shares))) }}</span>
        </div>
        <div>
          <span class="text-gray-400">Avg Cost:</span>
          <MoneyText :value="holding.avgCost" :currency="currency" :places="2" :color="false" class="ml-1 font-bold text-gray-100" />
        </div>
      </div>
    </div>

    <!-- Executed Transactions — card carousel directly on the background -->
    <div v-if="transactions && transactions.length > 0" class="space-y-2.5">
      <div class="text-xs font-bold text-terminal-accent uppercase tracking-wider px-1">
        Executed Transactions History
      </div>
      <div class="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 scrollbar-none -mx-1 px-1">
        <div
          v-for="tx in transactions"
          :key="tx.id"
          class="snap-start shrink-0 w-[72vw] sm:w-[260px] bg-terminal-surface border border-white/10 rounded-2xl p-4 space-y-3 shadow-lg"
          :class="{ 'opacity-40': deletingIds.has(tx.id) }"
        >
          <div class="flex items-center justify-between">
            <span
              class="px-2.5 py-0.5 rounded-lg text-[11px] font-bold uppercase tracking-wide border"
              :class="tx.side === 'BUY' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/15 text-rose-300 border-rose-500/30'"
            >{{ tx.side }}</span>
            <span class="text-[11px] text-gray-400">{{ formatDateTime(tx.executedAt) }}</span>
          </div>
          <div class="grid grid-cols-3 gap-2 text-center">
            <div>
              <div class="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Shares</div>
              <div class="text-sm font-bold text-gray-100 sw-private">{{ Math.trunc(parseFloat(String(tx.shares))) }}</div>
            </div>
            <div>
              <div class="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Price</div>
              <div class="text-sm font-bold text-gray-200"><MoneyText :value="tx.price" :currency="currency" :places="2" :color="false" /></div>
            </div>
            <div>
              <div class="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Fee</div>
              <div class="text-sm font-bold text-gray-400">
                <MoneyText v-if="tx.fee" :value="tx.fee" :currency="currency" :places="2" :color="false" />
                <span v-else>--</span>
              </div>
            </div>
          </div>
          <div class="pt-2 border-t border-white/10 flex items-center justify-end">
            <span v-if="deletingIds.has(tx.id)" class="inline-block animate-spin text-terminal-down text-xs">⟳</span>
            <div v-else-if="pendingDeleteId === tx.id" class="flex items-center gap-1.5">
              <button
                type="button"
                class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-terminal-down/20 text-terminal-down border border-terminal-down/40 hover:bg-terminal-down/35 transition-colors"
                @click="confirmDelete(tx)"
              >Delete</button>
              <button
                type="button"
                class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 transition-colors"
                @click="cancelDelete"
              >Cancel</button>
            </div>
            <button
              v-else
              type="button"
              class="text-gray-500 hover:text-terminal-down transition-colors text-xs px-2 py-1 rounded-lg hover:bg-terminal-down/10"
              title="Delete transaction"
              @click="requestDelete(tx.id)"
            >🗑 Remove</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Personal Holding projection — card carousel directly on the background -->
    <div v-if="hasPosition" class="space-y-2.5">
      <div class="text-xs font-bold text-terminal-accent uppercase tracking-wider px-1">
        Holding Projection · {{ modelLabel }} ({{ holding ? parseFloat(String(holding.shares)) : 0 }} sh)
      </div>

      <div v-if="projLoading" class="py-4 text-center text-xs text-gray-400 animate-pulse">
        Loading projection...
      </div>

      <div v-else-if="myProjection" class="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 scrollbar-none -mx-1 px-1">
        <div
          v-for="r in myProjection.rows"
          :key="r.year"
          class="snap-start shrink-0 w-[52vw] sm:w-[200px] bg-terminal-surface border border-white/10 rounded-2xl p-4 space-y-2.5 shadow-lg"
        >
          <div class="text-sm font-black text-gray-100 border-b border-white/10 pb-2">Year {{ r.year }}</div>
          <div class="space-y-1">
            <div class="text-[10px] text-gray-500 uppercase tracking-wider">Projected Value</div>
            <div class="text-sm font-bold text-purple-300"><MoneyText :value="r.value" :currency="currency" :places="2" :color="false" /></div>
          </div>
          <div v-if="parseFloat(String(r.dividendsReceived ?? '0')) > 0" class="space-y-1">
            <div class="text-[10px] text-gray-500 uppercase tracking-wider">Cum. Dividends</div>
            <div class="text-sm font-bold text-emerald-400">+<MoneyText :value="r.dividendsReceived" :currency="currency" :places="2" /></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
