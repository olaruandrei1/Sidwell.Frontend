<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Trash2, RefreshCw, Plus } from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import {
  useWatchlistQuery,
  useAddToWatchlistMutation,
  useRemoveFromWatchlistMutation
} from '../../queries/useWatchlistQuery';
import { api } from '../../shared/api/client';
import { useToast } from '../../shared/composables/useToast';
import PageHeader from '../../shared/ui/templates/PageHeader.vue';
import DataTable, { type ColumnDef } from '../../shared/ui/molecules/DataTable.vue';
import AppButton from '../../shared/ui/atoms/AppButton.vue';
import AppInput from '../../shared/ui/atoms/AppInput.vue';
import MoneyText from '../../shared/ui/atoms/MoneyText.vue';
import TagBadge from '../../shared/ui/atoms/TagBadge.vue';
import TickerSearchInput from '../../shared/ui/molecules/TickerSearchInput.vue';
import TransactionOverlay from '../portfolio/components/TransactionOverlay.vue';
import type { WatchlistRow } from '../../shared/api/types';

const { t } = useI18n();
const router = useRouter();
const toast = useToast();
const { data: watchlist, isLoading } = useWatchlistQuery();
const addMutation = useAddToWatchlistMutation();
const removeMutation = useRemoveFromWatchlistMutation();

const newSymbol = ref('');
const isAddTxOpen = ref(false);
const prefillSymbol = ref('');

function openAddTx(sym: string) {
  prefillSymbol.value = sym;
  isAddTxOpen.value = true;
}

const columns = computed<ColumnDef<WatchlistRow>[]>(() => [
  { key: 'ticker', label: t('watchlist.symbol'), mobileCardTitle: true },
  { key: 'price', label: t('watchlist.price'), align: 'right' },
  { key: 'dayChangePct', label: t('watchlist.dayChange'), align: 'right' },
  { key: 'composite', label: t('watchlist.composite'), align: 'center' },
  { key: 'status', label: t('watchlist.status'), align: 'center' },
  { key: 'actions', label: '', align: 'right', hideOnMobile: true }
]);

const handleRowClick = (item: WatchlistRow) => {
  router.push({ name: 'ticker-detail', params: { symbol: item.ticker.symbol } });
};

const handleAdd = async () => {
  if (!newSymbol.value.trim()) return;
  const sym = newSymbol.value.trim().toUpperCase();
  try {
    await addMutation.mutateAsync(sym);
    toast.success('Added to Watchlist', `Watching ${sym}`);
    newSymbol.value = '';
  } catch (e: unknown) {
    toast.error('Add Failed', e instanceof Error ? e.message : 'Error adding symbol');
  }
};

const handleRemove = async (e: Event, symbol: string) => {
  e.stopPropagation();
  try {
    await removeMutation.mutateAsync(symbol);
    toast.info('Removed', `Stopped watching ${symbol}`);
  } catch (e: unknown) {
    toast.error('Remove Failed', e instanceof Error ? e.message : 'Error removing symbol');
  }
};

const syncingSymbol = ref<string | null>(null);
async function handleSync(e: Event, symbol: string) {
  e.stopPropagation();
  syncingSymbol.value = symbol;
  try {
    await api.post(`/tickers/${encodeURIComponent(symbol)}/sync`, {});
    toast.success('Sync queued', `${symbol}`);
  } catch (err: unknown) {
    toast.error('Sync failed', err instanceof Error ? err.message : 'Error');
  } finally {
    syncingSymbol.value = null;
  }
}
</script>

<template>
  <div class="space-y-6 sm:space-y-8 select-none font-sans">
    <PageHeader
      :title="t('watchlist.title')"
      :subtitle="t('watchlist.subtitle')"
    >
      <template #actions>
        <div class="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full sm:w-auto">
          <div class="min-w-[200px] w-full sm:w-64">
            <TickerSearchInput
              v-model="newSymbol"
              placeholder="Adaugă ticker / companie..."
            />
          </div>
          <AppButton variant="primary" size="md" @click="handleAdd" :loading="addMutation.isPending.value" class="shadow-glow-accent/30 font-black w-full sm:w-auto">
            {{ t('watchlist.addBtn') }}
          </AppButton>
        </div>
      </template>
    </PageHeader>

    <DataTable
      :columns="columns"
      :data="watchlist || []"
      :loading="isLoading"
      empty-message="Watchlist is empty. Add a ticker symbol above to start monitoring."
      row-key="ticker.symbol"
      @row-click="handleRowClick"
    >
      <template #cell-ticker="{ row }">
        <div class="flex items-center space-x-2 min-w-0">
          <span class="font-mono font-bold text-base text-gray-100 truncate">{{ row.ticker.symbol }}</span>
          <TagBadge variant="default" size="sm" class="flex-shrink-0">{{ row.ticker.exchange }}</TagBadge>
        </div>
      </template>

      <template #cell-price="{ row }">
        <div v-if="row.status === 'syncing'" class="flex items-center justify-end space-x-1.5 text-terminal-accent">
          <span class="inline-block w-3 h-3 border-2 border-terminal-accent border-t-transparent rounded-full animate-spin" />
          <span class="text-xs font-mono font-bold">Syncing...</span>
        </div>
        <span v-else-if="row.status === 'no-data' || row.price === null || row.price === undefined || row.price === ''" class="text-xs text-gray-400 italic font-sans">
          No market data yet
        </span>
        <MoneyText v-else :value="row.price" :currency="row.ticker.currency" :places="2" :color="false" />
      </template>

      <template #cell-dayChangePct="{ row }">
        <span v-if="row.status === 'syncing'" class="text-gray-500 font-mono text-xs animate-pulse">--</span>
        <span v-else-if="row.status === 'no-data' || row.dayChangePct === null || row.dayChangePct === undefined || row.dayChangePct === ''" class="text-gray-500 font-mono text-xs">–</span>
        <MoneyText v-else :value="row.dayChangePct" mode="percent" :places="2" :show-sign="true" :color="true" />
      </template>

      <template #cell-composite="{ row }">
        <span v-if="row.status === 'syncing'" class="text-gray-500 font-mono text-xs animate-pulse">--</span>
        <span
          v-else-if="row.composite"
          class="font-mono font-bold text-sm"
          :style="{ color: row.composite.color }"
        >
          {{ row.composite.score }}
        </span>
        <span v-else class="text-gray-500 font-mono text-xs">–</span>
      </template>

      <template #cell-status="{ row }">
        <TagBadge
          v-if="row.status === 'syncing'"
          variant="accent"
          size="sm"
          pulse
        >
          SYNCING...
        </TagBadge>
        <TagBadge
          v-else-if="row.status === 'no-data' || row.price === null || row.price === undefined || row.price === ''"
          variant="default"
          size="sm"
        >
          NO DATA
        </TagBadge>
        <TagBadge
          v-else
          variant="up"
          size="sm"
        >
          READY
        </TagBadge>
      </template>

      <template #mobile-badge="{ row }">
        <TagBadge
          v-if="row.status === 'syncing'"
          variant="accent"
          size="sm"
          pulse
        >
          SYNCING...
        </TagBadge>
        <TagBadge
          v-else-if="row.status === 'no-data' || row.price === null || row.price === undefined || row.price === ''"
          variant="default"
          size="sm"
        >
          NO DATA
        </TagBadge>
        <TagBadge
          v-else
          variant="up"
          size="sm"
        >
          READY
        </TagBadge>
      </template>

      <template #cell-actions="{ row }">
        <div class="flex items-center justify-end gap-1.5">
          <button
            @click.stop="openAddTx(row.ticker.symbol)"
            class="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-all duration-150"
            title="Add to Portfolio"
          >
            <Plus :size="15" />
          </button>
          <button
            @click="(e) => handleSync(e, row.ticker.symbol)"
            :disabled="syncingSymbol === row.ticker.symbol"
            class="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-gray-400 hover:text-terminal-accent hover:bg-terminal-accent/10 transition-all duration-150"
            title="Sync"
          >
            <RefreshCw :size="15" :class="syncingSymbol === row.ticker.symbol ? 'animate-spin' : ''" />
          </button>
          <button
            @click="(e) => handleRemove(e, row.ticker.symbol)"
            class="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-150"
            title="Remove from Watchlist"
          >
            <Trash2 :size="15" />
          </button>
        </div>
      </template>

      <template #mobile-footer="{ row }">
        <div class="grid grid-cols-3 gap-2">
          <button
            type="button"
            @click.stop="openAddTx(row.ticker.symbol)"
            class="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 active:scale-95 transition-all"
          >
            <Plus :size="13" /><span>Portfolio</span>
          </button>
          <button
            type="button"
            @click.stop="handleSync($event, row.ticker.symbol)"
            :disabled="syncingSymbol === row.ticker.symbol"
            class="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium text-gray-400 border border-white/10 hover:text-terminal-accent hover:border-terminal-accent/30 active:scale-95 transition-all"
          >
            <RefreshCw :size="13" :class="syncingSymbol === row.ticker.symbol ? 'animate-spin' : ''" /><span>Sync</span>
          </button>
          <button
            type="button"
            @click.stop="handleRemove($event, row.ticker.symbol)"
            class="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium text-rose-400 border border-rose-500/25 hover:bg-rose-500/10 active:scale-95 transition-all"
          >
            <Trash2 :size="13" /><span>Remove</span>
          </button>
        </div>
      </template>
    </DataTable>

    <TransactionOverlay v-model="isAddTxOpen" :prefill-symbol="prefillSymbol" />
  </div>
</template>
