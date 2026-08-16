<script setup lang="ts">
import { computed } from 'vue';
import AdaptiveOverlay from '../../../shared/ui/organisms/AdaptiveOverlay.vue';

const props = defineProps<{
  modelValue: boolean;
  statKey: string | null;
  value?: string | null | undefined;
}>();

const emit = defineEmits<{
  'update:modelValue': [val: boolean];
}>();

interface StatInfo {
  label: string;
  what: string;
  how: string;
  read: string;
}

const CATALOG: Record<string, StatInfo> = {
  peTrailing: {
    label: 'P/E Trailing',
    what: 'Price-to-Earnings on the last 12 months of actual earnings.',
    how: 'Share price ÷ trailing twelve-month earnings per share.',
    read: 'Lower can mean cheaper, but a high P/E is common for fast growers. Compare within the same sector.',
  },
  priceToBook: {
    label: 'P/B Ratio',
    what: 'Price relative to the company’s net accounting (book) value.',
    how: 'Share price ÷ book value per share.',
    read: 'Below 1 can signal undervaluation or trouble. Asset-light tech firms naturally trade high.',
  },
  roeTtm: {
    label: 'ROE TTM',
    what: 'Return on Equity — profit generated per unit of shareholder capital.',
    how: 'Trailing net income ÷ average shareholder equity.',
    read: 'Higher is better; consistently >15% signals an efficient, profitable business.',
  },
  beta: {
    label: 'Beta (1Y)',
    what: 'How much the stock moves relative to the broad market.',
    how: 'Regression of the stock’s returns against the index over ~1 year.',
    read: '1.0 = moves with the market. Above 1 = more volatile; below 1 = steadier.',
  },
  debtToEquity: {
    label: 'D/E Ratio',
    what: 'Leverage — how much debt the company carries per unit of equity.',
    how: 'Total debt ÷ shareholder equity.',
    read: 'Lower is safer. High leverage amplifies both gains and risk in a downturn.',
  },
  revenueGrowthTtmYoy: {
    label: 'Revenue Growth',
    what: 'Year-over-year growth of trailing twelve-month revenue.',
    how: 'This TTM revenue ÷ prior-year TTM revenue − 1.',
    read: 'Sustained high growth supports a premium valuation; decelerating growth is a warning.',
  },
  evToEbitda: {
    label: 'EV/EBITDA',
    what: 'Enterprise value relative to operating cash earnings.',
    how: '(Market cap + debt − cash) ÷ EBITDA.',
    read: 'A capital-structure-neutral valuation. Lower is cheaper; compare within the sector.',
  },
  targetOneYear: {
    label: '1Y Target',
    what: 'Analysts’ consensus 12-month price target.',
    how: 'Mean of covering analysts’ published price targets.',
    read: 'Compare to the current price for implied upside/downside — a sentiment gauge, not a guarantee.',
  },
  marketCap: {
    label: 'Market Cap',
    what: 'Total market value of all outstanding shares.',
    how: 'Share price × shares outstanding.',
    read: 'Size bucket: mega/large caps are steadier, small caps more volatile but higher-growth.',
  },
  volume: {
    label: 'Volume',
    what: 'Number of shares traded in the latest session.',
    how: 'Sum of shares exchanged during the trading day.',
    read: 'Higher volume means more liquidity and tighter spreads; spikes often accompany news.',
  },
  dividendYield: {
    label: 'Dividend Yield',
    what: 'Annual dividend income relative to the share price.',
    how: 'Forward annual dividend per share ÷ share price.',
    read: 'Income return. Very high yields can signal risk of a cut — check payout sustainability.',
  },
  earningsDate: {
    label: 'Earnings Date',
    what: 'Next scheduled quarterly earnings release.',
    how: 'Company-announced or estimated reporting date.',
    read: 'Expect elevated volatility around this date as results reset expectations.',
  },
  fiftyTwoWeekLow: {
    label: '52-Week Low',
    what: 'Lowest traded price over the past year.',
    how: 'Minimum daily close across the trailing 52 weeks.',
    read: 'A reference for the bottom of the recent range and potential support.',
  },
  fiftyTwoWeekHigh: {
    label: '52-Week High',
    what: 'Highest traded price over the past year.',
    how: 'Maximum daily close across the trailing 52 weeks.',
    read: 'A reference for the top of the recent range and potential resistance.',
  },
};

const info = computed<StatInfo | null>(() => (props.statKey ? CATALOG[props.statKey] ?? null : null));
</script>

<template>
  <AdaptiveOverlay
    :model-value="modelValue"
    :title="info?.label || 'Indicator'"
    :max-width="560"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="info" class="space-y-4 font-mono text-xs">
      <div class="flex items-center justify-between p-3 bg-terminal-bg rounded-xl border border-terminal-border">
        <span class="text-gray-400 text-[11px] uppercase tracking-wider">Current Value</span>
        <span class="text-lg font-black text-terminal-accent">{{ value ?? 'N/A' }}</span>
      </div>

      <div class="space-y-1">
        <div class="text-[11px] font-bold text-terminal-accent uppercase tracking-wider">What it is</div>
        <p class="p-3 bg-terminal-surface/60 rounded-xl border border-terminal-border text-gray-200 font-sans">{{ info.what }}</p>
      </div>

      <div class="space-y-1">
        <div class="text-[11px] font-bold text-terminal-accent uppercase tracking-wider">How it’s computed</div>
        <p class="p-3 bg-terminal-bg rounded-xl border border-terminal-border text-purple-300 font-sans">{{ info.how }}</p>
      </div>

      <div class="space-y-1">
        <div class="text-[11px] font-bold text-terminal-accent uppercase tracking-wider">How to read it</div>
        <p class="p-3 bg-terminal-surface/60 rounded-xl border border-terminal-border text-gray-200 font-sans">{{ info.read }}</p>
      </div>
    </div>
  </AdaptiveOverlay>
</template>
