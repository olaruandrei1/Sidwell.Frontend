<script setup lang="ts">
import { computed } from 'vue';
import AdaptiveOverlay from './AdaptiveOverlay.vue';
import type { IndicatorSeriesDto } from '../../api/types';
import { INDICATOR_INFO, TREND_READ } from '../../data/indicatorInfo';

const props = defineProps<{
  modelValue: boolean;
  kind: string;
  period: number;
  color: string;
  dto: IndicatorSeriesDto | null;
}>();

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

const info = computed(() => INDICATOR_INFO[props.kind]);
const trendRead = computed(() => (props.dto?.trend ? TREND_READ[props.dto.trend] : null));
const latestPoint = computed(() => props.dto?.points.at(-1) ?? null);

const title = computed(() => {
  const label = props.kind === 'macd' || props.kind === 'obv' ? props.kind.toUpperCase() : `${props.kind.toUpperCase()}(${props.period})`;
  return `${label} — ${info.value?.name ?? ''}`;
});

function formatValue(v: number | string): string {
  const num = typeof v === 'number' ? v : parseFloat(String(v));
  if (!Number.isFinite(num)) return '—';
  return Math.abs(num) >= 1000 ? num.toLocaleString(undefined, { maximumFractionDigits: 0 }) : num.toFixed(2);
}
</script>

<template>
  <AdaptiveOverlay :model-value="modelValue" :title="title" :max-width="520" @update:model-value="emit('update:modelValue', $event)">
    <div v-if="info" class="space-y-5">
      <!-- animated mini-graphic -->
      <div class="rounded-2xl border border-white/10 bg-terminal-bg/60 p-4 overflow-hidden">
        <svg v-if="info.category === 'overlay'" viewBox="0 0 200 60" class="w-full h-16">
          <polyline points="0,40 20,35 40,42 60,28 80,32 100,18 120,24 140,12 160,20 180,8 200,15" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5" />
          <polyline class="sw-anim-avgline" points="0,38 20,36 40,36 60,32 80,30 100,26 120,24 140,20 160,18 180,15 200,14" fill="none" :stroke="color" stroke-width="2" />
          <circle class="sw-anim-dot" r="3" :fill="color">
            <animateMotion dur="3.5s" repeatCount="indefinite" path="M0,38 20,36 40,36 60,32 80,30 100,26 120,24 140,20 160,18 180,15 200,14" />
          </circle>
        </svg>
        <svg v-else-if="info.category === 'oscillator'" viewBox="0 0 200 60" class="w-full h-16">
          <line x1="0" y1="15" x2="200" y2="15" stroke="rgba(255,255,255,0.1)" stroke-dasharray="2,3" />
          <line x1="0" y1="45" x2="200" y2="45" stroke="rgba(255,255,255,0.1)" stroke-dasharray="2,3" />
          <path class="sw-anim-wave" d="M0,30 Q25,10 50,30 T100,30 T150,30 T200,30" fill="none" :stroke="color" stroke-width="2" />
        </svg>
        <svg v-else viewBox="0 0 200 60" class="w-full h-16">
          <rect v-for="i in 12" :key="i" :x="i * 16" y="30" width="8" height="20" :fill="color" opacity="0.6" class="sw-anim-bar" :style="{ animationDelay: `${i * 0.12}s` }" />
        </svg>
      </div>

      <!-- definition -->
      <div>
        <div class="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider mb-1">What it is</div>
        <p class="text-sm text-gray-200 leading-relaxed">{{ info.definition }}</p>
      </div>

      <!-- formula -->
      <div>
        <div class="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider mb-1">Formula</div>
        <code class="block text-xs font-mono text-terminal-accent bg-terminal-bg/80 border border-white/10 rounded-lg px-3 py-2">{{ info.formula }}</code>
      </div>

      <!-- result -->
      <div v-if="latestPoint">
        <div class="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider mb-1">Current reading</div>
        <div class="flex flex-wrap gap-3 text-sm font-mono">
          <span v-for="(val, key) in latestPoint.values" :key="key" class="text-gray-200">
            <span class="text-gray-500">{{ key }}:</span> <span class="font-bold" :style="{ color }">{{ formatValue(val) }}</span>
          </span>
        </div>
      </div>

      <!-- recommendation -->
      <div v-if="trendRead" class="rounded-xl border p-3.5 space-y-2" :style="{ borderColor: trendRead.color + '50', backgroundColor: trendRead.color + '12' }">
        <div class="text-sm font-bold" :style="{ color: trendRead.color }">{{ trendRead.label }}</div>
        <div class="text-xs text-gray-300">{{ trendRead.action }}</div>
        <div class="text-xs font-semibold pt-2 border-t" :style="{ borderColor: trendRead.color + '30', color: trendRead.color }">
          → {{ trendRead.verdict }}
        </div>
      </div>
      <div v-else class="rounded-xl border border-white/10 bg-white/5 p-3.5 text-xs text-gray-400">
        This indicator doesn't produce a standalone directional signal — read it alongside price action and the other active indicators.
      </div>
    </div>
  </AdaptiveOverlay>
</template>

<style scoped>
.sw-anim-avgline {
  stroke-dasharray: 260;
  stroke-dashoffset: 260;
  animation: sw-draw 3.5s ease-in-out infinite;
}
@keyframes sw-draw {
  0% { stroke-dashoffset: 260; }
  50% { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: -260; }
}
.sw-anim-wave {
  animation: sw-wave 2.5s linear infinite;
}
@keyframes sw-wave {
  0% { d: path('M0,30 Q25,10 50,30 T100,30 T150,30 T200,30'); }
  50% { d: path('M0,30 Q25,50 50,30 T100,30 T150,30 T200,30'); }
  100% { d: path('M0,30 Q25,10 50,30 T100,30 T150,30 T200,30'); }
}
.sw-anim-bar {
  animation: sw-pulse 1.6s ease-in-out infinite;
  transform-origin: center;
}
@keyframes sw-pulse {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(1.6); }
}
</style>
