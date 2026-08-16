<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useScreenerQuery, useScreenerPresetsQuery } from '../../queries/useScreenerQuery';
import PageHeader from '../../shared/ui/templates/PageHeader.vue';
import DataTable, { type ColumnDef } from '../../shared/ui/molecules/DataTable.vue';
import FormField from '../../shared/ui/molecules/FormField.vue';
import AppInput from '../../shared/ui/atoms/AppInput.vue';
import AppButton from '../../shared/ui/atoms/AppButton.vue';
import TagBadge from '../../shared/ui/atoms/TagBadge.vue';
import type { ScreenerResultRow, ScreenerPreset } from '../../shared/api/types';

const { t } = useI18n();
const router = useRouter();

const criteria = ref<Record<string, any>>({
  minYield: '4.00',
  maxPe: '15.00',
  minPiotroski: 7,
  exchange: 'BVB'
});

const { data: presets } = useScreenerPresetsQuery();
const { data: results, isLoading } = useScreenerQuery(criteria);

const columns = computed<ColumnDef<ScreenerResultRow>[]>(() => [
  { key: 'ticker', label: t('screener.tickerSymbol'), mobileCardTitle: true },
  { key: 'dividendYield', label: t('screener.divYield'), align: 'right' },
  { key: 'peTrailing', label: t('screener.peTrailing'), align: 'right' },
  { key: 'piotroski', label: t('screener.piotroskiScore'), align: 'center' },
  { key: 'exchange', label: t('screener.exchangeCol'), align: 'center' }
]);

const applyPreset = (preset: ScreenerPreset) => {
  criteria.value = { ...preset.criteria };
};

const handleRowClick = (row: ScreenerResultRow) => {
  router.push({ name: 'ticker-detail', params: { symbol: row.ticker.symbol } });
};
</script>

<template>
  <div class="space-y-6 sm:space-y-8 select-none font-sans">
    <PageHeader
      :title="t('screener.title')"
      :subtitle="t('screener.subtitle')"
    />

    <!-- Preset Pills (Large font-bold controls) -->
    <div class="flex items-center gap-3 flex-wrap">
      <span class="text-sm text-gray-300 font-mono font-black uppercase tracking-wider mr-1">{{ t('screener.presets') }}:</span>
      <button
        v-for="p in presets || []"
        :key="p.id"
        @click="applyPreset(p)"
        class="px-4 py-2 rounded-2xl border border-white/15 bg-white/5 hover:border-terminal-accent hover:bg-terminal-accent/15 hover:text-terminal-accent text-sm font-mono font-bold text-gray-100 transition-all duration-200 btn-press shadow-sm"
      >
        ★ {{ p.name }}
      </button>
      <button
        @click="criteria = { minYield: '', maxPe: '', minPiotroski: '', exchange: '' }"
        class="px-4 py-2 rounded-2xl text-sm text-gray-300 hover:text-rose-400 hover:bg-rose-500/15 font-mono font-bold transition-all duration-200"
      >
        {{ t('screener.clearAll') }}
      </button>
    </div>

    <!-- Filter Criteria Bar (Fluid Flexbox Layout) -->
    <div class="flex flex-wrap gap-6 sw-glass-card border border-white/15 p-6 rounded-3xl font-mono shadow-xl backdrop-blur-2xl w-full">
      <FormField :label="t('screener.minYield')" class="flex-1 min-w-[220px] max-w-full">
        <AppInput v-model="criteria.minYield" placeholder="4.00" monospace />
      </FormField>

      <FormField :label="t('screener.maxPe')" class="flex-1 min-w-[220px] max-w-full">
        <AppInput v-model="criteria.maxPe" placeholder="15.00" monospace />
      </FormField>

      <FormField :label="t('screener.minPiotroski')" class="flex-1 min-w-[220px] max-w-full">
        <AppInput v-model="criteria.minPiotroski" type="number" placeholder="7" monospace />
      </FormField>

      <FormField :label="t('screener.exchange')" class="flex-1 min-w-[220px] max-w-full">
        <select
          v-model="criteria.exchange"
          class="w-full bg-terminal-bg/80 border border-white/15 rounded-2xl px-4 py-3 text-base font-bold text-white focus:border-terminal-accent focus:outline-none transition-colors"
        >
          <option value="">{{ t('screener.allExchanges') }}</option>
          <option value="BVB">BVB (Bucharest)</option>
          <option value="NASDAQ">NASDAQ</option>
          <option value="NYSE">NYSE</option>
        </select>
      </FormField>
    </div>

    <!-- Screener Results Grid -->
    <DataTable
      :columns="columns"
      :data="results || []"
      :loading="isLoading"
      :empty-message="t('screener.emptyMessage')"
      row-key="ticker.symbol"
      @row-click="handleRowClick"
    >
      <template #cell-ticker="{ row }">
        <div class="flex flex-col">
          <span class="font-mono font-bold text-base text-gray-100">{{ row.ticker.symbol }}</span>
          <span class="text-xs text-gray-400 font-sans">{{ row.ticker.name }}</span>
        </div>
      </template>

      <template #cell-dividendYield="{ row }">
        <span class="font-mono tabular-nums text-emerald-400 font-bold text-sm">
          {{ row.metrics.dividendYield ? `${row.metrics.dividendYield}%` : '-' }}
        </span>
      </template>
      <template #cell-peTrailing="{ row }">
        <span class="font-mono tabular-nums text-gray-200 font-semibold text-sm">
          {{ row.metrics.peTrailing || '-' }}
        </span>
      </template>

      <template #cell-piotroski="{ row }">
        <span
          class="font-mono font-bold px-2.5 py-1 rounded-lg text-xs"
          :class="Number(row.metrics.piotroski) >= 7 ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-white/5 text-gray-300 border border-white/10'"
        >
          {{ row.metrics.piotroski || '-' }} / 9
        </span>
      </template>

      <template #cell-exchange="{ row }">
        <TagBadge variant="default" size="sm">{{ row.ticker.exchange }}</TagBadge>
      </template>
    </DataTable>
  </div>
</template>
