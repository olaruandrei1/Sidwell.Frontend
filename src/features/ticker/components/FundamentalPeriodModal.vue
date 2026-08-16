<script setup lang="ts">
import { computed } from 'vue';
import AdaptiveOverlay from '../../../shared/ui/organisms/AdaptiveOverlay.vue';
import type { FundamentalPeriod } from '../../../shared/api/types';

const props = defineProps<{
  modelValue: boolean;
  period: FundamentalPeriod | null;
  symbol: string;
  currency?: string | undefined;
}>();

const emit = defineEmits<{ 'update:modelValue': [val: boolean] }>();

const num = (v: string | number | null | undefined): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
};

const fmtLarge = (v: string | number | null | undefined): string => {
  const n = num(v);
  if (n === null) return 'N/A';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toFixed(2);
};

const title = computed(() =>
  props.period ? `${props.symbol} · ${props.period.asOfDate?.slice(0, 7)} ${props.period.period}` : 'Fundamentals'
);

// Income-statement bars for the period
const bars = computed(() => {
  const p = props.period;
  if (!p) return [];
  const entries = [
    { label: 'Revenue', value: num(p.revenue), color: '#60a5fa' },
    { label: 'Gross Profit', value: num(p.grossProfit), color: '#34d399' },
    { label: 'EBIT', value: num(p.ebit), color: '#a78bfa' },
    { label: 'Net Income', value: num(p.netIncome), color: '#f59e0b' },
  ].filter((e) => e.value !== null) as { label: string; value: number; color: string }[];
  const max = Math.max(1, ...entries.map((e) => Math.abs(e.value)));
  return entries.map((e) => ({ ...e, pct: Math.max(2, (Math.abs(e.value) / max) * 100) }));
});

const rows = computed(() => {
  const p = props.period;
  if (!p) return [];
  return [
    { label: 'Revenue', value: fmtLarge(p.revenue) },
    { label: 'Gross Profit', value: fmtLarge(p.grossProfit) },
    { label: 'EBIT', value: fmtLarge(p.ebit) },
    { label: 'Net Income', value: fmtLarge(p.netIncome) },
    { label: 'EPS', value: num(p.eps) !== null ? num(p.eps)!.toFixed(2) : 'N/A' },
    { label: 'Total Assets', value: fmtLarge(p.totalAssets) },
    { label: 'Total Liabilities', value: fmtLarge(p.totalLiabilities) },
    { label: 'Total Equity', value: fmtLarge(p.totalEquity) },
    { label: 'Shares Outstanding', value: p.sharesOutstanding ? fmtLarge(String(p.sharesOutstanding)) : 'N/A' },
  ];
});
</script>

<template>
  <AdaptiveOverlay
    :model-value="modelValue"
    :title="title"
    :max-width="600"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="period" class="space-y-5 font-mono text-xs">
      <div class="flex items-center justify-between p-3 bg-terminal-bg rounded-xl border border-terminal-border">
        <span class="text-gray-400 text-[11px] uppercase tracking-wider">Reporting Period</span>
        <span
          class="px-2 py-0.5 rounded text-[11px] font-bold"
          :class="period.period === 'FY' ? 'bg-terminal-accent/20 text-terminal-accent' : 'bg-gray-700/60 text-gray-300'"
        >{{ period.asOfDate?.slice(0, 10) }} · {{ period.period }}</span>
      </div>

      <!-- Income-statement chart for this period -->
      <div v-if="bars.length" class="space-y-2">
        <div class="text-[11px] font-bold text-terminal-accent uppercase tracking-wider">Income Statement ({{ currency || '' }})</div>
        <div class="space-y-2 p-3 bg-terminal-surface/60 rounded-xl border border-terminal-border">
          <div v-for="b in bars" :key="b.label" class="space-y-1">
            <div class="flex items-center justify-between text-[11px]">
              <span class="text-gray-400">{{ b.label }}</span>
              <span class="font-bold text-gray-100">{{ fmtLarge(b.value) }}</span>
            </div>
            <div class="h-2 w-full bg-white/10 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all duration-500" :style="{ width: b.pct + '%', backgroundColor: b.color }" />
            </div>
          </div>
        </div>
      </div>

      <!-- All SEC fields -->
      <div class="space-y-1">
        <div class="text-[11px] font-bold text-terminal-accent uppercase tracking-wider">SEC / EDGAR Figures</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div
            v-for="r in rows"
            :key="r.label"
            class="flex items-center justify-between p-2.5 bg-terminal-bg rounded-lg border border-terminal-border/50"
          >
            <span class="text-gray-400 text-[11px] uppercase tracking-wider">{{ r.label }}</span>
            <span class="font-bold text-gray-100">{{ r.value }}</span>
          </div>
        </div>
      </div>
    </div>
  </AdaptiveOverlay>
</template>
