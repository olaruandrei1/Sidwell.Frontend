<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import {
  useTickerDetailQuery,
  useTickerDividendsQuery,
  useDividendProjectionMutation,
  useTickerVerdictQuery,
  useAlgorithmsMetadataQuery,
  useTickerTransactionsQuery,
  useSyncTriggerMutation
} from '../../queries/useTickersQuery';
import { useSignalR } from '../../shared/composables/useSignalR';
import { useCacheSwapPulse } from '../../shared/composables/useCacheSwapPulse';
import { cleanDecimal } from '../../shared/utils/format';
import { useToast } from '../../shared/composables/useToast';
import CompositeGauge from '../../shared/ui/organisms/CompositeGauge.vue';
import PriceChart from '../../shared/ui/organisms/PriceChart.vue';
import DividendProjectionTable from '../../shared/ui/organisms/DividendProjectionTable.vue';
import StatTile from '../../shared/ui/atoms/StatTile.vue';
import MoneyText from '../../shared/ui/atoms/MoneyText.vue';
import TagBadge from '../../shared/ui/atoms/TagBadge.vue';
import AppButton from '../../shared/ui/atoms/AppButton.vue';
import TransactionOverlay from '../portfolio/components/TransactionOverlay.vue';
import TickerVerdictCard from './components/TickerVerdictCard.vue';
import AlgoDetailModal from './components/AlgoDetailModal.vue';
import StatDetailPanel from './components/StatDetailPanel.vue';
import FundamentalPeriodModal from './components/FundamentalPeriodModal.vue';
import TickerNewsCarousel from './components/TickerNewsCarousel.vue';
import TickerGrowthProjection from './components/TickerGrowthProjection.vue';
import TickerUserHoldingsSection from './components/TickerUserHoldingsSection.vue';
import TickerNotesSection from './components/TickerNotesSection.vue';
import ReportShortcutButtons from './components/ReportShortcutButtons.vue';
import type { DividendProjectionDto, AlgoScore, FundamentalPeriod } from '../../shared/api/types';

const route = useRoute();
const toast = useToast();

const symbol = computed(() => String(route.params.symbol || 'TLV.RO'));
const { data: detail, isLoading: loadingDetail, dataUpdatedAt: detailUpdatedAt } = useTickerDetailQuery(symbol);
const priceJustUpdated = useCacheSwapPulse(detailUpdatedAt);
const { data: dividendsInfo, isLoading: loadingDivs } = useTickerDividendsQuery(symbol);
const { data: verdict, isLoading: loadingVerdict, isError: verdictError } = useTickerVerdictQuery(symbol);
const { data: algorithmsMetadata } = useAlgorithmsMetadataQuery();
const { data: userTransactions } = useTickerTransactionsQuery(symbol);

const projectionMutation = useDividendProjectionMutation(symbol);
const syncMutation = useSyncTriggerMutation(symbol);

const { syncInProgress, currentProgress } = useSignalR();
const isSyncingThisTicker = computed(() =>
  syncInProgress.value && (currentProgress.value?.symbol?.toUpperCase() === symbol.value.toUpperCase())
);

const handleResync = async () => {
  try {
    await syncMutation.mutateAsync();
    toast.success('Sync Queued', `Re-sync started for ${symbol.value}`);
  } catch {
    toast.error('Sync Failed', 'Could not queue sync for this ticker');
  }
};

const projectionData = ref<DividendProjectionDto | null>(null);
const isAddTxOpen = ref(false);
const selectedAlgo = ref<AlgoScore | null>(null);
const isAlgoModalOpen = ref(false);
const growthExpanded = ref(false);
const holdingsExpanded = ref(false);
const selectedBroker = ref('ALL');

// Shared growth model that drives BOTH the target-share projection and the
// personal-holding projection below it.
const GROWTH_SCENARIOS = [
  { name: 'Conservative', cagr: 6 },
  { name: 'Moderate', cagr: 8 },
  { name: 'Aggressive', cagr: 10 },
];
const sharedScenarioIndex = ref(1);
const sharedCagr = computed(() => GROWTH_SCENARIOS[sharedScenarioIndex.value]?.cagr ?? 8);

const handleOpenAlgoModal = (algo: AlgoScore) => {
  selectedAlgo.value = algo;
  isAlgoModalOpen.value = true;
};

const ALGO_DISPLAY: Record<string, { label: string; cat: string }> = {
  piotroski: { label: 'Piotroski F-Score', cat: 'Quality' },
  altman_z: { label: 'Altman Z-Score', cat: 'Risk' },
  greenblatt: { label: 'Greenblatt Magic Formula', cat: 'Value' },
  dcf: { label: 'DCF Valuation', cat: 'Value' },
  pe_projections: { label: 'PE Projection', cat: 'Value' },
  peg: { label: 'PEG Ratio', cat: 'Growth' },
  ddm: { label: 'Dividend Discount Model', cat: 'Value' },
  momentum: { label: 'Price Momentum', cat: 'Technical' },
  accruals: { label: 'Accrual Quality', cat: 'Quality' },
  gross_profitability: { label: 'Gross Profitability', cat: 'Quality' },
  beneish_m: { label: 'Beneish M-Score', cat: 'Risk' },
  acquirers: { label: "Acquirer's Multiple", cat: 'Value' },
  montier_c: { label: 'Montier C-Score', cat: 'Risk' },
  mohanram_g: { label: 'Mohanram G-Score', cat: 'Growth' },
  composite: { label: 'Composite', cat: 'Blended' },
};

const algoLabel = (name: string): string => ALGO_DISPLAY[name]?.label ?? name;
const algoCat = (name: string): string => ALGO_DISPLAY[name]?.cat ?? '';
const algoScorePct = (algo: AlgoScore): number => {
  const n = parseFloat(String(algo.score));
  if (isNaN(n)) return 0;
  return Math.max(0, Math.min(100, (n / 10) * 100));
};
const scoredAlgos = computed(() =>
  (detail.value?.algorithms || []).filter((a) => a.score !== null && a.score !== undefined)
);

const lastProjectionParams = { endYear: 2060, reinvest: true, shares: '500' };

const fetchProjection = async (endYear = 2060, reinvest = true, shares = '500') => {
  lastProjectionParams.endYear = endYear;
  lastProjectionParams.reinvest = reinvest;
  lastProjectionParams.shares = shares;
  try {
    const res = await projectionMutation.mutateAsync({ shares, endYear, reinvest });
    projectionData.value = res;
  } catch (e) {
    console.error('Failed to load dividend projection:', e);
  }
};

watch(
  symbol,
  () => {
    fetchProjection();
  },
  { immediate: true }
);

// Dividend data can change after a Sync (SYNC_COMPLETE invalidates ticker-dividends),
// so re-derive the projection whenever fresh dividend data arrives, keeping the user's params.
watch(dividendsInfo, (newVal, oldVal) => {
  if (newVal && oldVal) {
    fetchProjection(lastProjectionParams.endYear, lastProjectionParams.reinvest, lastProjectionParams.shares);
  }
});

const handleUpdateProjectionParams = (endYear: number, reinvest: boolean, shares = '500') => {
  fetchProjection(endYear, reinvest, shares);
};

const selectedStatKey = ref<string | null>(null);
const selectedStatValue = ref<string | null>(null);
const isStatPanelOpen = ref(false);

const openStatPanel = (key: string, value: string | null | undefined) => {
  selectedStatKey.value = key;
  selectedStatValue.value = value ?? null;
  isStatPanelOpen.value = true;
};

const selectedPeriod = ref<FundamentalPeriod | null>(null);
const isPeriodModalOpen = ref(false);

const openPeriod = (f: FundamentalPeriod) => {
  selectedPeriod.value = f;
  isPeriodModalOpen.value = true;
};

const formatStat = (val: string | number | null | undefined, defaultText = 'N/A', places = 2): string => {
  if (val === null || val === undefined || val === '') return defaultText;
  return cleanDecimal(val, places);
};

const formatAlgoScore = (score: string | number | null | undefined): string => {
  if (score === null || score === undefined || score === '') return 'N/A';
  return cleanDecimal(score, 3);
};

const formatLargeNum = (val: string | null | undefined): string => {
  if (!val) return 'N/A';
  const n = parseFloat(val);
  if (isNaN(n)) return 'N/A';
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toFixed(2);
};

const getAlgoNotes = (details: Record<string, unknown> | null | undefined): string[] => {
  if (!details) return [];
  if (Array.isArray(details.notes)) {
    return details.notes.map(String);
  }
  return [];
};

const getAlgoNoteString = (details: Record<string, unknown> | null | undefined): string | null => {
  if (!details) return null;
  if (typeof details.note === 'string' && details.note) return details.note;
  return null;
};

const getAlgoBand = (algo: AlgoScore): 'green' | 'yellow' | 'red' => {
  if (algo.name.includes('Beneish')) {
    return algo.details?.manipulator ? 'red' : 'green';
  }
  const val = parseFloat(String(algo.score));
  if (isNaN(val)) return 'yellow';
  if (val >= 7) return 'green';
  if (val >= 4) return 'yellow';
  return 'red';
};

const availableBrokers = computed(() => {
  const txs = userTransactions.value;
  if (!txs || txs.length === 0) return [];
  return [...new Set(txs.map(t => t.broker).filter(Boolean))];
});

const filteredTransactions = computed(() => {
  const txs = userTransactions.value;
  if (!txs) return null;
  if (selectedBroker.value === 'ALL') return txs;
  return txs.filter(t => t.broker === selectedBroker.value);
});

const latestFundamentals = computed(() => {
  const funds = detail.value?.fundamentals;
  if (!funds || funds.length === 0) return [];
  return funds.slice(0, 5);
});

const hasDividendData = computed(() => {
  const div = dividendsInfo.value || detail.value?.dividends || null;
  if (!div) return false;
  const yield_ = parseFloat(String(div.dividendYield ?? '0'));
  const fwd = parseFloat(String(div.forwardDividend ?? '0'));
  return (Number.isFinite(yield_) && yield_ > 0) || (Number.isFinite(fwd) && fwd > 0);
});

const latestClose = computed(() => {
  const c = detail.value?.price.latest?.close;
  return c != null ? parseFloat(String(c)) : null;
});

const prevClose = computed(() => {
  const hist = detail.value?.price.history;
  if (!hist || hist.length < 2) return null;
  return parseFloat(String(hist.at(-2)!.close));
});

const dayChange = computed(() => {
  if (latestClose.value == null || prevClose.value == null) return 0;
  return latestClose.value - prevClose.value;
});

const dayChangePct = computed(() => {
  if (prevClose.value == null || prevClose.value === 0) return 0;
  return (dayChange.value / prevClose.value) * 100;
});

const rangePercent = computed(() => {
  const price = latestClose.value;
  const low = detail.value?.keyStats?.fiftyTwoWeekLow;
  const high = detail.value?.keyStats?.fiftyTwoWeekHigh;
  if (price == null || !low || !high) return 50;
  const lo = parseFloat(String(low));
  const hi = parseFloat(String(high));
  if (hi <= lo) return 50;
  return Math.min(100, Math.max(0, ((price - lo) / (hi - lo)) * 100));
});

// Only one PriceChart instance is ever mounted (desktop vs mobile layout) — matches
// Tailwind's `lg` breakpoint exactly so we don't pay for a second hidden ECharts instance.
const isLgUp = ref(window.matchMedia('(min-width: 1024px)').matches);
let lgMediaQuery: MediaQueryList | null = null;
const handleLgChange = (e: MediaQueryListEvent) => { isLgUp.value = e.matches; };
onMounted(() => {
  lgMediaQuery = window.matchMedia('(min-width: 1024px)');
  lgMediaQuery.addEventListener('change', handleLgChange);
});
onUnmounted(() => {
  lgMediaQuery?.removeEventListener('change', handleLgChange);
});
</script>

<template>
  <div class="space-y-4 sm:space-y-6 font-mono select-none">
    <!-- ── Hero — content directly on the background, centered ───────────── -->
    <div class="select-none space-y-5">

      <!-- Identity + actions -->
      <div class="flex flex-col items-center sm:flex-row sm:items-start sm:justify-between gap-3">
        <div class="min-w-0 w-full sm:w-auto flex flex-col items-center sm:items-start">
          <div class="flex items-center gap-3 flex-wrap justify-center sm:justify-start">
            <h1 class="text-3xl sm:text-4xl font-black text-gray-50 tracking-tight font-mono leading-none">{{ detail?.ticker.symbol || symbol }}</h1>
            <span class="px-2 py-1 text-xs bg-terminal-bg border border-white/10 rounded-lg font-bold text-gray-300 font-mono">{{ detail?.ticker.exchange || '?' }}</span>
            <span
              class="px-2 py-1 text-xs bg-terminal-bg border rounded-lg font-bold font-mono"
              :class="detail?.ticker.currency === 'USD' ? 'text-emerald-400 border-emerald-500/30' : 'text-amber-400 border-amber-500/30'"
            >{{ detail?.ticker.currency || '—' }}</span>
            <span v-if="detail?.watchlisted" class="px-2 py-1 text-xs bg-terminal-accent/10 border border-terminal-accent/30 rounded-lg font-bold text-terminal-accent font-mono">★ WATCHLIST</span>
          </div>
          <p class="text-sm text-gray-400 font-sans mt-2 text-center sm:text-left">{{ detail?.ticker.name || 'Loading...' }}</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <TagBadge v-if="detail?.composite?.overridden" variant="down" size="sm" pulse>BENEISH VETO</TagBadge>
          <button
            :disabled="syncMutation.isPending.value || isSyncingThisTicker"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold font-mono uppercase tracking-wider rounded-lg border transition-all duration-200 btn-press select-none"
            :class="isSyncingThisTicker
              ? 'bg-terminal-accent/10 border-terminal-accent/40 text-terminal-accent animate-pulse cursor-wait'
              : 'bg-white/5 border-white/10 text-gray-200 hover:border-terminal-accent/50 hover:text-terminal-accent disabled:opacity-50 disabled:cursor-not-allowed'"
            @click="handleResync"
          >
            <svg class="w-3.5 h-3.5" :class="isSyncingThisTicker ? 'animate-spin' : ''" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M13.5 8A5.5 5.5 0 1 1 8 2.5" />
              <polyline points="13.5 2.5 13.5 6 10 6" />
            </svg>
            {{ isSyncingThisTicker ? (currentProgress?.percent ?? 0) + '%' : 'SYNC' }}
          </button>
          <AppButton variant="primary" size="sm" @click="isAddTxOpen = true" class="shadow-glow-accent/20">
            + TRANSACTION
          </AppButton>
        </div>
      </div>

      <!-- Live sync progress bar -->
      <div v-if="isSyncingThisTicker && currentProgress">
        <div class="flex items-center justify-between text-[10px] font-mono text-terminal-accent/80 pb-1 font-bold">
          <span>{{ currentProgress.status }}</span>
          <span>{{ currentProgress.current }}/{{ currentProgress.total }}</span>
        </div>
        <div class="h-0.5 bg-white/10 rounded-full overflow-hidden">
          <div class="h-full bg-terminal-accent transition-all duration-500 shadow-glow-accent" :style="{ width: currentProgress.percent + '%' }" />
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loadingDetail" class="py-10 text-center text-gray-500 animate-pulse text-xs font-mono">
        Loading ticker data...
      </div>

      <!-- Price + gauge, centered on the background -->
      <div v-else class="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-10 pt-2">

        <!-- Price -->
        <div class="flex flex-col items-center lg:items-start gap-3 lg:shrink-0">
          <div class="text-center lg:text-left">
            <div class="flex items-baseline gap-2 justify-center lg:justify-start">
              <span
                class="text-5xl lg:text-6xl font-black font-mono text-gray-50 tabular-nums leading-none transition-colors duration-500"
                :class="priceJustUpdated ? 'sw-fresh-pulse' : ''"
              >
                {{ latestClose != null ? latestClose.toFixed(2) : 'N/A' }}
              </span>
              <span class="text-base lg:text-lg text-gray-500 font-mono">{{ detail?.ticker.currency }}</span>
            </div>
            <div class="flex items-center gap-2 mt-2 justify-center lg:justify-start">
              <span
                class="text-base lg:text-lg font-bold font-mono tabular-nums"
                :class="dayChange >= 0 ? 'text-emerald-400' : 'text-rose-400'"
              >
                {{ dayChange >= 0 ? '+' : '' }}{{ dayChange.toFixed(2) }}
                <span class="text-sm lg:text-base opacity-80">({{ dayChange >= 0 ? '+' : '' }}{{ dayChangePct.toFixed(2) }}%)</span>
              </span>
              <span class="text-[10px] text-gray-600 font-mono uppercase tracking-wider">vs prev close</span>
            </div>
          </div>

          <!-- 52W range bar -->
          <div v-if="detail?.keyStats?.fiftyTwoWeekLow && detail?.keyStats?.fiftyTwoWeekHigh" class="space-y-1.5 w-full max-w-[340px] lg:max-w-[380px]">
            <div class="relative h-2.5 bg-white/15 rounded-full border border-white/10 shadow-inner">
              <div
                class="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-terminal-accent/40 to-terminal-accent"
                :style="{ width: rangePercent + '%' }"
              />
              <div
                class="absolute top-1/2 w-3.5 h-3.5 rounded-full bg-terminal-accent border-2 border-terminal-bg shadow-glow-accent ring-1 ring-terminal-accent/60"
                :style="{ left: 'calc(' + rangePercent + '% - 7px)', transform: 'translateY(-50%)' }"
              />
            </div>
            <div class="flex items-center justify-between text-[10px] font-mono text-gray-500">
              <span>{{ formatStat(detail.keyStats.fiftyTwoWeekLow, '', 2) }} <span class="text-gray-600">LOW</span></span>
              <span class="text-gray-600">52W RANGE</span>
              <span><span class="text-gray-600">HIGH</span> {{ formatStat(detail.keyStats.fiftyTwoWeekHigh, '', 2) }}</span>
            </div>
          </div>
        </div>

        <!-- Chart in between price and composite on desktop only -->
        <div v-if="isLgUp" class="flex-1 min-w-0">
          <PriceChart :bars="detail?.price.history || []" :height="320" :symbol="symbol" :currency="detail?.ticker.currency || 'USD'" />
        </div>

        <!-- Composite Gauge (de-carded) -->
        <div class="flex-shrink-0 w-full max-w-[300px] lg:max-w-[340px]">
          <CompositeGauge :composite="detail?.composite || null" size="lg" />
        </div>
      </div>
    </div>

    <!-- ── Your Position — title on the background, one flat card ────────── -->
    <section v-if="!loadingDetail && detail?.holding" class="space-y-2">
      <div class="flex items-center gap-2 px-1">
        <h2 class="text-sm font-bold text-gray-100 uppercase tracking-wider font-mono">Your Position</h2>
        <TagBadge variant="accent" size="sm">OWNED</TagBadge>
      </div>
      <div class="border border-white/10 sw-glass-card rounded-2xl px-5 py-4 shadow-lg">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
          <div>
            <span class="block text-[11px] text-gray-500 uppercase tracking-wider font-mono mb-0.5">Shares</span>
            <span class="block text-base font-bold font-mono text-gray-100 tabular-nums sw-private">{{ Math.trunc(parseFloat(String(detail.holding.shares))) }}</span>
          </div>
          <div>
            <span class="block text-[11px] text-gray-500 uppercase tracking-wider font-mono mb-0.5">Avg Cost</span>
            <MoneyText :value="detail.holding.avgCost" :currency="detail.holding.currency" :places="2" :color="false" size="md" />
          </div>
          <div>
            <span class="block text-[11px] text-gray-500 uppercase tracking-wider font-mono mb-0.5">Market Value</span>
            <MoneyText :value="detail.holding.marketValue" :currency="detail.holding.currency" :places="2" :color="false" size="md" />
          </div>
          <div>
            <span class="block text-[11px] text-gray-500 uppercase tracking-wider font-mono mb-0.5">Unrealized P&L</span>
            <MoneyText :value="detail.holding.unrealizedPnl" :currency="detail.holding.currency" :places="2" :color="true" :show-sign="true" size="md" />
          </div>
        </div>
      </div>
    </section>

    <!-- ── Key Statistics — title on the background, tiles/cards sit on bg ── -->
    <section v-if="!loadingDetail" class="space-y-3">
      <div class="flex items-center justify-between gap-2 px-1">
        <h2 class="text-sm font-bold text-gray-100 uppercase tracking-wider font-mono">Key Statistics</h2>
        <span
          v-if="detail?.keyStats?.analystConsensus"
          class="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-[11px] font-bold border shrink-0"
          :class="detail.keyStats.analystConsensus === 'Buy'
            ? 'bg-emerald-950/30 text-emerald-300 border-emerald-500/30'
            : detail.keyStats.analystConsensus === 'Sell'
            ? 'bg-rose-950/30 text-rose-300 border-rose-500/30'
            : 'bg-amber-950/30 text-amber-300 border-amber-500/30'"
        >
          {{ detail.keyStats.analystConsensus?.toUpperCase() }}
          <span class="text-[10px] font-normal opacity-75">{{ detail.keyStats.analystBuy }}B / {{ detail.keyStats.analystHold }}H / {{ detail.keyStats.analystSell }}S</span>
        </span>
      </div>

          <!-- DESKTOP: flat wrapping tiles — tap any for an explanation. Always rendered (falls back to
               N/A) so desktop and mobile agree on which stats exist for this ticker instead of desktop
               silently hiding rows that mobile shows as N/A. -->
          <div class="hidden sm:flex flex-wrap gap-2 w-full">
            <StatTile label="P/E Trailing" compact class="flex-1 min-w-[100px] cursor-pointer hover:border-terminal-accent/40" @click="openStatPanel('peTrailing', formatStat(detail?.keyStats?.peTrailing, 'N/A', 2))">{{ formatStat(detail?.keyStats?.peTrailing, 'N/A', 2) }}</StatTile>
            <StatTile label="P/B Ratio" compact class="flex-1 min-w-[100px] cursor-pointer hover:border-terminal-accent/40" @click="openStatPanel('priceToBook', formatStat(detail?.keyStats?.priceToBook, 'N/A', 2))">{{ formatStat(detail?.keyStats?.priceToBook, 'N/A', 2) }}</StatTile>
            <StatTile label="ROE TTM" compact class="flex-1 min-w-[100px] cursor-pointer hover:border-terminal-accent/40" @click="openStatPanel('roeTtm', detail?.keyStats?.roeTtm ? `${formatStat(detail.keyStats.roeTtm, 'N/A', 2)}%` : 'N/A')">{{ detail?.keyStats?.roeTtm ? `${formatStat(detail.keyStats.roeTtm, 'N/A', 2)}%` : 'N/A' }}</StatTile>
            <StatTile label="Beta (1Y)" compact class="flex-1 min-w-[100px] cursor-pointer hover:border-terminal-accent/40" @click="openStatPanel('beta', formatStat(detail?.keyStats?.beta, 'N/A', 2))">{{ formatStat(detail?.keyStats?.beta, 'N/A', 2) }}</StatTile>
            <StatTile label="D/E Ratio" compact class="flex-1 min-w-[100px] cursor-pointer hover:border-terminal-accent/40" @click="openStatPanel('debtToEquity', formatStat(detail?.keyStats?.debtToEquity, 'N/A', 2))">{{ formatStat(detail?.keyStats?.debtToEquity, 'N/A', 2) }}</StatTile>
            <StatTile label="Rev. Growth" compact class="flex-1 min-w-[100px] cursor-pointer hover:border-terminal-accent/40" @click="openStatPanel('revenueGrowthTtmYoy', detail?.keyStats?.revenueGrowthTtmYoy ? `${formatStat(detail.keyStats.revenueGrowthTtmYoy, 'N/A', 2)}%` : 'N/A')">{{ detail?.keyStats?.revenueGrowthTtmYoy ? `${formatStat(detail.keyStats.revenueGrowthTtmYoy, 'N/A', 2)}%` : 'N/A' }}</StatTile>
            <StatTile label="EV/EBITDA" compact class="flex-1 min-w-[100px] cursor-pointer hover:border-terminal-accent/40" @click="openStatPanel('evToEbitda', formatStat(detail?.keyStats?.evToEbitda, 'N/A', 2))">{{ formatStat(detail?.keyStats?.evToEbitda, 'N/A', 2) }}</StatTile>
            <StatTile label="1Y Target" compact class="flex-1 min-w-[100px] cursor-pointer hover:border-terminal-accent/40" @click="openStatPanel('targetOneYear', formatStat(detail?.keyStats?.targetOneYear, 'N/A', 2))"><MoneyText :value="detail?.keyStats?.targetOneYear" :currency="detail?.ticker.currency" :color="false" /></StatTile>
            <StatTile label="Market Cap" compact class="flex-1 min-w-[120px] cursor-pointer hover:border-terminal-accent/40" @click="openStatPanel('marketCap', `${formatLargeNum(detail?.keyStats?.marketCap)} ${detail?.ticker.currency || ''}`)">{{ formatLargeNum(detail?.keyStats?.marketCap) }} {{ detail?.ticker.currency || '' }}</StatTile>
            <StatTile label="Volume" compact class="flex-1 min-w-[100px] cursor-pointer hover:border-terminal-accent/40" @click="openStatPanel('volume', formatLargeNum(String(detail?.price.latest?.volume ?? '')))">{{ formatLargeNum(String(detail?.price.latest?.volume ?? '')) }}</StatTile>
            <StatTile label="Div. Yield" compact class="flex-1 min-w-[100px] cursor-pointer hover:border-terminal-accent/40" @click="openStatPanel('dividendYield', detail?.dividends?.dividendYield ? `${parseFloat(String(detail.dividends.dividendYield)).toFixed(2)}%` : 'N/A')">{{ detail?.dividends?.dividendYield ? `${parseFloat(String(detail.dividends.dividendYield)).toFixed(2)}%` : 'N/A' }}</StatTile>
            <StatTile label="Earnings" compact class="flex-1 min-w-[110px] cursor-pointer hover:border-terminal-accent/40" @click="openStatPanel('earningsDate', detail?.keyStats?.earningsDate || 'N/A')">{{ detail?.keyStats?.earningsDate || 'N/A' }}</StatTile>
          </div>

          <!-- MOBILE: swipeable cards -->
          <div class="sm:hidden flex overflow-x-auto snap-x snap-mandatory gap-3 pb-3 scrollbar-none px-0.5">
            <div class="snap-start flex-shrink-0 w-[75vw] max-w-[280px] bg-terminal-surface border border-white/10 rounded-2xl p-4 space-y-3 shadow-md">
              <span class="block text-[11px] font-mono font-bold text-terminal-accent uppercase tracking-widest pb-1 border-b border-white/10">Valuation <span class="text-gray-600 normal-case tracking-normal">· tap for info</span></span>
              <div class="grid grid-cols-1 gap-y-1 text-xs font-mono">
                <button type="button" class="flex items-center justify-between gap-3 py-1 text-left active:bg-white/5 rounded-lg -mx-1 px-1" @click="openStatPanel('peTrailing', formatStat(detail?.keyStats?.peTrailing, 'N/A', 2))">
                  <span class="text-[11px] text-gray-400 uppercase tracking-wider">P/E Trailing</span>
                  <span class="font-bold text-gray-100">{{ formatStat(detail?.keyStats?.peTrailing, 'N/A', 2) }}</span>
                </button>
                <button type="button" class="flex items-center justify-between gap-3 py-1 text-left active:bg-white/5 rounded-lg -mx-1 px-1" @click="openStatPanel('priceToBook', formatStat(detail?.keyStats?.priceToBook, 'N/A', 2))">
                  <span class="text-[11px] text-gray-400 uppercase tracking-wider">P/B Ratio</span>
                  <span class="font-bold text-gray-100">{{ formatStat(detail?.keyStats?.priceToBook, 'N/A', 2) }}</span>
                </button>
                <button type="button" class="flex items-center justify-between gap-3 py-1 text-left active:bg-white/5 rounded-lg -mx-1 px-1" @click="openStatPanel('roeTtm', detail?.keyStats?.roeTtm ? `${formatStat(detail.keyStats.roeTtm, 'N/A', 2)}%` : 'N/A')">
                  <span class="text-[11px] text-gray-400 uppercase tracking-wider">ROE TTM</span>
                  <span class="font-bold text-gray-100">{{ detail?.keyStats?.roeTtm ? `${formatStat(detail.keyStats.roeTtm, 'N/A', 2)}%` : 'N/A' }}</span>
                </button>
                <button type="button" class="flex items-center justify-between gap-3 py-1 text-left active:bg-white/5 rounded-lg -mx-1 px-1" @click="openStatPanel('evToEbitda', formatStat(detail?.keyStats?.evToEbitda, 'N/A', 2))">
                  <span class="text-[11px] text-gray-400 uppercase tracking-wider">EV/EBITDA</span>
                  <span class="font-bold text-gray-100">{{ formatStat(detail?.keyStats?.evToEbitda, 'N/A', 2) }}</span>
                </button>
                <button type="button" class="flex items-center justify-between gap-3 py-1 text-left active:bg-white/5 rounded-lg -mx-1 px-1" @click="openStatPanel('debtToEquity', formatStat(detail?.keyStats?.debtToEquity, 'N/A', 2))">
                  <span class="text-[11px] text-gray-400 uppercase tracking-wider">D/E Ratio</span>
                  <span class="font-bold text-gray-100">{{ formatStat(detail?.keyStats?.debtToEquity, 'N/A', 2) }}</span>
                </button>
                <button type="button" class="flex items-center justify-between gap-3 py-1 text-left active:bg-white/5 rounded-lg -mx-1 px-1" @click="openStatPanel('revenueGrowthTtmYoy', detail?.keyStats?.revenueGrowthTtmYoy ? `${formatStat(detail.keyStats.revenueGrowthTtmYoy, 'N/A', 2)}%` : 'N/A')">
                  <span class="text-[11px] text-gray-400 uppercase tracking-wider">Rev. Growth</span>
                  <span class="font-bold text-gray-100">{{ detail?.keyStats?.revenueGrowthTtmYoy ? `${formatStat(detail.keyStats.revenueGrowthTtmYoy, 'N/A', 2)}%` : 'N/A' }}</span>
                </button>
              </div>
            </div>
            <div class="snap-start flex-shrink-0 w-[75vw] max-w-[280px] bg-terminal-surface border border-white/10 rounded-2xl p-4 space-y-3 shadow-md">
              <span class="block text-[11px] font-mono font-bold text-terminal-accent uppercase tracking-widest pb-1 border-b border-white/10">Market Data <span class="text-gray-600 normal-case tracking-normal">· tap for info</span></span>
              <div class="grid grid-cols-1 gap-y-1 text-xs font-mono">
                <button type="button" class="flex items-center justify-between gap-3 py-1 text-left active:bg-white/5 rounded-lg -mx-1 px-1" @click="openStatPanel('fiftyTwoWeekLow', formatStat(detail?.keyStats?.fiftyTwoWeekLow, 'N/A', 2))">
                  <span class="text-[11px] text-gray-400 uppercase tracking-wider">52W Low</span>
                  <span class="font-bold text-gray-100">{{ formatStat(detail?.keyStats?.fiftyTwoWeekLow, 'N/A', 2) }}</span>
                </button>
                <button type="button" class="flex items-center justify-between gap-3 py-1 text-left active:bg-white/5 rounded-lg -mx-1 px-1" @click="openStatPanel('fiftyTwoWeekHigh', formatStat(detail?.keyStats?.fiftyTwoWeekHigh, 'N/A', 2))">
                  <span class="text-[11px] text-gray-400 uppercase tracking-wider">52W High</span>
                  <span class="font-bold text-gray-100">{{ formatStat(detail?.keyStats?.fiftyTwoWeekHigh, 'N/A', 2) }}</span>
                </button>
                <button type="button" class="flex items-center justify-between gap-3 py-1 text-left active:bg-white/5 rounded-lg -mx-1 px-1" @click="openStatPanel('beta', formatStat(detail?.keyStats?.beta, 'N/A', 2))">
                  <span class="text-[11px] text-gray-400 uppercase tracking-wider">Beta (1Y)</span>
                  <span class="font-bold text-gray-100">{{ formatStat(detail?.keyStats?.beta, 'N/A', 2) }}</span>
                </button>
                <button type="button" class="flex items-center justify-between gap-3 py-1 text-left active:bg-white/5 rounded-lg -mx-1 px-1" @click="openStatPanel('volume', formatLargeNum(String(detail?.price.latest?.volume ?? '')))">
                  <span class="text-[11px] text-gray-400 uppercase tracking-wider">Volume</span>
                  <span class="font-bold text-gray-100">{{ formatLargeNum(String(detail?.price.latest?.volume ?? '')) }}</span>
                </button>
                <button type="button" class="flex items-center justify-between gap-3 py-1 text-left active:bg-white/5 rounded-lg -mx-1 px-1" @click="openStatPanel('marketCap', `${formatLargeNum(detail?.keyStats?.marketCap)} ${detail?.ticker.currency || ''}`)">
                  <span class="text-[11px] text-gray-400 uppercase tracking-wider">Market Cap</span>
                  <span class="font-bold text-gray-100">{{ formatLargeNum(detail?.keyStats?.marketCap) }} {{ detail?.ticker.currency || '' }}</span>
                </button>
              </div>
            </div>
            <div class="snap-start flex-shrink-0 w-[75vw] max-w-[280px] bg-terminal-surface border border-white/10 rounded-2xl p-4 space-y-3 shadow-md">
              <span class="block text-[11px] font-mono font-bold text-terminal-accent uppercase tracking-widest pb-1 border-b border-white/10">Analyst &amp; Dividends</span>
              <div class="grid grid-cols-1 gap-y-1 text-xs font-mono">
                <button type="button" class="flex items-center justify-between gap-3 py-1 text-left active:bg-white/5 rounded-lg -mx-1 px-1" @click="openStatPanel('targetOneYear', formatStat(detail?.keyStats?.targetOneYear, 'N/A', 2))">
                  <span class="text-[11px] text-gray-400 uppercase tracking-wider">1Y Target</span>
                  <span class="font-bold text-gray-100"><MoneyText :value="detail?.keyStats?.targetOneYear" :currency="detail?.ticker.currency" :color="false" /></span>
                </button>
                <div class="flex items-center justify-between gap-3 py-1">
                  <span class="text-[11px] text-gray-400 uppercase tracking-wider">Consensus</span>
                  <span
                    class="inline-block px-2 py-0.5 rounded text-[10px] font-bold"
                    :class="detail?.keyStats?.analystConsensus === 'Buy'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : detail?.keyStats?.analystConsensus === 'Sell'
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-amber-500/20 text-amber-300'"
                  >{{ detail?.keyStats?.analystConsensus?.toUpperCase() || 'N/A' }}</span>
                </div>
                <button type="button" class="flex items-center justify-between gap-3 py-1 text-left active:bg-white/5 rounded-lg -mx-1 px-1" @click="openStatPanel('dividendYield', detail?.dividends?.dividendYield ? `${parseFloat(String(detail.dividends.dividendYield)).toFixed(2)}%` : 'N/A')">
                  <span class="text-[11px] text-gray-400 uppercase tracking-wider">Div. Yield</span>
                  <span class="font-bold text-emerald-400">{{ detail?.dividends?.dividendYield ? `${parseFloat(String(detail.dividends.dividendYield)).toFixed(2)}%` : 'N/A' }}</span>
                </button>
                <button type="button" class="flex items-center justify-between gap-3 py-1 text-left active:bg-white/5 rounded-lg -mx-1 px-1" @click="openStatPanel('earningsDate', detail?.keyStats?.earningsDate || 'N/A')">
                  <span class="text-[11px] text-gray-400 uppercase tracking-wider">Earnings Date</span>
                  <span class="font-bold text-gray-100">{{ detail?.keyStats?.earningsDate || 'N/A' }}</span>
                </button>
              </div>
            </div>
          </div>
        </section>

    <!-- ── Verdict ─────────────────────────────────────────────────────────── -->
    <TickerVerdictCard :verdict="verdict" :is-loading="loadingVerdict" :is-error="verdictError" />

    <div class="w-full sm:max-w-md sm:ml-auto">
      <ReportShortcutButtons :symbol="symbol" />
    </div>

    <!-- ── Chart + Algorithms (Fluid Flexbox layout) ───────────────────────── -->
    <div v-if="!loadingDetail" class="flex flex-wrap w-full gap-6 items-start">
      <!-- Price Chart (mobile only — desktop shows chart between price and composite above) -->
      <div v-if="!isLgUp" class="flex-1 min-w-[340px] max-w-full w-full">
        <PriceChart :bars="detail?.price.history || []" :height="360" :symbol="symbol" :currency="detail?.ticker.currency || 'USD'" />
      </div>

      <!-- Algorithms — title on background, score-bar cards (tap for detail) -->
      <div v-if="scoredAlgos.length > 0" class="w-full lg:flex-1 space-y-2.5">
        <div class="flex items-center justify-between px-1">
          <h2 class="text-sm font-bold text-gray-100 uppercase tracking-wider font-mono">
            Quantitative Algorithms
          </h2>
          <span class="text-[11px] text-gray-500 font-bold font-mono">{{ scoredAlgos.length }} MODELS · tap</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          <button
            v-for="algo in scoredAlgos"
            :key="algo.name"
            type="button"
            @click="handleOpenAlgoModal(algo)"
            class="text-left border border-white/10 sw-glass-card rounded-xl px-3.5 py-3 space-y-2 hover:border-terminal-accent/40 transition-colors shadow-sm"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="text-[13px] font-bold text-gray-100 font-mono leading-tight truncate">{{ algoLabel(algo.name) }}</div>
                <div class="text-[10px] text-gray-500 uppercase tracking-wider">{{ algoCat(algo.name) }}</div>
              </div>
              <span
                class="text-base font-black font-mono tabular-nums shrink-0"
                :class="{
                  'text-emerald-400': getAlgoBand(algo) === 'green',
                  'text-amber-400': getAlgoBand(algo) === 'yellow',
                  'text-rose-400': getAlgoBand(algo) === 'red',
                }"
              >{{ cleanDecimal(algo.score, 2) }}</span>
            </div>
            <div class="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="{
                  'bg-emerald-400': getAlgoBand(algo) === 'green',
                  'bg-amber-400': getAlgoBand(algo) === 'yellow',
                  'bg-rose-500': getAlgoBand(algo) === 'red',
                }"
                :style="{ width: algoScorePct(algo) + '%' }"
              />
            </div>
            <div v-if="algo.name === 'beneish_m'" class="text-[10px] font-bold uppercase" :class="algo.details?.manipulator ? 'text-rose-400' : 'text-emerald-400'">
              {{ algo.details?.manipulator ? '⚠ Manipulation flagged' : '✓ Low manipulation risk' }}
            </div>
          </button>
        </div>
      </div>

      <!-- No scored algorithms — explain which ones are unavailable and why, instead of showing nothing -->
      <div v-else-if="(detail?.gatedAlgos?.length ?? 0) > 0" class="w-full lg:flex-1 space-y-2.5">
        <div class="flex items-center justify-between px-1">
          <h2 class="text-sm font-bold text-gray-100 uppercase tracking-wider font-mono">
            Quantitative Algorithms
          </h2>
          <span class="text-[11px] text-gray-500 font-bold font-mono">{{ detail?.gatedAlgos?.length }} UNAVAILABLE</span>
        </div>
        <div class="border border-white/10 sw-glass-card rounded-2xl px-4 py-3.5 space-y-2">
          <div
            v-for="gated in detail?.gatedAlgos"
            :key="gated.algoName"
            class="flex items-center justify-between gap-3 text-xs font-mono"
          >
            <span class="text-gray-300 font-bold">{{ algoLabel(gated.algoName) }}</span>
            <span class="text-gray-500">{{ gated.missingData }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Financial Fundamentals — title on background, cards on background ── -->
    <section v-if="!loadingDetail && latestFundamentals.length > 0" class="space-y-3">
      <div class="flex items-center justify-between px-1">
        <h2 class="text-sm font-bold text-gray-100 uppercase tracking-wider font-mono">Financial Fundamentals</h2>
        <span class="text-[11px] text-gray-500 font-bold font-mono">SEC / EDGAR · {{ latestFundamentals.length }} PERIODS · tap a period</span>
      </div>

      <!-- Desktop: table in a single flat card -->
      <div class="hidden md:block border border-white/10 sw-glass-card rounded-2xl overflow-x-auto shadow-lg">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="border-b border-white/10 bg-terminal-surface-light/60 text-gray-400 uppercase tracking-wider font-bold">
              <th class="px-4 py-3">Period</th>
              <th class="px-4 py-3 text-right">Revenue</th>
              <th class="px-4 py-3 text-right">Gross Profit</th>
              <th class="px-4 py-3 text-right">EBIT</th>
              <th class="px-4 py-3 text-right">Net Income</th>
              <th class="px-4 py-3 text-right">EPS</th>
              <th class="px-4 py-3 text-right">Total Equity</th>
              <th class="px-4 py-3 text-right">Total Assets</th>
              <th class="px-4 py-3 text-right">Shares Out.</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5 text-sm font-mono">
            <tr
              v-for="f in latestFundamentals"
              :key="f.asOfDate"
              class="hover:bg-white/[0.05] cursor-pointer transition-colors"
              @click="openPeriod(f)"
            >
              <td class="px-4 py-2.5 font-bold text-gray-200 whitespace-nowrap">
                <span class="text-gray-300">{{ f.asOfDate?.slice(0, 7) }}</span>
                <span
                  class="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold"
                  :class="f.period === 'FY' ? 'bg-terminal-accent/20 text-terminal-accent' : 'bg-gray-700/50 text-gray-400'"
                >
                  {{ f.period }}
                </span>
              </td>
              <td class="px-4 py-2.5 text-right font-semibold text-gray-200">{{ formatLargeNum(f.revenue) }}</td>
              <td class="px-4 py-2.5 text-right font-semibold">
                <span :class="parseFloat(f.grossProfit ?? '0') >= 0 ? 'text-emerald-400' : 'text-rose-400'">
                  {{ formatLargeNum(f.grossProfit) }}
                </span>
              </td>
              <td class="px-4 py-2.5 text-right font-semibold">
                <span :class="parseFloat(f.ebit ?? '0') >= 0 ? 'text-emerald-400' : 'text-rose-400'">
                  {{ formatLargeNum(f.ebit) }}
                </span>
              </td>
              <td class="px-4 py-2.5 text-right font-semibold">
                <span :class="parseFloat(f.netIncome ?? '0') >= 0 ? 'text-emerald-400' : 'text-rose-400'">
                  {{ formatLargeNum(f.netIncome) }}
                </span>
              </td>
              <td class="px-4 py-2.5 text-right font-mono text-gray-300 font-bold">
                {{ formatStat(f.eps, 'N/A', 2) }}
              </td>
              <td class="px-4 py-2.5 text-right text-gray-300 font-medium">{{ formatLargeNum(f.totalEquity) }}</td>
              <td class="px-4 py-2.5 text-right text-gray-400">{{ formatLargeNum(f.totalAssets) }}</td>
              <td class="px-4 py-2.5 text-right text-gray-400">
                {{ f.sharesOutstanding ? formatLargeNum(String(f.sharesOutstanding)) : 'N/A' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile: swipeable period cards directly on the background -->
      <div class="md:hidden flex overflow-x-auto snap-x snap-mandatory gap-4 pb-2 scrollbar-none -mx-1 px-1">
        <button
          v-for="f in latestFundamentals"
          :key="f.asOfDate"
          type="button"
          class="snap-start shrink-0 w-[82vw] max-w-[300px] text-left bg-terminal-surface border border-white/10 rounded-2xl p-5 space-y-3 shadow-lg active:border-terminal-accent/50 transition-colors"
          @click="openPeriod(f)"
        >
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <span class="font-bold text-gray-100 text-base font-mono">{{ f.asOfDate?.slice(0, 7) }}</span>
            <span
              class="px-2.5 py-1 rounded text-xs font-bold font-mono"
              :class="f.period === 'FY' ? 'bg-terminal-accent/20 text-terminal-accent border border-terminal-accent/30' : 'bg-gray-800 text-gray-300 border border-white/10'"
            >
              {{ f.period }}
            </span>
          </div>

          <div class="flex flex-col gap-2.5 text-xs font-mono">
            <div class="flex items-center justify-between gap-3">
              <span class="text-gray-400 text-[11px] uppercase tracking-wider">Revenue</span>
              <span class="font-bold text-gray-200 text-sm">{{ formatLargeNum(f.revenue) }}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-gray-400 text-[11px] uppercase tracking-wider">Gross Profit</span>
              <span class="font-bold text-sm" :class="parseFloat(f.grossProfit ?? '0') >= 0 ? 'text-emerald-400' : 'text-rose-400'">
                {{ formatLargeNum(f.grossProfit) }}
              </span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-gray-400 text-[11px] uppercase tracking-wider">EBIT</span>
              <span class="font-bold text-sm" :class="parseFloat(f.ebit ?? '0') >= 0 ? 'text-emerald-400' : 'text-rose-400'">
                {{ formatLargeNum(f.ebit) }}
              </span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-gray-400 text-[11px] uppercase tracking-wider">Net Income</span>
              <span class="font-bold text-sm" :class="parseFloat(f.netIncome ?? '0') >= 0 ? 'text-emerald-400' : 'text-rose-400'">
                {{ formatLargeNum(f.netIncome) }}
              </span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-gray-400 text-[11px] uppercase tracking-wider">EPS</span>
              <span class="font-bold text-gray-200 text-sm">{{ formatStat(f.eps, 'N/A', 2) }}</span>
            </div>
          </div>
          <div class="pt-2 text-[11px] text-terminal-accent font-mono font-bold">Tap for full report →</div>
        </button>
      </div>
    </section>

    <!-- ── Dividend Projection — only when the ticker actually pays a dividend ── -->
    <div v-if="!loadingDetail && hasDividendData && projectionData">
      <DividendProjectionTable
        :projection="projectionData"
        :dividend-info="dividendsInfo || detail?.dividends || null"
        :loading="loadingDivs || projectionMutation.isPending.value"
        @update-params="handleUpdateProjectionParams"
      />
    </div>

    <!-- ── News — swipe carousel, cards directly on the background ───────── -->
    <TickerNewsCarousel :symbol="symbol" />

    <!-- ── Projection & Holdings — title on background, shared growth model ── -->
    <div v-if="!loadingDetail" class="space-y-3">
      <!-- Shared growth model: drives BOTH the target-share and holding projections -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <h2 class="text-sm font-bold text-gray-100 uppercase tracking-wider font-mono">Growth &amp; Position</h2>
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] text-gray-500 font-mono uppercase tracking-widest mr-1 hidden sm:inline">Growth model</span>
          <button
            v-for="(sc, idx) in GROWTH_SCENARIOS"
            :key="sc.name"
            type="button"
            @click="sharedScenarioIndex = idx"
            class="px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg border transition-all duration-150"
            :class="sharedScenarioIndex === idx
              ? 'bg-terminal-accent/15 border-terminal-accent text-terminal-accent'
              : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-300'"
          >{{ sc.cagr }}%</button>
        </div>
      </div>

      <!-- Broker filter pills (only when multiple brokers exist) -->
      <div v-if="availableBrokers.length > 1" class="flex items-center gap-1.5 flex-wrap px-1">
        <span class="text-[10px] text-gray-500 font-mono uppercase tracking-widest mr-1">Account</span>
        <button
          v-for="broker in ['ALL', ...availableBrokers]"
          :key="broker"
          type="button"
          @click="selectedBroker = broker"
          class="px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg border transition-all duration-150"
          :class="selectedBroker === broker
            ? 'bg-terminal-accent/15 border-terminal-accent text-terminal-accent'
            : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-300'"
        >{{ broker }}</button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
        <!-- Target Share Projection -->
        <TickerGrowthProjection
          v-if="growthExpanded"
          :symbol="symbol"
          :currency="detail?.ticker.currency"
          :target-shares="detail?.holding?.targetShares || null"
          :scenario-index="sharedScenarioIndex"
        />
        <button
          v-else
          type="button"
          class="w-full border border-white/10 rounded-2xl px-4 py-3.5 flex items-center justify-between cursor-pointer hover:border-terminal-accent/40 transition-colors sw-glass-card text-left"
          @click="growthExpanded = true"
        >
          <span class="text-xs font-bold text-gray-300 font-mono uppercase tracking-wider">Target Share Projection</span>
          <span class="text-[11px] text-terminal-accent font-mono font-bold">▼ expand</span>
        </button>

        <!-- Holdings & Transactions -->
        <TickerUserHoldingsSection
          v-if="holdingsExpanded"
          :symbol="symbol"
          :holding="detail?.holding"
          :transactions="filteredTransactions"
          :currency="detail?.ticker.currency"
          :growth-cagr="sharedCagr"
        />
        <button
          v-else
          type="button"
          class="w-full border border-white/10 rounded-2xl px-4 py-3.5 flex items-center justify-between cursor-pointer hover:border-terminal-accent/40 transition-colors sw-glass-card text-left"
          @click="holdingsExpanded = true"
        >
          <span class="text-xs font-bold text-gray-300 font-mono uppercase tracking-wider">My Holding &amp; Transactions</span>
          <span class="text-[11px] text-terminal-accent font-mono font-bold">▼ expand</span>
        </button>
      </div>

      <!-- Collapse hint when a panel is open -->
      <div v-if="growthExpanded || holdingsExpanded" class="flex items-center gap-2 px-1">
        <button
          v-if="growthExpanded"
          type="button"
          @click="growthExpanded = false"
          class="px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg border border-white/10 bg-white/5 text-gray-400 hover:text-gray-200"
        >▲ Collapse projection</button>
        <button
          v-if="holdingsExpanded"
          type="button"
          @click="holdingsExpanded = false"
          class="px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg border border-white/10 bg-white/5 text-gray-400 hover:text-gray-200"
        >▲ Collapse holdings</button>
      </div>
    </div>

    <!-- ── Journal — note pages on the background; each page opens in a modal ── -->
    <div class="pb-40 sm:pb-12">
      <TickerNotesSection :symbol="symbol" />
    </div>

    <TransactionOverlay v-model="isAddTxOpen" :prefill-symbol="symbol" />

    <StatDetailPanel v-model="isStatPanelOpen" :stat-key="selectedStatKey" :value="selectedStatValue" />

    <FundamentalPeriodModal v-model="isPeriodModalOpen" :period="selectedPeriod" :symbol="symbol" :currency="detail?.ticker.currency" />

    <AlgoDetailModal
      v-model="isAlgoModalOpen"
      :algo="selectedAlgo"
      :metadata="algorithmsMetadata?.[selectedAlgo?.name || '']"
      :currency="detail?.ticker.currency"
    />
  </div>
</template>

<style scoped>
/* Brief highlight when a cache-seeded value is replaced by a live network value. */
.sw-fresh-pulse {
  animation: sw-fresh-pulse-anim 0.7s ease-out;
}
@keyframes sw-fresh-pulse-anim {
  0% { color: var(--color-terminal-accent, #00e599); text-shadow: 0 0 18px rgba(0, 229, 153, 0.6); }
  100% { color: inherit; text-shadow: none; }
}
</style>
