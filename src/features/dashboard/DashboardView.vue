<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { usePortfolioQuery } from '../../queries/usePortfolioQuery';
import { useSettingsStore } from '../../stores/settings';
import PageHeader from '../../shared/ui/templates/PageHeader.vue';
import StatTile from '../../shared/ui/atoms/StatTile.vue';
import MoneyText from '../../shared/ui/atoms/MoneyText.vue';
import TagBadge from '../../shared/ui/atoms/TagBadge.vue';
import NewsFeed from '../../shared/ui/organisms/NewsFeed.vue';
import type { Philosophy } from '../../shared/api/types';

const { t } = useI18n();
const router = useRouter();
const settingsStore = useSettingsStore();
const { data: portfolio, isLoading } = usePortfolioQuery();

const topHoldings = computed(() => {
  if (!portfolio.value) return [];
  return portfolio.value.holdings.slice(0, 4);
});

const philosophyOptions: Philosophy[] = ['BALANCED', 'GROWTH', 'DIVIDEND'];

const totalCurrencyValue = computed(() => {
  if (!portfolio.value?.byCurrency) return 0;
  return portfolio.value.byCurrency.reduce((acc, c) => acc + (Number(c.value) || 0), 0);
});

function getCurrencyPercent(val: string | number | undefined | null) {
  if (!val || !totalCurrencyValue.value || totalCurrencyValue.value === 0) return 0;
  return Math.round((Number(val) / totalCurrencyValue.value) * 100);
}
</script>

<template>
  <div class="space-y-6 select-none pb-12">
    <!-- PAGE HEADER -->
    <PageHeader
      :title="t('dashboard.title')"
      :subtitle="t('dashboard.subtitle')"
      :badge="settingsStore.philosophy"
    >
      <template #actions>
        <div class="flex items-center gap-1.5 bg-terminal-surface border border-terminal-border p-1 rounded-xl">
          <button
            v-for="opt in philosophyOptions"
            :key="opt"
            @click="settingsStore.updatePhilosophy(opt)"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors"
            :class="settingsStore.philosophy === opt
              ? 'bg-terminal-accent/15 text-terminal-accent font-bold border border-terminal-accent/30'
              : 'text-gray-400 hover:text-gray-200'"
          >
            {{ t('enums.' + opt, opt) }}
          </button>
        </div>
      </template>
    </PageHeader>

    <!-- HERO NET WORTH BANNER -->
    <div class="bg-terminal-surface border border-terminal-border rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
      <div>
        <span class="text-xs font-semibold text-terminal-accent uppercase tracking-wider block mb-1">
          Portfolio Net Valuation
        </span>
        <div class="text-3xl sm:text-4xl font-bold tracking-tight text-white font-mono">
          <MoneyText
            :value="portfolio?.totalValue"
            :currency="portfolio?.referenceCurrency || 'RON'"
            :color="false"
          />
        </div>
        <p class="text-xs text-gray-400 mt-1">
          Base Valuation Currency: <span class="font-semibold text-gray-200">{{ portfolio?.referenceCurrency || 'RON' }}</span>
        </p>
      </div>

      <div class="flex items-center gap-4">
        <router-link
          to="/portfolio"
          class="px-4 py-2.5 rounded-xl bg-terminal-accent/15 border border-terminal-accent/30 text-terminal-accent hover:bg-terminal-accent hover:text-terminal-bg font-semibold text-xs uppercase tracking-wider transition-all"
        >
          {{ t('dashboard.viewPortfolio') }} →
        </router-link>
      </div>
    </div>

    <!-- 4 KPI SUMMARY GRID -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatTile :label="t('dashboard.dayPnl')">
        <MoneyText
          :value="portfolio?.dayPnl"
          :currency="portfolio?.referenceCurrency || 'RON'"
          :show-sign="true"
          :color="true"
        />
      </StatTile>

      <StatTile :label="t('dashboard.unrealizedPnl')">
        <MoneyText
          :value="portfolio?.unrealizedPnl"
          :currency="portfolio?.referenceCurrency || 'RON'"
          :show-sign="true"
          :color="true"
        />
      </StatTile>

      <StatTile :label="t('dashboard.realizedPnl')" :subtitle="t('dashboard.closedPerformance')">
        <MoneyText
          :value="portfolio?.realizedPnl"
          :currency="portfolio?.referenceCurrency || 'RON'"
          :show-sign="true"
          :color="true"
        />
      </StatTile>

      <StatTile :label="t('dashboard.refCurrency')">
        <span class="text-xl font-bold text-terminal-accent">
          {{ portfolio?.referenceCurrency || 'RON' }}
        </span>
      </StatTile>
    </div>

    <!-- HOLDINGS & CURRENCY BREAKDOWN -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <!-- Left 2 cols: Top Holdings -->
      <div class="lg:col-span-2 space-y-4">
        <div class="flex items-center justify-between border-b border-terminal-border pb-3">
          <h3 class="text-base font-bold text-gray-100 uppercase tracking-wider">
            {{ t('dashboard.topPositions') }}
          </h3>
        </div>

        <div v-if="isLoading" class="p-8 text-center text-xs font-mono text-gray-400 border border-terminal-border rounded-xl bg-terminal-surface">
          Loading positions...
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            v-for="h in topHoldings"
            :key="h.ticker.symbol"
            @click="router.push({ name: 'ticker-detail', params: { symbol: h.ticker.symbol } })"
            class="bg-terminal-surface border border-terminal-border rounded-xl p-4 hover:border-terminal-accent/40 cursor-pointer transition-all space-y-3 shadow-sm"
          >
            <div class="flex items-start justify-between">
              <div>
                <span class="font-bold text-lg text-white tracking-tight block">{{ h.ticker.symbol }}</span>
                <span class="block text-xs text-gray-400 truncate max-w-[160px]">{{ h.ticker.name }}</span>
              </div>
              <TagBadge variant="default" size="sm">{{ h.ticker.exchange }}</TagBadge>
            </div>

            <div class="pt-3 border-t border-terminal-border/60 flex items-center justify-between text-xs">
              <div>
                <span class="text-gray-400 block text-[10px] uppercase font-semibold">Shares</span>
                <span class="text-gray-100 font-mono font-bold">{{ Math.trunc(parseFloat(String(h.shares)) || 0) }}</span>
              </div>
              <div class="text-right">
                <span class="text-gray-400 block text-[10px] uppercase font-semibold">Market Value</span>
                <span class="text-terminal-accent font-mono font-bold">
                  <MoneyText :value="h.marketValue" :currency="h.currency" :places="2" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right 1 col: Currency Breakdown -->
      <div class="space-y-4">
        <div class="border-b border-terminal-border pb-3">
          <h3 class="text-base font-bold text-gray-100 uppercase tracking-wider">
            {{ t('dashboard.currencyAllocation') }}
          </h3>
        </div>

        <div class="bg-terminal-surface border border-terminal-border rounded-xl p-4 space-y-3 shadow-sm">
          <div
            v-for="c in portfolio?.byCurrency || []"
            :key="c.currency"
            class="space-y-1.5 py-2 border-b border-terminal-border/40 last:border-b-0"
          >
            <div class="flex items-center justify-between text-xs font-semibold">
              <span class="text-gray-200 font-mono">{{ c.currency }}</span>
              <span class="text-gray-100 font-mono">
                <MoneyText :value="c.value" :currency="c.currency" :places="2" :color="false" />
              </span>
            </div>
            <div class="w-full h-1.5 bg-terminal-surface-light rounded-full overflow-hidden">
              <div
                class="h-full bg-terminal-accent rounded-full transition-all"
                :style="{ width: getCurrencyPercent(c.value) + '%' }"
              />
            </div>
            <div class="text-right text-[10px] text-gray-400 font-mono">
              {{ getCurrencyPercent(c.value) }}%
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MARKET NEWS FEED -->
    <div class="space-y-4 pt-4 border-t border-terminal-border">
      <h3 class="text-base font-bold text-gray-100 uppercase tracking-wider">
        {{ t('dashboard.marketNews') }}
      </h3>
      <NewsFeed :news="[]" />
    </div>
  </div>
</template>
