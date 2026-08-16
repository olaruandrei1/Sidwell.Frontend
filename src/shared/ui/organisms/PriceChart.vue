<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { createChart, type IChartApi, type ISeriesApi, ColorType } from 'lightweight-charts';
import type { PriceBar } from '../../api/types';

const props = defineProps<{
  bars: PriceBar[];
  height?: number;
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

const chartContainer = ref<HTMLElement | null>(null);
let chart: IChartApi | null = null;
let candleSeries: ISeriesApi<'Candlestick'> | null = null;
let volumeSeries: ISeriesApi<'Histogram'> | null = null;

const renderChart = () => {
  if (!chartContainer.value) return;

  if (chart) {
    chart.remove();
    chart = null;
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

  updateSeriesData();
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

const handleResize = () => {
  if (chart && chartContainer.value)
    chart.applyOptions({ width: chartContainer.value.clientWidth });
};

watch(() => props.bars, () => renderChart(), { deep: true });
watch(filteredBars, () => updateSeriesData());

onMounted(() => {
  renderChart();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  if (chart) chart.remove();
});
</script>

<template>
  <div class="w-full border border-white/10 rounded-3xl overflow-hidden sw-glass-card p-3 sm:p-4 shadow-lg select-none">
    <!-- Header row: label + latest stats + period selector -->
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
      </div>
    </div>
    <div ref="chartContainer" class="w-full" :style="{ height: `${height || 360}px` }" />
  </div>
</template>
