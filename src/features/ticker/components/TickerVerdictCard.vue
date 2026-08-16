<script setup lang="ts">
import { computed } from 'vue';
import type { TickerVerdictDto } from '../../../shared/api/types';

const props = defineProps<{
  verdict: TickerVerdictDto | null | undefined;
  isLoading?: boolean;
  isError?: boolean;
}>();

const colorClass = computed(() => {
  const coloring = props.verdict?.coloring || 'yellow';
  if (coloring === 'green') {
    return {
      container: 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      icon: '✓',
      title: 'WORTH BUYING'
    };
  }
  if (coloring === 'red') {
    return {
      container: 'bg-rose-950/30 border-rose-500/40 text-rose-200',
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      icon: '✕',
      title: 'AVOID / RISKY'
    };
  }
  return {
    container: 'bg-amber-950/30 border-amber-500/40 text-amber-200',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    icon: '•',
    title: 'MIXED SIGNALS'
  };
});

const displayVerdictTitle = computed(() => {
  if (!props.verdict?.verdict) return colorClass.value.title;
  switch (props.verdict.verdict) {
    case 'buy':
      return 'WORTH BUYING';
    case 'hold':
      return 'MIXED SIGNALS / HOLD';
    case 'risky':
      return 'RISKY';
    case 'avoid':
      return 'AVOID';
    default:
      return colorClass.value.title;
  }
});
</script>

<template>
  <div
    v-if="isLoading"
    class="border border-white/10 sw-glass-card rounded-2xl p-5 animate-pulse"
  >
    <div class="h-4 bg-white/10 rounded w-1/4 mb-2"></div>
    <div class="h-3 bg-white/5 rounded w-3/4"></div>
  </div>

  <div
    v-else-if="isError"
    class="border border-white/10 sw-glass-card rounded-2xl p-5 font-mono"
  >
    <div class="flex items-center gap-3 text-gray-500">
      <div class="w-9 h-9 rounded-full flex items-center justify-center border border-white/10 text-base">⚡</div>
      <div>
        <span class="text-xs font-bold uppercase tracking-wider text-gray-400">AI VERDICT</span>
        <p class="text-xs text-gray-400 mt-0.5 font-sans">Gemini rate limit reached — verdict unavailable right now. Try again in a few minutes.</p>
      </div>
    </div>
  </div>

  <div
    v-else-if="verdict"
    class="border rounded-2xl p-5 transition-all duration-300 font-mono sw-glass-card shadow-lg"
    :class="colorClass.container"
  >
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="flex items-start sm:items-center gap-3.5">
        <div
          class="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-base border flex-shrink-0 shadow-sm"
          :class="colorClass.badge"
        >
          {{ colorClass.icon }}
        </div>
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-xs font-bold uppercase tracking-wider text-gray-300">VERDICT:</span>
            <span
              class="px-2.5 py-0.5 rounded-lg text-xs font-bold border uppercase tracking-wide"
              :class="colorClass.badge"
            >
              {{ displayVerdictTitle }}
            </span>
          </div>
          <p class="text-sm text-gray-100 mt-1.5 font-sans leading-relaxed">
            {{ verdict.summary }}
          </p>
        </div>
      </div>

      <div
        v-if="verdict.riskWorthIt && verdict.probabilisticWin !== null"
        class="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-terminal-bg/80 border border-white/10 text-xs font-mono self-start sm:self-auto flex-shrink-0 shadow-inner"
      >
        <span class="text-terminal-accent font-bold">High-confidence read</span>
        <span class="text-gray-500">—</span>
        <span class="text-emerald-400 font-bold">~{{ verdict.probabilisticWin }}% conviction</span>
      </div>
    </div>

    <div
      v-if="verdict.reentry"
      class="mt-3.5 pt-3.5 border-t border-white/10 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-mono text-gray-300"
    >
      <span>📅 Est. re-entry: <span class="font-bold text-gray-100">{{ verdict.reentry.estimatedDate }}</span></span>
      <span>🎯 Target: <span class="font-bold text-gray-100">${{ verdict.reentry.targetPrice.toFixed(2) }}</span></span>
      <span class="text-gray-500">based on {{ verdict.reentry.sampleCount }} past episodes on this ticker</span>
    </div>
  </div>
</template>
