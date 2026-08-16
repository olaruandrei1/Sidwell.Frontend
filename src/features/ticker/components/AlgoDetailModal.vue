<script setup lang="ts">
import { computed } from 'vue';
import AdaptiveOverlay from '../../../shared/ui/organisms/AdaptiveOverlay.vue';
import type { AlgoScore, AlgoMetadataDto } from '../../../shared/api/types';

const props = defineProps<{
  modelValue: boolean;
  algo: AlgoScore | null;
  metadata?: AlgoMetadataDto | null | undefined;
  currency?: string | undefined;
}>();

const emit = defineEmits<{
  'update:modelValue': [val: boolean];
  'close': [];
}>();

const scoreVal = computed(() => {
  if (props.algo?.score === null || props.algo?.score === undefined) return null;
  const num = parseFloat(String(props.algo.score));
  return isNaN(num) ? null : num;
});

const scoreBand = computed(() => {
  if (scoreVal.value === null) return 'none';
  if (props.algo?.name.includes('Beneish')) {
    return props.algo?.details?.manipulator ? 'red' : 'green';
  }
  if (scoreVal.value >= 7) return 'green';
  if (scoreVal.value >= 4) return 'yellow';
  return 'red';
});

const scorePercentage = computed(() => {
  if (scoreVal.value === null) return 0;
  return Math.min(100, Math.max(0, (scoreVal.value / 10) * 100));
});

const bandClass = computed(() => {
  if (scoreBand.value === 'green') {
    return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
  }
  if (scoreBand.value === 'red') {
    return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
  }
  if (scoreBand.value === 'yellow') {
    return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  }
  return 'bg-gray-700 text-gray-300 border-gray-600';
});

const defaultMetadata = computed<AlgoMetadataDto>(() => {
  if (props.metadata) return props.metadata;
  return {
    formula: 'Score = f(Fundamentals, Price, Financial Ratios)',
    definition: 'Quantitative algorithm evaluating valuation, quality, and momentum metrics.',
    how: 'Calculated using audited trailing twelve month SEC filings and current market price.'
  };
});

const practicalTakeaway = computed(() => {
  if (scoreBand.value === 'green') {
    return 'Favorable quantitative profile. Fundamentals support current pricing with margin of safety.';
  }
  if (scoreBand.value === 'red') {
    return 'Unfavorable score band. High risk of manipulation or overvaluation relative to earnings power.';
  }
  if (scoreBand.value === 'yellow') {
    return 'Moderate signals. Monitor fundamental margins and balance sheet trends closely.';
  }
  return 'Insufficient data to generate a quantitative takeaway.';
});
</script>

<template>
  <AdaptiveOverlay
    :model-value="modelValue"
    :title="algo?.name || 'Algorithm Detail'"
    :max-width="720"
    @update:model-value="emit('update:modelValue', $event)"
    @close="emit('close')"
  >
    <div v-if="algo" class="space-y-5 font-mono text-xs">
      <div class="flex items-center justify-between p-3 bg-terminal-bg rounded-xl border border-terminal-border">
        <div>
          <div class="text-gray-400 text-[11px] uppercase">Quantitative Model</div>
          <div class="text-base font-bold text-gray-100">{{ algo.name }}</div>
        </div>
        <div class="flex items-center space-x-2">
          <span class="text-gray-400">Score:</span>
          <span
            class="px-2.5 py-1 rounded text-sm font-bold border"
            :class="bandClass"
          >
            {{ algo.score !== null ? algo.score : 'N/A' }}
          </span>
        </div>
      </div>

      <div v-if="scoreVal !== null" class="space-y-1.5 p-3 bg-terminal-bg/80 rounded-xl border border-terminal-border">
        <div class="flex justify-between text-[11px] uppercase text-gray-400">
          <span>Computation Gauge (0 - 10 Band)</span>
          <span>{{ scoreVal }} / 10</span>
        </div>
        <div class="h-3.5 w-full bg-terminal-surface rounded-full overflow-hidden border border-terminal-border">
          <div
            class="h-full transition-all duration-700 ease-out"
            :class="[
              scoreBand === 'green' ? 'bg-emerald-400' :
              scoreBand === 'red' ? 'bg-rose-500' : 'bg-amber-400'
            ]"
            :style="{ width: `${scorePercentage}%` }"
          ></div>
        </div>
      </div>

      <div class="space-y-1">
        <div class="text-[11px] font-bold text-terminal-accent uppercase">
          1. Definition
        </div>
        <div class="p-3 bg-terminal-surface/60 rounded-xl border border-terminal-border text-gray-200 font-sans text-xs">
          {{ defaultMetadata.definition }}
        </div>
      </div>

      <div class="space-y-1">
        <div class="text-[11px] font-bold text-terminal-accent uppercase">
          2. Formula
        </div>
        <div class="p-3 bg-terminal-bg rounded-xl border border-terminal-border text-purple-300 font-mono text-xs overflow-x-auto">
          <code>{{ defaultMetadata.formula }}</code>
        </div>
      </div>

      <div class="space-y-1">
        <div class="text-[11px] font-bold text-terminal-accent uppercase">
          3. How It Was Calculated
        </div>
        <div class="p-3 bg-terminal-surface/60 rounded-xl border border-terminal-border space-y-2">
          <p class="text-gray-200 font-sans text-xs">
            {{ defaultMetadata.how }}
          </p>
          <div
            v-if="algo.details && Object.keys(algo.details).length > 0"
            class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-terminal-border/60"
          >
            <div
              v-for="(val, key) in algo.details"
              :key="key"
              class="flex justify-between p-1.5 bg-terminal-bg rounded border border-terminal-border/40 text-[11px]"
            >
              <span class="text-gray-400 uppercase">{{ key }}:</span>
              <span class="font-bold text-gray-100">{{ String(val) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-1">
        <div class="text-[11px] font-bold text-terminal-accent uppercase">
          4. Investor Takeaway
        </div>
        <div
          class="p-3 rounded-xl border font-sans text-xs"
          :class="[
            scoreBand === 'green' ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' :
            scoreBand === 'red' ? 'bg-rose-950/20 border-rose-500/30 text-rose-300' :
            'bg-amber-950/20 border-amber-500/30 text-amber-300'
          ]"
        >
          {{ practicalTakeaway }}
        </div>
      </div>
    </div>
  </AdaptiveOverlay>
</template>
