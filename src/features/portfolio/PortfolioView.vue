<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Trash2, RefreshCw, Plus } from 'lucide-vue-next';
import { usePortfolioQuery, useDeletePositionMutation, useRecalcPositionMutation, useRecalcAllMutation } from '../../queries/usePortfolioQuery';
import { usePortfolioStore } from '../../stores/portfolio';
import { useToast } from '../../shared/composables/useToast';
import DataTable, { type ColumnDef } from '../../shared/ui/molecules/DataTable.vue';
import AppInput from '../../shared/ui/atoms/AppInput.vue';
import MoneyText from '../../shared/ui/atoms/MoneyText.vue';
import TagBadge from '../../shared/ui/atoms/TagBadge.vue';
import TransactionOverlay from './components/TransactionOverlay.vue';
import type { HoldingDto } from '../../shared/api/types';

const router = useRouter();
const { t } = useI18n();
const toast = useToast();
const store = usePortfolioStore();
const { data: portfolio, isLoading: loadingPortfolio, refetch } = usePortfolioQuery();
const deleteMutation = useDeletePositionMutation();
const recalcMutation = useRecalcPositionMutation();
const recalcAllMutation = useRecalcAllMutation();

const hasSuspiciousPnl = computed(() => {
  const holdings = portfolio.value?.holdings ?? [];
  return holdings.some(h => {
    const shares = parseFloat(String(h.shares || 0));
    const avg = parseFloat(String(h.avgCost || 0));
    const mkt = parseFloat(String(h.marketValue || 0));
    if (shares <= 0 || mkt <= 0 || avg <= 0) return false;
    const cost = shares * avg;
    return cost > mkt * 5;
  });
});

const handleRecalcAll = async () => {
  try {
    const r = await recalcAllMutation.mutateAsync();
    toast.success(t('portfolio.recalcSuccessTitle'), t('portfolio.recalcSuccessMessage', { count: r.recomputed }));
  } catch (err: unknown) {
    toast.error(t('portfolio.recalcErrorTitle'), err instanceof Error ? err.message : 'Failed');
  }
};

const handleRecalcOne = async (e: Event, row: HoldingDto) => {
  e.stopPropagation();
  try {
    await recalcMutation.mutateAsync(row.ticker.symbol);
    toast.success(t('portfolio.recalcSuccessTitle'), t('portfolio.recalcOneSuccessMessage', { symbol: row.ticker.symbol }));
  } catch (err: unknown) {
    toast.error(t('portfolio.recalcErrorTitle'), err instanceof Error ? err.message : 'Failed');
  }
};

const isAddOpen = ref(false);
const groupBy = ref<'FLAT' | 'BY_ACCOUNT' | 'BY_MARKET'>('FLAT');

const GROUP_OPTIONS = [
  { k: 'FLAT', l: 'All' },
  { k: 'BY_ACCOUNT', l: 'Account' },
  { k: 'BY_MARKET', l: 'Market' },
] as const;

const columns: ColumnDef<HoldingDto>[] = [
  { key: 'symbol', label: 'Symbol', mobileCardTitle: true },
  { key: 'broker', label: 'Broker' },
  { key: 'shares', label: 'Shares', align: 'right' },
  { key: 'currentPrice', label: 'Price', align: 'right' },
  { key: 'changePct', label: 'Δ %', align: 'right' },
  { key: 'actions', label: '', align: 'right', hideOnMobile: true },
];

function currentPrice(row: HoldingDto): string {
  const shares = parseFloat(String(row.shares || 0));
  const mkt = parseFloat(String(row.marketValue || 0));
  if (shares <= 0 || !isFinite(mkt)) return '0.00';
  return (mkt / shares).toFixed(2);
}

function changePct(row: HoldingDto): { value: number; text: string } {
  const shares = parseFloat(String(row.shares || 0));
  const avg = parseFloat(String(row.avgCost || 0));
  const mkt = parseFloat(String(row.marketValue || 0));
  const cost = shares * avg;
  if (cost <= 0) return { value: 0, text: '0.00%' };
  const pct = ((mkt - cost) / cost) * 100;
  const sign = pct >= 0 ? '+' : '';
  return { value: pct, text: `${sign}${pct.toFixed(2)}%` };
}

const handleRowClick = (item: HoldingDto) => {
  router.push({ name: 'ticker-detail', params: { symbol: item.ticker.symbol } });
};

const handleDelete = async (e: Event, row: HoldingDto) => {
  e.stopPropagation();
  const symbol = row.ticker.symbol;
  if (!confirm(t('portfolio.deleteConfirm', { symbol }))) return;
  try {
    await deleteMutation.mutateAsync(symbol);
    toast.success(t('portfolio.deleteSuccessTitle'), t('portfolio.deleteSuccessMessage', { symbol }));
  } catch (err: unknown) {
    toast.error(t('portfolio.deleteErrorTitle'), err instanceof Error ? err.message : t('portfolio.deleteErrorMessage'));
  }
};

const isTargetReached = (row: HoldingDto): boolean => {
  if (row.targetReached) return true;
  if (!row.targetShares) return false;
  const current = parseFloat(String(row.shares || 0));
  const target = parseFloat(String(row.targetShares || 0));
  return target > 0 && current >= target;
};

const groupedHoldings = computed(() => {
  const list = store.filteredHoldings;
  if (groupBy.value === 'FLAT') {
    return [{ groupKey: 'All Holdings', holdings: list }];
  }
  const map = new Map<string, HoldingDto[]>();
  for (const item of list) {
    const key = groupBy.value === 'BY_ACCOUNT'
      ? (item.broker || item.accountName || 'TradeVille')
      : (item.market || item.ticker.exchange || 'MAIN');
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries()).map(([groupKey, holdings]) => ({ groupKey, holdings }));
});

const calculateGroupTotal = (holdings: HoldingDto[]): string => {
  const total = holdings.reduce((sum, h) => sum + (parseFloat(String(h.marketValue || 0)) || 0), 0);
  return total.toFixed(2);
};
</script>

<template>
  <div class="space-y-6 font-sans select-none pb-12">

    <!-- Page header: Apple minimalist -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
      <h1 class="text-2xl font-bold text-white tracking-tight">Portfolio</h1>

      <div class="flex flex-wrap items-center gap-2">
        <!-- Currency segment -->
        <div class="flex items-center gap-0.5 bg-white/[0.06] rounded-xl p-1 border border-white/10">
          <button
            v-for="cur in store.currenciesAvailable"
            :key="cur"
            @click="store.selectedCurrency = cur"
            class="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150"
            :class="store.selectedCurrency === cur
              ? 'bg-white/[0.18] text-white shadow-sm'
              : 'text-gray-400 hover:text-gray-200'"
          >
            {{ cur }}
          </button>
        </div>

        <!-- Divider -->
        <div class="h-5 w-px bg-white/15 hidden sm:block"></div>

        <!-- Recalculate -->
        <button
          type="button"
          @click="handleRecalcAll"
          :disabled="recalcAllMutation.isPending.value"
          class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium text-gray-300 border border-white/15 hover:text-white hover:border-white/30 transition-all duration-150 disabled:opacity-40"
          :title="t('portfolio.recalcAllTooltip')"
        >
          <RefreshCw :size="14" :class="recalcAllMutation.isPending.value ? 'animate-spin' : ''" />
          {{ t('portfolio.recalcAll') }}
        </button>

        <!-- Add Transaction -->
        <button
          type="button"
          @click="isAddOpen = true"
          class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold bg-terminal-accent text-terminal-bg hover:opacity-90 active:scale-95 transition-all duration-150"
        >
          <Plus :size="14" />
          Add Transaction
        </button>
      </div>
    </div>

    <!-- Suspicious PnL banner -->
    <div
      v-if="hasSuspiciousPnl"
      class="border border-amber-500/30 bg-amber-500/[0.08] text-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
    >
      <div class="text-xs sm:text-sm font-mono leading-relaxed">
        <span class="font-bold">⚠ {{ t('portfolio.suspiciousPnlTitle') }}</span>
        <div class="text-amber-100/70 mt-1 font-sans">{{ t('portfolio.suspiciousPnlBody') }}</div>
      </div>
      <button
        type="button"
        @click="handleRecalcAll"
        :disabled="recalcAllMutation.isPending.value"
        class="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-amber-100 bg-amber-500/20 hover:bg-amber-500/30 transition-colors border border-amber-500/20"
      >
        <RefreshCw :size="13" :class="recalcAllMutation.isPending.value ? 'animate-spin' : ''" />
        {{ t('portfolio.recalcAll') }}
      </button>
    </div>

    <!-- Filter + grouping toolbar -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      <div class="flex-1 min-w-0">
        <AppInput
          v-model="store.filterQuery"
          placeholder="Filter by symbol, name, or broker..."
          monospace
        />
      </div>
      <!-- Grouping segment -->
      <div class="flex items-center gap-0.5 bg-white/[0.06] rounded-xl p-1 border border-white/10 flex-shrink-0">
        <button
          v-for="opt in GROUP_OPTIONS"
          :key="opt.k"
          type="button"
          @click="groupBy = opt.k"
          class="px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
          :class="groupBy === opt.k
            ? 'bg-white/[0.18] text-white shadow-sm'
            : 'text-gray-400 hover:text-gray-200'"
        >
          {{ opt.l }}
        </button>
      </div>
    </div>

    <!-- Holdings -->
    <div class="space-y-8">
      <div
        v-for="group in groupedHoldings"
        :key="group.groupKey"
        class="space-y-3"
      >
        <!-- Group header -->
        <div
          v-if="groupBy !== 'FLAT'"
          class="flex items-center justify-between px-1"
        >
          <div class="flex items-center gap-2">
            <div class="w-[3px] h-4 rounded-full bg-terminal-accent flex-shrink-0"></div>
            <span class="text-sm font-semibold text-gray-200">{{ group.groupKey }}</span>
            <span class="text-xs text-gray-500 font-mono">· {{ group.holdings.length }}</span>
          </div>
          <span class="text-xs text-gray-400 font-mono tabular-nums">
            {{ calculateGroupTotal(group.holdings) }} {{ store.selectedCurrency }}
          </span>
        </div>

        <DataTable
          :columns="columns"
          :data="group.holdings"
          :loading="loadingPortfolio"
          empty-message="No holdings found matching filter."
          row-key="ticker.symbol"
          @row-click="handleRowClick"
        >
          <template #cell-symbol="{ row }">
            <div class="flex items-center gap-2">
              <span class="font-mono font-bold text-gray-100">{{ row.ticker.symbol }}</span>
              <TagBadge variant="default" size="sm">{{ row.ticker.exchange }}</TagBadge>
              <TagBadge
                v-if="isTargetReached(row)"
                variant="up"
                size="sm"
                class="bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
              >
                ✓ TARGET
              </TagBadge>
            </div>
          </template>

          <template #cell-broker="{ row }">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-terminal-bg border border-terminal-border text-gray-300">
              {{ row.broker || 'TradeVille' }}
            </span>
          </template>

          <template #cell-shares="{ value }">
            <span class="font-mono tabular-nums text-gray-100 font-bold sw-private">{{ Math.trunc(parseFloat(String(value)) || 0) }}</span>
          </template>

          <template #cell-currentPrice="{ row }">
            <span v-if="row.status === 'syncing'" class="text-gray-400 font-mono text-xs animate-pulse">--</span>
            <span v-else-if="row.status === 'no-data' || row.marketValue === null || row.marketValue === undefined || row.marketValue === ''" class="text-xs text-gray-400 italic">n/a</span>
            <span v-else class="font-mono font-bold text-gray-100">{{ currentPrice(row) }} <span class="text-[10px] text-gray-400 font-normal">{{ row.currency }}</span></span>
          </template>

          <template #cell-changePct="{ row }">
            <span v-if="row.status === 'syncing'" class="text-gray-400 font-mono text-xs animate-pulse">--</span>
            <span v-else-if="row.status === 'no-data' || row.marketValue === null || row.marketValue === undefined || row.marketValue === ''" class="text-gray-400 font-mono text-xs">–</span>
            <span
              v-else
              class="font-mono font-bold tabular-nums"
              :class="changePct(row).value >= 0 ? 'text-terminal-up' : 'text-terminal-down'"
            >
              {{ changePct(row).text }}
            </span>
          </template>

          <!-- Desktop row actions (hover) -->
          <template #cell-actions="{ row }">
            <div class="flex items-center justify-end gap-1.5">
              <button
                type="button"
                @click="(e) => handleRecalcOne(e, row)"
                class="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-gray-400 hover:text-terminal-accent hover:bg-terminal-accent/10 transition-all duration-150"
                :title="t('portfolio.recalcTooltip')"
              >
                <RefreshCw :size="15" />
              </button>
              <button
                type="button"
                @click="(e) => handleDelete(e, row)"
                class="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-150"
                :title="t('portfolio.deleteTooltip')"
              >
                <Trash2 :size="15" />
              </button>
            </div>
          </template>

          <!-- Mobile badge (right side of card header) -->
          <template #mobile-badge="{ row }">
            <TagBadge v-if="isTargetReached(row)" variant="up" size="sm">✓</TagBadge>
            <span
              v-else
              class="font-mono font-bold tabular-nums text-xs"
              :class="changePct(row).value >= 0 ? 'text-terminal-up' : 'text-terminal-down'"
            >
              {{ changePct(row).text }}
            </span>
          </template>

          <!-- Mobile footer: labeled action buttons -->
          <template #mobile-footer="{ row }">
            <div class="flex gap-2">
              <button
                type="button"
                @click.stop="handleRecalcOne($event, row)"
                class="flex items-center justify-center gap-1.5 flex-1 py-2 rounded-xl text-xs font-medium text-gray-400 border border-white/10 hover:text-terminal-accent hover:border-terminal-accent/30 active:scale-95 transition-all duration-150"
              >
                <RefreshCw :size="13" />
                <span>Sync</span>
              </button>
              <button
                type="button"
                @click.stop="handleDelete($event, row)"
                class="flex items-center justify-center gap-1.5 flex-1 py-2 rounded-xl text-xs font-medium text-rose-400 border border-rose-500/25 hover:bg-rose-500/10 active:scale-95 transition-all duration-150"
              >
                <Trash2 :size="13" />
                <span>Remove</span>
              </button>
            </div>
          </template>
        </DataTable>
      </div>
    </div>

    <TransactionOverlay
      v-model="isAddOpen"
      @submitted="refetch"
    />
  </div>
</template>
