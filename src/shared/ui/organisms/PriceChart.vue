<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, shallowRef } from 'vue';
import { useRouter } from 'vue-router';
import { useBreakpoint } from '../../composables/useBreakpoint';
import { use } from 'echarts/core';
import VChart, { THEME_KEY } from 'vue-echarts';
import { CanvasRenderer } from 'echarts/renderers';
import { CandlestickChart, LineChart, BarChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  AxisPointerComponent,
  LegendComponent,
  DataZoomComponent,
  MarkLineComponent
} from 'echarts/components';
import type { EChartsOption } from 'echarts';
import { provide } from 'vue';
import type { PriceBar, IndicatorSeriesDto, IndicatorPointDto } from '../../api/types';
import { useTickerIndicatorsQuery } from '../../../queries/useTickerIndicatorsQuery';
import { useThemeStore } from '../../../stores/theme';
import IndicatorAnalysisPanel from './IndicatorAnalysisPanel.vue';
import IndicatorRecommendationCards from './IndicatorRecommendationCards.vue';
import AdaptiveOverlay from './AdaptiveOverlay.vue';

use([
  CanvasRenderer,
  CandlestickChart,
  LineChart,
  BarChart,
  GridComponent,
  TooltipComponent,
  AxisPointerComponent,
  LegendComponent,
  DataZoomComponent,
  MarkLineComponent
]);

const props = withDefaults(defineProps<{
  bars: PriceBar[];
  height?: number;
  symbol: string;
  currency?: string;
}>(), { currency: 'USD' });

const currencySymbol = computed(() => {
  switch ((props.currency || '').toUpperCase()) {
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'JPY': return '¥';
    case 'RON': return 'RON';
    default: return props.currency ?? '';
  }
});

const priceLabel = computed(() => {
  const now = new Date();
  const day = now.getUTCDay();
  const hour = now.getUTCHours();
  const marketOpen = day >= 1 && day <= 5 && hour >= 13 && hour < 20;
  return marketOpen ? 'Current price' : 'Last price';
});

const themeStore = useThemeStore();
provide(THEME_KEY, computed(() => (themeStore.mode === 'dark' ? 'dark' : 'default')));

const palette = computed(() => {
  const dark = themeStore.mode === 'dark';
  return {
    up: '#00E599',
    down: '#F43F5E',
    text: dark ? '#94A3B8' : '#475569',
    textStrong: dark ? '#E2E8F0' : '#0F172A',
    grid: dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)',
    axisLine: dark ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.14)',
    bg: 'transparent',
    tooltipBg: dark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.98)',
    tooltipBorder: dark ? 'rgba(255,255,255,0.15)' : 'rgba(15,23,42,0.12)'
  };
});

// ── period filter ────────────────────────────────────────────────────────
// Bars are daily OHLC (no intraday granularity), so "1D"/"5D" just show the most recent
// 1/5 trading-day candles rather than an intraday minute chart.
type Period = '1D' | '5D' | '1M' | '6M' | '1Y' | '3Y' | '5Y';
const selectedPeriod = ref<Period>('1Y');
const periods: Period[] = ['1D', '5D', '1M', '6M', '1Y', '3Y', '5Y'];
const cutoffDays: Record<Period, number> = { '1D': 1, '5D': 5, '1M': 30, '6M': 182, '1Y': 365, '3Y': 1095, '5Y': 1825 };

const filteredBars = computed(() => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - cutoffDays[selectedPeriod.value]);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return props.bars.filter((b) => b.date >= cutoffStr);
});

const latestBar = computed(() => props.bars.at(-1));
const latestVolume = computed(() => {
  const v = latestBar.value?.volume;
  if (!v) return '—';
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(2)}K`;
  return String(v);
});

// ── indicators ────────────────────────────────────────────────────────────
type IndicatorKind = 'sma' | 'ema' | 'bb' | 'rsi' | 'macd' | 'adx' | 'atr' | 'obv';
const PARAMETERLESS_KINDS: IndicatorKind[] = ['macd', 'obv'];
const OSCILLATOR_KINDS: IndicatorKind[] = ['rsi', 'macd', 'adx', 'atr', 'obv'];

interface IndicatorDef {
  key: string;
  kind: IndicatorKind;
  period: number;
  color: string;
}

const PALETTE = ['#38BDF8', '#FBBF24', '#A78BFA', '#F472B6', '#34D399', '#FB923C'];
let paletteIdx = 0;
function nextColor(): string {
  const c = PALETTE[paletteIdx % PALETTE.length] ?? '#38BDF8';
  paletteIdx++;
  return c;
}

const activeIndicators = ref<IndicatorDef[]>([]);
const newIndicatorKind = ref<IndicatorKind>('sma');
const newIndicatorPeriod = ref(20);

function typeString(kind: IndicatorKind, period: number): string {
  return PARAMETERLESS_KINDS.includes(kind) ? kind : `${kind}${period}`;
}

const indicatorTypes = computed(() => activeIndicators.value.map((i) => typeString(i.kind, i.period)));

const { data: indicatorData } = useTickerIndicatorsQuery(computed(() => props.symbol), indicatorTypes);

function buildKey(kind: IndicatorKind, period: number): string {
  return PARAMETERLESS_KINDS.includes(kind) ? kind : `${kind}${period}`;
}
function addIndicator(kind: IndicatorKind, period: number) {
  const effectivePeriod = PARAMETERLESS_KINDS.includes(kind) ? 0 : period;
  const key = buildKey(kind, effectivePeriod);
  if (activeIndicators.value.some((i) => i.key === key)) return;
  activeIndicators.value = [...activeIndicators.value, { key, kind, period: effectivePeriod, color: nextColor() }];
}
function addFromDropdown() { addIndicator(newIndicatorKind.value, newIndicatorPeriod.value); }
function removeIndicator(key: string) {
  activeIndicators.value = activeIndicators.value.filter((i) => i.key !== key);
}
function indicatorLabel(def: IndicatorDef): string {
  if (def.kind === 'bb') return `BB(${def.period})`;
  if (PARAMETERLESS_KINDS.includes(def.kind)) return def.kind.toUpperCase();
  return `${def.kind.toUpperCase()}(${def.period})`;
}

// ── analysis panel ───────────────────────────────────────────────────────
const activePanel = ref<IndicatorDef | null>(null);
const isAnalysisOpen = ref(false);
const isIndicatorPickerOpen = ref(false);
function openAnalysis(def: IndicatorDef) {
  activePanel.value = def;
  isAnalysisOpen.value = true;
}
const activePanelDto = computed(() => {
  if (!activePanel.value || !indicatorData.value) return null;
  return findDto(indicatorData.value, activePanel.value.kind, activePanel.value.period);
});

// ── defensive parsing: backend serializes numbers as strings ────────────
function toNum(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') { const p = parseFloat(v); return Number.isFinite(p) ? p : NaN; }
  return NaN;
}
function findDto(list: IndicatorSeriesDto[], kind: string, period: number): IndicatorSeriesDto | null {
  return list.find((d) => d.type === kind && toNum((d.params as Record<string, unknown>).period ?? 0) === period) ?? null;
}
function seriesXY(points: IndicatorPointDto[], valueKey: string): [string, number | null][] {
  return points.map((p) => {
    const raw = (p.values as Record<string, unknown>)[valueKey];
    const n = toNum(raw);
    return [p.date, Number.isFinite(n) ? n : null];
  });
}

// ── ECharts option builder ───────────────────────────────────────────────
const oscillatorDefs = computed(() => activeIndicators.value.filter((i) => OSCILLATOR_KINDS.includes(i.kind)));
const overlayDefs = computed(() => activeIndicators.value.filter((i) => !OSCILLATOR_KINDS.includes(i.kind)));

interface Pane { top: string; height: string; }
const panes = computed<Pane[]>(() => {
  const oscCount = oscillatorDefs.value.length;
  if (oscCount === 0) return [{ top: '2%', height: '94%' }];
  const totalOscHeight = Math.min(50, oscCount * 16);
  const priceHeight = 96 - totalOscHeight - 4;
  const oscHeightEach = totalOscHeight / oscCount;
  const result: Pane[] = [{ top: '2%', height: `${priceHeight}%` }];
  let cursor = 2 + priceHeight + 3;
  for (let i = 0; i < oscCount; i++) {
    result.push({ top: `${cursor}%`, height: `${oscHeightEach}%` });
    cursor += oscHeightEach + 1;
  }
  return result;
});

const chartOption = computed<EChartsOption>(() => {
  const p = palette.value;
  const bars = filteredBars.value;
  const dates = bars.map((b) => b.date);
  const candles = bars.map((b) => [toNum(b.open), toNum(b.close), toNum(b.low), toNum(b.high)]);

  const paneList = panes.value;
  const grids = paneList.map((pane) => ({
    // containLabel stays false so all panes' x-axis categories line up pixel-for-pixel (only the
    // bottom pane shows labels) — left/right are wide enough to fully contain the first/last
    // category label's text instead of letting it get clipped at the chart's edge.
    left: 40,
    right: 56,
    top: pane.top,
    height: pane.height,
    borderColor: p.axisLine,
    containLabel: false
  }));

  const xAxes: EChartsOption['xAxis'] = paneList.map((_, idx) => ({
    type: 'category' as const,
    gridIndex: idx,
    data: dates,
    boundaryGap: true,
    axisLine: { lineStyle: { color: p.axisLine } },
    axisTick: { show: idx === paneList.length - 1 },
    axisLabel: { show: idx === paneList.length - 1, color: p.text, fontSize: 10 },
    splitLine: { show: false },
    axisPointer: { z: 100, label: { show: idx === paneList.length - 1 } }
  }));

  const yAxes: EChartsOption['yAxis'] = paneList.map((_, idx) => ({
    scale: true,
    gridIndex: idx,
    position: 'right' as const,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: p.text, fontSize: 10, inside: false, margin: 6 },
    splitLine: { lineStyle: { color: p.grid } },
    splitNumber: idx === 0 ? 6 : 3
  }));

  const series: EChartsOption['series'] = [
    {
      name: 'Price',
      type: 'candlestick',
      xAxisIndex: 0,
      yAxisIndex: 0,
      data: candles,
      itemStyle: {
        color: p.up,
        color0: p.down,
        borderColor: p.up,
        borderColor0: p.down
      }
    }
  ];

  // Overlays on price pane
  const dto = indicatorData.value ?? [];
  for (const def of overlayDefs.value) {
    const matched = findDto(dto, def.kind, def.period);
    if (!matched || matched.error || matched.points.length === 0) continue;

    if (def.kind === 'bb') {
      series.push({
        name: `${indicatorLabel(def)} upper`, type: 'line', xAxisIndex: 0, yAxisIndex: 0,
        showSymbol: false, smooth: false, lineStyle: { color: def.color, width: 1, type: 'dashed' },
        data: seriesXY(matched.points, 'upper')
      });
      series.push({
        name: `${indicatorLabel(def)} middle`, type: 'line', xAxisIndex: 0, yAxisIndex: 0,
        showSymbol: false, smooth: false, lineStyle: { color: def.color, width: 1 },
        data: seriesXY(matched.points, 'middle')
      });
      series.push({
        name: `${indicatorLabel(def)} lower`, type: 'line', xAxisIndex: 0, yAxisIndex: 0,
        showSymbol: false, smooth: false, lineStyle: { color: def.color, width: 1, type: 'dashed' },
        data: seriesXY(matched.points, 'lower')
      });
    } else {
      series.push({
        name: indicatorLabel(def), type: 'line', xAxisIndex: 0, yAxisIndex: 0,
        showSymbol: false, smooth: false, lineStyle: { color: def.color, width: 2 },
        data: seriesXY(matched.points, 'value')
      });
    }
  }

  // Oscillators on their own panes
  oscillatorDefs.value.forEach((def, i) => {
    const paneIdx = 1 + i;
    const matched = findDto(dto, def.kind, def.period);
    if (!matched || matched.error || matched.points.length === 0) return;

    if (def.kind === 'macd') {
      series.push({
        name: 'MACD line', type: 'line', xAxisIndex: paneIdx, yAxisIndex: paneIdx,
        showSymbol: false, lineStyle: { color: def.color, width: 1.5 },
        data: seriesXY(matched.points, 'line')
      });
      series.push({
        name: 'Signal', type: 'line', xAxisIndex: paneIdx, yAxisIndex: paneIdx,
        showSymbol: false, lineStyle: { color: '#F87171', width: 1 },
        data: seriesXY(matched.points, 'signal')
      });
      series.push({
        name: 'Histogram', type: 'bar', xAxisIndex: paneIdx, yAxisIndex: paneIdx,
        data: matched.points.map((pt) => {
          const h = toNum((pt.values as Record<string, unknown>).histogram);
          return {
            value: [pt.date, Number.isFinite(h) ? h : 0],
            itemStyle: { color: h >= 0 ? 'rgba(0,229,153,0.5)' : 'rgba(244,63,94,0.5)' }
          };
        })
      });
    } else if (def.kind === 'adx') {
      series.push({
        name: 'ADX', type: 'line', xAxisIndex: paneIdx, yAxisIndex: paneIdx,
        showSymbol: false, lineStyle: { color: def.color, width: 1.5 },
        data: seriesXY(matched.points, 'adx')
      });
      series.push({
        name: '+DI', type: 'line', xAxisIndex: paneIdx, yAxisIndex: paneIdx,
        showSymbol: false, lineStyle: { color: '#34D399', width: 1 },
        data: seriesXY(matched.points, 'plusDi')
      });
      series.push({
        name: '-DI', type: 'line', xAxisIndex: paneIdx, yAxisIndex: paneIdx,
        showSymbol: false, lineStyle: { color: '#F87171', width: 1 },
        data: seriesXY(matched.points, 'minusDi')
      });
    } else {
      series.push({
        name: indicatorLabel(def), type: 'line', xAxisIndex: paneIdx, yAxisIndex: paneIdx,
        showSymbol: false, lineStyle: { color: def.color, width: 1.5 },
        data: seriesXY(matched.points, 'value')
      });
    }
  });

  return {
    backgroundColor: p.bg,
    animation: false,
    grid: grids,
    xAxis: xAxes,
    yAxis: yAxes,
    axisPointer: {
      link: [{ xAxisIndex: 'all' as const }],
      lineStyle: { color: p.text, opacity: 0.4 },
      label: { backgroundColor: p.text, color: themeStore.mode === 'dark' ? '#0F172A' : '#F8FAFC' }
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: p.tooltipBg,
      borderColor: p.tooltipBorder,
      borderWidth: 1,
      textStyle: { color: p.textStrong, fontSize: 11, fontFamily: 'ui-monospace, monospace' },
      padding: [8, 12],
      axisPointer: { type: 'cross' }
    },
    dataZoom: [
      { type: 'inside', xAxisIndex: paneList.map((_, i) => i), start: 60, end: 100 }
    ],
    series
  };
});

// ── fullscreen (mobile landscape) ───────────────────────────────────────
const isFullscreen = ref(false);
const chartWrapper = ref<HTMLElement | null>(null);
const router = useRouter();
const { isMobile } = useBreakpoint();

async function toggleFullscreen() {
  // Mobile: CSS/Fullscreen-API "fullscreen" on the small inline chart is cramped and fiddly to use
  // one-handed — send mobile users to the dedicated landscape chart page instead, which has the
  // whole viewport and is built for horizontal use.
  if (isMobile.value) {
    router.push({ name: 'ticker-chart', params: { symbol: props.symbol } });
    return;
  }

  const el = chartWrapper.value;
  if (!el) return;
  const anyEl = el as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
  const anyDoc = document as Document & {
    webkitExitFullscreen?: () => Promise<void>;
    webkitFullscreenElement?: Element | null;
  };

  if (!document.fullscreenElement && !anyDoc.webkitFullscreenElement) {
    try {
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (anyEl.webkitRequestFullscreen) await anyEl.webkitRequestFullscreen();
      else { isFullscreen.value = true; return; } // CSS fallback for iOS Safari
    } catch { isFullscreen.value = true; return; }
    try {
      const orient = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
      await orient.lock?.('landscape');
    } catch { /* ignore */ }
  } else {
    if (document.exitFullscreen) await document.exitFullscreen();
    else if (anyDoc.webkitExitFullscreen) await anyDoc.webkitExitFullscreen();
    isFullscreen.value = false;
  }
}
function onFullscreenChange() {
  const anyDoc = document as Document & { webkitFullscreenElement?: Element | null };
  isFullscreen.value = Boolean(document.fullscreenElement || anyDoc.webkitFullscreenElement);
  if (!isFullscreen.value) {
    try { (screen.orientation as ScreenOrientation & { unlock?: () => void }).unlock?.(); } catch { /* ignore */ }
  }
  setTimeout(() => chartRef.value?.resize(), 80);
}

const chartRef = shallowRef<InstanceType<typeof VChart> | null>(null);
const handleResize = () => chartRef.value?.resize();

onMounted(() => {
  window.addEventListener('resize', handleResize);
  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange as EventListener);
});
onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  document.removeEventListener('fullscreenchange', onFullscreenChange);
  document.removeEventListener('webkitfullscreenchange', onFullscreenChange as EventListener);
});

const chartHeight = computed(() => {
  const base = props.height ?? 380;
  const oscCount = oscillatorDefs.value.length;
  return isFullscreen.value ? undefined : base + oscCount * 70;
});

watch(themeStore, () => { setTimeout(() => chartRef.value?.resize(), 30); });
</script>

<template>
  <div
    ref="chartWrapper"
    class="w-full border border-white/10 rounded-3xl overflow-hidden sw-glass-card p-3 sm:p-4 shadow-lg select-none relative"
    :class="isFullscreen ? 'bg-terminal-bg h-screen w-screen fixed inset-0 z-50 flex flex-col overflow-y-auto' : ''"
  >
    <!-- Price band (centered) -->
    <div class="flex flex-col items-center pb-2 leading-tight">
      <div class="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest">{{ priceLabel }}</div>
      <div v-if="latestBar" class="text-lg sm:text-xl font-mono font-black text-gray-100 whitespace-nowrap">
        {{ parseFloat(latestBar.close).toFixed(2) }}
        <span class="text-xs font-bold text-gray-400 ml-1">{{ currencySymbol }}</span>
      </div>
    </div>

    <!-- Toolbar row: [+ Indicator] [period pills] [fullscreen] — compact on all sizes -->
    <div class="flex items-center gap-1.5 px-1 pb-2">
      <button
        type="button"
        class="shrink-0 flex items-center gap-1 px-2.5 h-8 rounded-lg border border-terminal-accent/40 bg-terminal-accent/10 text-terminal-accent text-xs font-mono font-bold hover:bg-terminal-accent/20 active:scale-95 transition-all"
        @click="isIndicatorPickerOpen = true"
      >
        <span class="text-sm leading-none">+</span>
        <span>Indicator</span>
      </button>

      <span
        v-if="activeIndicators.length > 0"
        class="shrink-0 text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider px-1"
      >
        {{ activeIndicators.length }} active
      </span>

      <div class="flex-1" />

      <div class="shrink-0 flex items-center bg-terminal-bg/60 border border-white/10 rounded-lg p-0.5 max-w-[220px] sm:max-w-none overflow-x-auto scrollbar-none">
        <button
          v-for="p in periods"
          :key="p"
          class="shrink-0 min-w-[26px] h-7 px-1 text-[10px] font-mono font-bold rounded-md transition-all duration-150"
          :class="selectedPeriod === p
            ? 'bg-terminal-accent/20 text-terminal-accent shadow-sm'
            : 'text-gray-400 hover:text-gray-200'"
          @click="selectedPeriod = p"
        >{{ p }}</button>
      </div>

      <button
        type="button"
        class="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border border-white/10 bg-terminal-bg/60 text-gray-300 hover:text-terminal-accent hover:border-terminal-accent/40 transition-colors active:scale-95"
        :title="isFullscreen ? 'Exit full screen' : 'View in full screen'"
        @click="toggleFullscreen"
      >{{ isFullscreen ? '✕' : '⤢' }}</button>
    </div>

    <!-- Active indicator chips — wrap on all sizes so nothing is hidden -->
    <div v-if="activeIndicators.length > 0" class="flex flex-wrap gap-1.5 px-1 pb-2.5">
      <span
        v-for="def in activeIndicators"
        :key="def.key"
        class="inline-flex items-center gap-1 h-8 pl-2.5 pr-1 rounded-lg border text-[11px] font-mono font-bold cursor-pointer active:scale-95 transition-all"
        :style="{ borderColor: def.color + '70', color: def.color, backgroundColor: def.color + '18' }"
        @click="openAnalysis(def)"
      >
        {{ indicatorLabel(def) }}
        <button
          type="button"
          class="w-5 h-5 flex items-center justify-center rounded hover:bg-white/15 text-current opacity-80"
          @click.stop="removeIndicator(def.key)"
          aria-label="Remove indicator"
        >✕</button>
      </span>
    </div>

    <!-- Indicator picker (bottom sheet on mobile, dialog on desktop) -->
    <AdaptiveOverlay v-model="isIndicatorPickerOpen" title="Add indicator" :max-width="480">
      <div class="space-y-4">
        <div>
          <label class="block text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider mb-2">Type</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="kind in (['sma','ema','bb','rsi','macd','adx','atr','obv'] as IndicatorKind[])"
              :key="kind"
              type="button"
              class="h-12 rounded-xl border text-sm font-mono font-bold transition-all active:scale-95"
              :class="newIndicatorKind === kind
                ? 'border-terminal-accent/60 bg-terminal-accent/15 text-terminal-accent'
                : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/20'"
              @click="newIndicatorKind = kind"
            >{{ kind === 'bb' ? 'Bollinger' : kind === 'macd' ? 'MACD (12/26/9)' : kind.toUpperCase() }}</button>
          </div>
        </div>

        <div v-if="!['macd', 'obv'].includes(newIndicatorKind)">
          <label class="block text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider mb-2">Period</label>
          <div class="flex items-center gap-2">
            <input
              v-model.number="newIndicatorPeriod"
              type="number" min="2" max="500"
              class="w-24 h-12 bg-terminal-bg border border-white/10 rounded-xl px-3 text-base font-mono text-gray-100 focus:outline-none focus:border-terminal-accent text-center"
            />
            <div class="flex flex-wrap gap-1.5 flex-1">
              <button
                v-for="q in [20, 50, 100, 200]"
                :key="q"
                type="button"
                class="h-9 px-3 rounded-lg text-xs font-mono font-bold border transition-all active:scale-95"
                :class="newIndicatorPeriod === q
                  ? 'border-terminal-accent/50 text-terminal-accent bg-terminal-accent/10'
                  : 'border-white/10 text-gray-400 hover:text-gray-200'"
                @click="newIndicatorPeriod = q"
              >{{ q }}</button>
            </div>
          </div>
        </div>
      </div>
      <template #actions>
        <button
          type="button"
          class="flex-1 h-11 rounded-xl border border-white/10 bg-white/5 text-sm font-mono font-bold text-gray-300 hover:text-gray-100 transition-colors"
          @click="isIndicatorPickerOpen = false"
        >Cancel</button>
        <button
          type="button"
          class="flex-1 h-11 rounded-xl bg-terminal-accent text-terminal-bg text-sm font-mono font-bold hover:brightness-110 active:scale-95 transition-all"
          @click="addFromDropdown(); isIndicatorPickerOpen = false"
        >+ Add to chart</button>
      </template>
    </AdaptiveOverlay>

    <div :class="isFullscreen ? 'flex-1 relative min-h-[360px]' : 'relative'">
      <VChart
        ref="chartRef"
        :option="chartOption"
        :autoresize="true"
        :style="isFullscreen ? { width: '100%', height: '100%' } : { width: '100%', height: `${chartHeight}px` }"
      />
    </div>

    <!-- Recommendation cards for each active indicator, right below the chart -->
    <IndicatorRecommendationCards
      v-if="activeIndicators.length > 0"
      :indicators="activeIndicators"
      :dtos="indicatorData ?? []"
      class="mt-3"
      @open="(key) => { const def = activeIndicators.find((i) => i.key === key); if (def) openAnalysis(def); }"
    />

    <IndicatorAnalysisPanel
      v-if="activePanel"
      v-model="isAnalysisOpen"
      :kind="activePanel.kind"
      :period="activePanel.period"
      :color="activePanel.color"
      :dto="activePanelDto"
    />
  </div>
</template>
