<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { createChart, type IChartApi, type ISeriesApi, type MouseEventParams, ColorType, LineStyle } from 'lightweight-charts';

type AnySeries = ISeriesApi<'Line'> | ISeriesApi<'Histogram'>;
import type { PriceBar } from '../../api/types';
import { useTickerIndicatorsQuery } from '../../../queries/useTickerIndicatorsQuery';
import IndicatorAnalysisPanel from './IndicatorAnalysisPanel.vue';

const props = defineProps<{
  bars: PriceBar[];
  height?: number;
  symbol: string;
}>();

type Period = '1Y' | '3Y' | '5Y';
const selectedPeriod = ref<Period>('1Y');
const periods: Period[] = ['1Y', '3Y', '5Y'];

const cutoffDays: Record<Period, number> = { '1Y': 365, '3Y': 1095, '5Y': 1825 };

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
function addFromDropdown() {
  addIndicator(newIndicatorKind.value, newIndicatorPeriod.value);
}
function removeIndicator(key: string) {
  activeIndicators.value = activeIndicators.value.filter((i) => i.key !== key);
  removeIndicatorSeries(key);
}
function indicatorLabel(def: IndicatorDef): string {
  if (def.kind === 'bb') return `BB(${def.period})`;
  if (PARAMETERLESS_KINDS.includes(def.kind)) return def.kind.toUpperCase();
  return `${def.kind.toUpperCase()}(${def.period})`;
}

const activePanel = ref<IndicatorDef | null>(null);
const isAnalysisOpen = ref(false);
function openAnalysis(def: IndicatorDef) {
  activePanel.value = def;
  isAnalysisOpen.value = true;
}
const activePanelDto = computed(() => {
  if (!activePanel.value || !indicatorData.value) return null;
  return indicatorData.value.find((d) => d.type === activePanel.value!.kind && (d.params.period ?? 0) === activePanel.value!.period) ?? null;
});

// ── chart ─────────────────────────────────────────────────────────────────
const chartContainer = ref<HTMLElement | null>(null);
const chartWrapper = ref<HTMLElement | null>(null);
let chart: IChartApi | null = null;
let candleSeries: ISeriesApi<'Candlestick'> | null = null;
let volumeSeries: ISeriesApi<'Histogram'> | null = null;
const indicatorSeriesMap = new Map<string, AnySeries[]>();

const renderChart = () => {
  if (!chartContainer.value) return;

  if (chart) {
    chart.remove();
    chart = null;
    indicatorSeriesMap.clear();
  }

  chart = createChart(chartContainer.value, {
    height: props.height || 360,
    layout: {
      background: { type: ColorType.Solid, color: '#111827' },
      textColor: '#94A3B8'
    },
    grid: {
      vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
      horzLines: { color: 'rgba(255, 255, 255, 0.05)' }
    },
    timeScale: {
      borderColor: 'rgba(255, 255, 255, 0.1)',
      timeVisible: true,
      secondsVisible: false
    },
    rightPriceScale: {
      borderColor: 'rgba(255, 255, 255, 0.1)'
    }
  });

  candleSeries = chart.addCandlestickSeries({
    upColor: '#00E599',
    downColor: '#F43F5E',
    borderVisible: false,
    wickUpColor: '#00E599',
    wickDownColor: '#F43F5E'
  });

  volumeSeries = chart.addHistogramSeries({
    color: '#374151',
    priceFormat: { type: 'volume' },
    priceScaleId: ''
  });
  volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

  chart.subscribeCrosshairMove(handleCrosshairMove);

  updateSeriesData();
  renderIndicators();
};

const updateSeriesData = () => {
  const bars = filteredBars.value;

  const formattedCandles = bars.map((bar) => ({
    time: bar.date,
    open: parseFloat(bar.open),
    high: parseFloat(bar.high),
    low: parseFloat(bar.low),
    close: parseFloat(bar.close)
  }));

  const formattedVolumes = bars.map((bar) => {
    const isUp = parseFloat(bar.close) >= parseFloat(bar.open);
    return {
      time: bar.date,
      value: bar.volume,
      color: isUp ? 'rgba(0, 229, 153, 0.25)' : 'rgba(244, 63, 94, 0.25)'
    };
  });

  if (candleSeries && formattedCandles.length > 0)
    candleSeries.setData(formattedCandles as unknown as Parameters<ISeriesApi<'Candlestick'>['setData']>[0]);
  if (volumeSeries && formattedVolumes.length > 0)
    volumeSeries.setData(formattedVolumes as unknown as Parameters<ISeriesApi<'Histogram'>['setData']>[0]);

  chart?.timeScale().fitContent();
};

function removeIndicatorSeries(key: string) {
  const seriesArr = indicatorSeriesMap.get(key);
  if (!seriesArr) return;
  seriesArr.forEach((s) => {
    try { chart?.removeSeries(s); } catch { /* series already gone */ }
  });
  indicatorSeriesMap.delete(key);
}

function renderIndicators() {
  if (!chart || !indicatorData.value) return;

  for (const def of activeIndicators.value) {
    const dto = indicatorData.value.find((d) => d.type === def.kind && (d.params.period ?? 0) === def.period);
    removeIndicatorSeries(def.key);
    if (!dto || dto.error || dto.points.length === 0) continue;

    if (OSCILLATOR_KINDS.includes(def.kind) && def.kind !== 'macd') {
      const s = chart.addLineSeries({
        color: def.color,
        lineWidth: 1,
        priceScaleId: `${def.kind}-${def.key}`,
        priceLineVisible: false,
        lastValueVisible: false
      });
      s.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

      if (def.kind === 'adx') {
        const plusDi = chart.addLineSeries({ color: '#34D399', lineWidth: 1, priceScaleId: `adx-${def.key}`, priceLineVisible: false, lastValueVisible: false });
        const minusDi = chart.addLineSeries({ color: '#F87171', lineWidth: 1, priceScaleId: `adx-${def.key}`, priceLineVisible: false, lastValueVisible: false });
        s.setData(dto.points.map((p) => ({ time: p.date, value: p.values.adx })) as Parameters<ISeriesApi<'Line'>['setData']>[0]);
        plusDi.setData(dto.points.map((p) => ({ time: p.date, value: p.values.plusDi })) as Parameters<ISeriesApi<'Line'>['setData']>[0]);
        minusDi.setData(dto.points.map((p) => ({ time: p.date, value: p.values.minusDi })) as Parameters<ISeriesApi<'Line'>['setData']>[0]);
        indicatorSeriesMap.set(def.key, [s, plusDi, minusDi]);
      } else {
        s.setData(dto.points.map((p) => ({ time: p.date, value: p.values.value })) as Parameters<ISeriesApi<'Line'>['setData']>[0]);
        indicatorSeriesMap.set(def.key, [s]);
      }
    } else if (def.kind === 'macd') {
      const line = chart.addLineSeries({ color: def.color, lineWidth: 2, priceScaleId: `macd-${def.key}`, priceLineVisible: false, lastValueVisible: false });
      const signal = chart.addLineSeries({ color: '#F87171', lineWidth: 1, priceScaleId: `macd-${def.key}`, priceLineVisible: false, lastValueVisible: false });
      const hist = chart.addHistogramSeries({ priceScaleId: `macd-${def.key}`, priceLineVisible: false, lastValueVisible: false });
      line.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
      line.setData(dto.points.map((p) => ({ time: p.date, value: p.values.line })) as Parameters<ISeriesApi<'Line'>['setData']>[0]);
      signal.setData(dto.points.map((p) => ({ time: p.date, value: p.values.signal })) as Parameters<ISeriesApi<'Line'>['setData']>[0]);
      hist.setData(
        dto.points.map((p) => ({
          time: p.date,
          value: p.values.histogram ?? 0,
          color: (p.values.histogram ?? 0) >= 0 ? 'rgba(0, 229, 153, 0.5)' : 'rgba(244, 63, 94, 0.5)'
        })) as Parameters<ISeriesApi<'Histogram'>['setData']>[0]
      );
      indicatorSeriesMap.set(def.key, [line, signal, hist]);
    } else if (def.kind === 'bb') {
      const upper = chart.addLineSeries({ color: def.color, lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false });
      const middle = chart.addLineSeries({ color: def.color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
      const lower = chart.addLineSeries({ color: def.color, lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false });
      upper.setData(dto.points.map((p) => ({ time: p.date, value: p.values.upper })) as Parameters<ISeriesApi<'Line'>['setData']>[0]);
      middle.setData(dto.points.map((p) => ({ time: p.date, value: p.values.middle })) as Parameters<ISeriesApi<'Line'>['setData']>[0]);
      lower.setData(dto.points.map((p) => ({ time: p.date, value: p.values.lower })) as Parameters<ISeriesApi<'Line'>['setData']>[0]);
      indicatorSeriesMap.set(def.key, [upper, middle, lower]);
    } else {
      const s = chart.addLineSeries({ color: def.color, lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
      s.setData(dto.points.map((p) => ({ time: p.date, value: p.values.value })) as Parameters<ISeriesApi<'Line'>['setData']>[0]);
      indicatorSeriesMap.set(def.key, [s]);
    }
  }
}

// ── crosshair tooltip ────────────────────────────────────────────────────
interface CrosshairInfo {
  x: number;
  y: number;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: string;
  indicatorRows: { label: string; value: string; color: string }[];
}
const crosshair = ref<CrosshairInfo | null>(null);

function formatTime(time: unknown): string {
  if (typeof time === 'string') return time;
  if (time && typeof time === 'object' && 'year' in (time as Record<string, unknown>)) {
    const t = time as { year: number; month: number; day: number };
    return `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`;
  }
  return String(time ?? '');
}
function formatVol(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(2)}K`;
  return String(v);
}

function handleCrosshairMove(param: MouseEventParams) {
  if (!param.point || !param.time || !candleSeries) {
    crosshair.value = null;
    return;
  }
  const candle = param.seriesData.get(candleSeries) as { open: number; high: number; low: number; close: number } | undefined;
  const vol = volumeSeries ? (param.seriesData.get(volumeSeries) as { value: number } | undefined) : undefined;
  if (!candle) {
    crosshair.value = null;
    return;
  }

  const suffixesByKind: Record<string, string[]> = {
    bb: ['U', 'M', 'L'],
    adx: ['ADX', '+DI', '-DI'],
    macd: ['Line', 'Signal', 'Hist']
  };

  const indicatorRows: { label: string; value: string; color: string }[] = [];
  for (const def of activeIndicators.value) {
    const seriesArr = indicatorSeriesMap.get(def.key);
    if (!seriesArr) continue;
    const suffixes = suffixesByKind[def.kind] ?? [''];
    seriesArr.forEach((s, idx) => {
      const point = param.seriesData.get(s) as { value: number } | undefined;
      if (point && typeof point.value === 'number') {
        indicatorRows.push({
          label: `${indicatorLabel(def)}${suffixes[idx] ? ' ' + suffixes[idx] : ''}`,
          value: point.value.toFixed(2),
          color: def.color
        });
      }
    });
  }

  crosshair.value = {
    x: param.point.x,
    y: param.point.y,
    date: formatTime(param.time),
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: vol ? formatVol(vol.value) : '—',
    indicatorRows
  };
}

// ── fullscreen (mobile landscape) ───────────────────────────────────────
const isFullscreen = ref(false);

async function toggleFullscreen() {
  if (!chartWrapper.value) return;
  if (!document.fullscreenElement) {
    await chartWrapper.value.requestFullscreen?.();
    try {
      const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
      await orientation.lock?.('landscape');
    } catch { /* orientation lock unsupported (e.g. iOS Safari) — fullscreen still works */ }
  } else {
    await document.exitFullscreen();
  }
}

function onFullscreenChange() {
  isFullscreen.value = Boolean(document.fullscreenElement);
  if (!document.fullscreenElement) {
    try {
      const orientation = screen.orientation as ScreenOrientation & { unlock?: () => void };
      orientation.unlock?.();
    } catch { /* ignore */ }
  }
  setTimeout(handleResize, 60);
}

const handleResize = () => {
  if (chart && chartContainer.value)
    chart.applyOptions({ width: chartContainer.value.clientWidth, height: chartWrapper.value?.clientHeight || props.height || 360 });
};

watch(() => props.bars, () => renderChart(), { deep: true });
watch(filteredBars, () => updateSeriesData());
watch(indicatorData, () => renderIndicators());
watch(
  activeIndicators,
  () => {
    const activeKeys = new Set(activeIndicators.value.map((i) => i.key));
    for (const key of [...indicatorSeriesMap.keys()]) {
      if (!activeKeys.has(key)) removeIndicatorSeries(key);
    }
  },
  { deep: true }
);

onMounted(() => {
  renderChart();
  window.addEventListener('resize', handleResize);
  document.addEventListener('fullscreenchange', onFullscreenChange);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  document.removeEventListener('fullscreenchange', onFullscreenChange);
  if (chart) chart.remove();
});
</script>

<template>
  <div
    ref="chartWrapper"
    class="w-full border border-white/10 rounded-3xl overflow-hidden sw-glass-card p-3 sm:p-4 shadow-lg select-none relative"
    :class="isFullscreen ? 'bg-terminal-bg h-screen flex flex-col' : ''"
  >
    <!-- Header row: label + latest stats + period selector + fullscreen -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between px-1 pb-3 gap-2">
      <div class="flex items-center gap-3 flex-wrap">
        <span class="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest">
          {{ selectedPeriod }} Daily OHLC &amp; Volume
        </span>
        <span v-if="latestBar" class="text-xs font-mono text-gray-400">
          Latest: <span class="text-gray-100 font-bold">${{ parseFloat(latestBar.close).toFixed(2) }}</span>
          &nbsp;|&nbsp; Vol: <span class="text-gray-200 font-semibold">{{ latestVolume }}</span>
        </span>
      </div>
      <div class="flex items-center gap-1.5 self-end sm:self-auto">
        <button
          v-for="p in periods"
          :key="p"
          class="px-3 py-1 text-xs font-mono font-bold rounded-lg border transition-all duration-150 btn-press"
          :class="selectedPeriod === p
            ? 'bg-terminal-accent/20 border-terminal-accent/50 text-terminal-accent shadow-sm'
            : 'bg-transparent border-white/10 text-gray-400 hover:text-gray-200 hover:border-white/20'"
          @click="selectedPeriod = p"
        >
          {{ p }}
        </button>
        <button
          type="button"
          class="px-2.5 py-1 text-xs font-mono font-bold rounded-lg border border-white/10 bg-transparent text-gray-400 hover:text-terminal-accent hover:border-terminal-accent/40 transition-colors"
          :title="isFullscreen ? 'Exit full screen' : 'View in full screen'"
          @click="toggleFullscreen"
        >
          {{ isFullscreen ? '⤢ Exit' : '⤢ Full screen' }}
        </button>
      </div>
    </div>

    <!-- Indicators toolbar -->
    <div class="flex flex-wrap items-center gap-2 px-1 pb-2.5">
      <select v-model="newIndicatorKind" class="bg-terminal-bg border border-terminal-border rounded-lg px-2 py-1.5 text-[11px] font-mono text-gray-200 focus:outline-none focus:border-terminal-accent">
        <option value="sma">SMA</option>
        <option value="ema">EMA</option>
        <option value="bb">Bollinger Bands</option>
        <option value="rsi">RSI</option>
        <option value="macd">MACD (12/26/9)</option>
        <option value="adx">ADX</option>
        <option value="atr">ATR</option>
        <option value="obv">OBV</option>
      </select>
      <input
        v-if="!['macd', 'obv'].includes(newIndicatorKind)"
        v-model.number="newIndicatorPeriod"
        type="number"
        min="2"
        max="500"
        class="w-16 bg-terminal-bg border border-terminal-border rounded-lg px-2 py-1.5 text-[11px] font-mono text-gray-200 focus:outline-none focus:border-terminal-accent"
      />
      <button
        type="button"
        class="px-2.5 py-1.5 text-[11px] font-mono font-bold rounded-lg border border-terminal-accent/40 text-terminal-accent hover:bg-terminal-accent/10 transition-colors"
        @click="addFromDropdown"
      >+ Add</button>

      <span class="text-[10px] text-gray-600 font-mono px-1">quick:</span>
      <button type="button" class="px-2 py-1 text-[10px] font-mono text-gray-400 hover:text-terminal-accent rounded-md border border-white/10 hover:border-terminal-accent/40 transition-colors" @click="addIndicator('sma', 20)">SMA20</button>
      <button type="button" class="px-2 py-1 text-[10px] font-mono text-gray-400 hover:text-terminal-accent rounded-md border border-white/10 hover:border-terminal-accent/40 transition-colors" @click="addIndicator('sma', 50)">SMA50</button>
      <button type="button" class="px-2 py-1 text-[10px] font-mono text-gray-400 hover:text-terminal-accent rounded-md border border-white/10 hover:border-terminal-accent/40 transition-colors" @click="addIndicator('sma', 200)">SMA200</button>

      <div v-if="activeIndicators.length" class="flex flex-wrap items-center gap-1.5 ml-1 pl-2 border-l border-white/10">
        <span
          v-for="def in activeIndicators"
          :key="def.key"
          class="flex items-center gap-1 px-2 py-1 text-[10px] font-mono font-bold rounded-md border cursor-pointer hover:brightness-125 transition-all"
          :style="{ borderColor: def.color + '60', color: def.color, backgroundColor: def.color + '15' }"
          :title="'View analysis for ' + indicatorLabel(def)"
          @click="openAnalysis(def)"
        >
          {{ indicatorLabel(def) }}
          <button type="button" class="opacity-70 hover:opacity-100" @click.stop="removeIndicator(def.key)">✕</button>
        </span>
      </div>
    </div>

    <div :class="isFullscreen ? 'flex-1 relative' : 'relative'">
      <div ref="chartContainer" class="w-full" :style="isFullscreen ? {} : { height: `${height || 360}px` }" />

      <!-- Crosshair tooltip -->
      <div
        v-if="crosshair"
        class="absolute z-10 pointer-events-none px-3 py-2 rounded-xl border border-white/15 bg-terminal-bg/95 backdrop-blur-sm shadow-xl text-[11px] font-mono space-y-1 min-w-[150px]"
        :style="{
          left: `${Math.min(crosshair.x + 14, (chartContainer?.clientWidth || 400) - 170)}px`,
          top: `${Math.max(crosshair.y - 10, 8)}px`
        }"
      >
        <div class="text-gray-400">{{ crosshair.date }}</div>
        <div class="grid grid-cols-2 gap-x-3 text-gray-300">
          <span>O <span class="text-gray-100">{{ crosshair.open.toFixed(2) }}</span></span>
          <span>H <span class="text-terminal-accent">{{ crosshair.high.toFixed(2) }}</span></span>
          <span>L <span class="text-rose-400">{{ crosshair.low.toFixed(2) }}</span></span>
          <span>C <span class="text-gray-100 font-bold">{{ crosshair.close.toFixed(2) }}</span></span>
        </div>
        <div class="text-gray-500">Vol {{ crosshair.volume }}</div>
        <div v-if="crosshair.indicatorRows.length" class="pt-1 border-t border-white/10 space-y-0.5">
          <div v-for="row in crosshair.indicatorRows" :key="row.label" class="flex items-center justify-between gap-3">
            <span :style="{ color: row.color }">{{ row.label }}</span>
            <span class="text-gray-200">{{ row.value }}</span>
          </div>
        </div>
      </div>
    </div>

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
