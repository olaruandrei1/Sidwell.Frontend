<script setup lang="ts">
import { computed } from 'vue';
import type { IndicatorSeriesDto } from '../../api/types';
import { INDICATOR_INFO, TREND_READ } from '../../data/indicatorInfo';

interface IndicatorDef {
  key: string;
  kind: string;
  period: number;
  color: string;
}

const props = defineProps<{
  indicators: IndicatorDef[];
  dtos: IndicatorSeriesDto[];
}>();

const emit = defineEmits<{ open: [key: string] }>();

function toNum(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const p = parseFloat(v);
    return Number.isFinite(p) ? p : NaN;
  }
  return NaN;
}

function findDto(kind: string, period: number): IndicatorSeriesDto | null {
  return props.dtos.find((d) => d.type === kind && toNum((d.params as Record<string, unknown>).period ?? 0) === period) ?? null;
}

function label(def: IndicatorDef): string {
  if (def.kind === 'bb') return `BB(${def.period})`;
  if (['macd', 'obv'].includes(def.kind)) return def.kind.toUpperCase();
  return `${def.kind.toUpperCase()}(${def.period})`;
}

const cards = computed(() =>
  props.indicators
    .map((def) => {
      const dto = findDto(def.kind, def.period);
      if (!dto || dto.error) return null;
      const trend = dto.trend ? TREND_READ[dto.trend] : null;
      const latest = dto.points.at(-1) ?? null;
      return { def, dto, trend, latest };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
);
</script>

<template>
  <div v-if="cards.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
    <button
      v-for="card in cards"
      :key="card.def.key"
      type="button"
      class="text-left rounded-xl border p-3 space-y-1.5 transition-colors hover:border-white/30"
      :style="{
        borderColor: card.trend ? card.trend.color + '40' : 'rgba(255,255,255,0.1)',
        backgroundColor: card.trend ? card.trend.color + '0d' : 'rgba(255,255,255,0.03)'
      }"
      @click="emit('open', card.def.key)"
    >
      <div class="flex items-center justify-between gap-2">
        <span class="text-xs font-mono font-bold" :style="{ color: card.def.color }">{{ label(card.def) }}</span>
        <span v-if="card.latest" class="text-xs font-mono font-bold text-gray-200">
          {{ Object.values(card.latest.values)[0]?.toFixed(2) }}
        </span>
      </div>
      <p v-if="card.trend" class="text-[11px] leading-snug" :style="{ color: card.trend.color }">
        {{ card.trend.verdict }}
      </p>
      <p v-else class="text-[11px] leading-snug text-gray-500">
        {{ INDICATOR_INFO[card.def.kind]?.name ?? card.def.kind }} — tap for details
      </p>
    </button>
  </div>
</template>
