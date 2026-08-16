<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { X } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import {
  useWatchlistQuery,
  useAddToWatchlistMutation,
  useRemoveFromWatchlistMutation
} from '../../queries/useWatchlistQuery';
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
  { key: 'actions', label: '', align: 'right' }
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
        <div class="flex items-center justify-end gap-2 flex-shrink-0">
          <button
            @click.stop="openAddTx(row.ticker.symbol)"
            class="px-3.5 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all duration-200 text-sm font-mono font-bold btn-press shadow-sm whitespace-nowrap"
            title="Add to Portfolio"
          >
            <span class="hidden sm:inline">+ Portfolio</span>
            <span class="inline sm:hidden">+</span>
          </button>
          <button
            @click="(e) => handleRemove(e, row.ticker.symbol)"
            class="px-3.5 py-2 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 border border-white/10 transition-all duration-200 text-sm font-mono font-bold whitespace-nowrap flex-shrink-0"
            title="Remove from Watchlist"
          >
            <span class="flex items-center gap-1.5"><X :size="16" /> <span class="hidden sm:inline">Remove</span></span>
          </button>
        </div>
      </template>
    </DataTable>

    <TransactionOverlay v-model="isAddTxOpen" :prefill-symbol="prefillSymbol" />
  </div>
</template>
