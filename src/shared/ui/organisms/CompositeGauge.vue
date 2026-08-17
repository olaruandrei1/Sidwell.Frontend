<script setup lang="ts">
import { computed } from 'vue';
import type { CompositeScore } from '../../api/types';
import TagBadge from '../atoms/TagBadge.vue';

const props = defineProps<{
  composite: CompositeScore | null;
  size?: 'sm' | 'md' | 'lg';
}>();

const scoreNum = computed(() => {
  if (!props.composite) return 0;
  const n = parseFloat(props.composite.score);
  return isNaN(n) ? 0 : Math.max(-100, Math.min(100, n));
});

// Semicircle arc mathematics for radius 80
const radius = 80;
const circumference = Math.PI * radius; // ~251.327

const progress = computed(() => {
  // map range -100..100 to 0..1
  const norm = (scoreNum.value + 100) / 200;
  return norm * circumference;
});

const strokeOffset = computed(() => {
  return circumference - progress.value;
});

const gaugeColor = computed(() => {
  if (!props.composite) return '#6b7280';
  return props.composite.color;
});

const formattedScore = computed(() => {
  if (!props.composite || props.composite.score === null || props.composite.score === undefined) return 'N/A';
  const num = parseFloat(String(props.composite.score));
  if (isNaN(num)) return String(props.composite.score);
  return num.toFixed(2);
});

// Position of the score on the -100..+100 scale bar (as a percentage).
const markerPct = computed(() => ((scoreNum.value + 100) / 200) * 100);

const dims = computed(() => {
  switch (props.size) {
    case 'sm':
      return { arc: 'w-48 h-28', score: 'text-2xl sm:text-3xl', bar: 'w-40' };
    case 'lg':
      return { arc: 'w-80 h-48', score: 'text-5xl sm:text-6xl', bar: 'w-72' };
    default:
      return { arc: 'w-64 h-40', score: 'text-4xl sm:text-5xl', bar: 'w-56' };
  }
});
</script>

<template>
  <div class="flex flex-col items-center justify-center w-full select-none">
    <!-- Philosophy -->
    <div class="flex items-center gap-2 text-xs font-mono mb-3">
      <span class="text-gray-500 font-bold tracking-wider uppercase">Philosophy</span>
      <span class="px-2.5 py-0.5 rounded-md bg-white/10 border border-white/15 text-gray-100 font-bold">
        {{ composite?.philosophy || 'BALANCED' }}
      </span>
    </div>

    <!-- Semicircular Speedometer Arc -->
    <div class="relative flex flex-col items-center justify-center" :class="dims.arc">
      <svg class="w-full h-full overflow-visible" viewBox="0 0 200 120">
        <!-- Background Track (-100 to +100 arc) -->
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          stroke-width="14"
          stroke-linecap="round"
        />
        <!-- Value Track Arc -->
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          :stroke="gaugeColor"
          stroke-width="14"
          stroke-linecap="round"
          :stroke-dasharray="`${circumference} ${circumference}`"
          :stroke-dashoffset="strokeOffset"
          class="transition-all duration-700 ease-out"
          :style="{ filter: `drop-shadow(0 0 8px ${gaugeColor}88)` }"
        />
      </svg>

      <!-- Center Score & Label -->
      <div class="absolute bottom-3 flex flex-col items-center text-center">
        <span
          class="font-mono font-extrabold tabular-nums tracking-tight leading-none"
          :class="dims.score"
          :style="{ color: gaugeColor, textShadow: `0 0 24px ${gaugeColor}55` }"
        >
          {{ formattedScore }}
        </span>
        <span class="text-xs font-mono font-bold uppercase tracking-widest text-gray-400 mt-1.5">
          HERO COMPOSITE
        </span>
      </div>
    </div>

    <!-- Distinct colored scale bar (-100 → +100) with a marker at the score -->
    <div class="max-w-full mt-1" :class="dims.bar">
      <div class="relative h-2.5 rounded-full overflow-hidden border border-white/10" style="background: linear-gradient(90deg, #ef4444 0%, #f59e0b 35%, #eab308 50%, #34d399 70%, #10b981 100%);">
      </div>
      <div class="relative h-0">
        <div
          v-if="composite"
          class="absolute -top-3.5 w-3 h-3 rounded-full bg-white border-2 shadow-md transition-all duration-700"
          :style="{ left: `calc(${markerPct}% - 6px)`, borderColor: gaugeColor }"
        />
      </div>
      <div class="flex items-center justify-between text-[10px] font-mono text-gray-500 mt-1">
        <span>-100</span><span>0</span><span>+100</span>
      </div>
    </div>

    <!-- Recommendation Badge -->
    <div class="w-full flex flex-col items-center mt-4 space-y-2">
      <div
        class="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full border bg-terminal-surface-light/70 shadow-sm"
        :style="{ borderColor: `${gaugeColor}50` }"
      >
        <span
          class="w-2.5 h-2.5 rounded-full animate-pulse"
          :style="{ backgroundColor: gaugeColor, boxShadow: `0 0 8px ${gaugeColor}` }"
        ></span>
        <span
          class="text-sm font-mono font-bold uppercase tracking-wider"
          :style="{ color: gaugeColor }"
        >
          {{ composite?.label || 'No Data' }}
        </span>
      </div>

      <TagBadge
        v-if="composite?.overridden"
        variant="down"
        size="sm"
        pulse
      >
        BENEISH VETO OVERRIDE
      </TagBadge>
    </div>
  </div>
</template>
