<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { DividendProjectionDto, DividendInfoDto } from '../../api/types';
import { cleanDecimal } from '../../utils/format';
import MoneyText from '../atoms/MoneyText.vue';
import AppInput from '../atoms/AppInput.vue';
import TagBadge from '../atoms/TagBadge.vue';

const props = defineProps<{
  projection: DividendProjectionDto | null;
  dividendInfo: DividendInfoDto | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  'update-params': [endYear: number, reinvest: boolean, shares: string];
}>();

const endYearInput = ref<number>(props.projection?.endYear || 2060);
const reinvestInput = ref<boolean>(props.projection?.reinvest ?? true);
const sharesInput = ref<string>(cleanDecimal(props.projection?.currentShares || '500', 4));
const showAssumptions = ref<boolean>(false);

watch(
  () => props.projection?.currentShares,
  (newVal) => {
    if (newVal) {
      sharesInput.value = cleanDecimal(newVal, 4);
    }
  },
  { immediate: true }
);

const hasHistoric = computed(() => {
  if (!props.projection || !props.projection.scenarios) return false;
  return props.projection.scenarios.some((s) => s.historicScenario !== null);
});

const handleApply = () => {
  emit('update-params', endYearInput.value, reinvestInput.value, sharesInput.value);
};

const formatAssumptionVal = (val: unknown): string => {
  if (val === null || val === undefined) return 'N/A';
  if (typeof val === 'number' || (typeof val === 'string' && /^-?\d+(\.\d+)?$/.test(val))) {
    return cleanDecimal(String(val), 3);
  }
  return String(val);
};
</script>

<template>
  <div class="rounded-3xl border border-white/10 sw-glass-card p-5 space-y-5 shadow-lg select-none">
    <!-- Header / Status -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-3">
      <div>
        <h3 class="text-sm font-mono font-bold text-gray-100 uppercase tracking-wider">
          Dividend Projection (Net of Tax)
        </h3>
        <p class="text-xs text-gray-400 mt-1 font-sans">
          Cumulative net dividend cashflows under 3 growth scenarios.
        </p>
      </div>
      <div>
        <TagBadge
          v-if="dividendInfo?.status === 'PENDING'"
          variant="accent"
          size="sm"
          pulse
        >
          FETCHING DIVIDEND DATA...
        </TagBadge>
        <TagBadge
          v-else-if="dividendInfo?.status === 'STALE'"
          variant="down"
          size="sm"
        >
          STALE CACHE
        </TagBadge>
        <TagBadge
          v-else
          variant="up"
          size="sm"
        >
          CACHED
        </TagBadge>
      </div>
    </div>

    <!-- Controls Form -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-terminal-bg/60 p-4 rounded-2xl border border-white/10">
      <div>
        <label class="block text-[11px] font-mono font-bold text-gray-400 uppercase tracking-wider mb-1.5">Shares</label>
        <AppInput
          v-model="sharesInput"
          type="number"
          placeholder="Shares"
          monospace
          @blur="handleApply"
        />
      </div>

      <div>
        <label class="block text-[11px] font-mono font-bold text-gray-400 uppercase tracking-wider mb-1.5">End Year</label>
        <AppInput
          v-model="endYearInput"
          type="number"
          placeholder="e.g. 2060"
          monospace
          @blur="handleApply"
        />
      </div>

      <div class="flex items-center space-x-2.5 pt-4">
        <input
          type="checkbox"
          id="reinvest-drip"
          v-model="reinvestInput"
          @change="handleApply"
          class="rounded-md border-white/20 bg-terminal-surface text-terminal-accent focus:ring-terminal-accent w-4 h-4 cursor-pointer"
        />
        <label for="reinvest-drip" class="text-xs text-gray-200 cursor-pointer select-none font-mono font-medium">
          Reinvest dividends until {{ endYearInput }}
        </label>
      </div>
    </div>

    <!-- 3-Column Scenario Table -->
    <div v-if="loading" class="py-8 text-center text-xs text-gray-400 font-mono animate-pulse">
      Calculating projection scenarios...
    </div>
    <div v-else-if="!projection || !projection.scenarios || projection.scenarios.length === 0" class="py-6 text-center text-xs text-gray-400 font-mono">
      No projection data available.
    </div>
    <!-- Desktop View: Table -->
    <div v-else-if="projection && projection.scenarios && projection.scenarios.length > 0" class="hidden md:block overflow-x-auto border border-white/10 rounded-2xl bg-terminal-surface/50">
      <table class="w-full text-left border-collapse text-xs">
        <thead>
          <tr class="border-b border-white/10 bg-terminal-surface-light/80 text-gray-400 uppercase tracking-wider font-mono font-bold">
            <th class="px-4 py-3">Year</th>
            <th class="px-4 py-3 text-right">Conservative (6%)</th>
            <th class="px-4 py-3 text-right">Moderate (8%)</th>
            <th v-if="hasHistoric" class="px-4 py-3 text-right">Historic CAGR</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/5 font-mono text-sm">
          <tr
            v-for="row in projection.scenarios.slice(0, 10)"
            :key="row.year"
            class="hover:bg-white/[0.04] transition-colors"
          >
            <td class="px-4 py-2.5 font-bold text-gray-200">{{ row.year }}</td>
            <td class="px-4 py-2.5 text-right font-semibold">
              <MoneyText :value="row.conservativeScenario" currency="RON" :places="2" />
            </td>
            <td class="px-4 py-2.5 text-right font-semibold">
              <MoneyText :value="row.moderateScenario" currency="RON" :places="2" />
            </td>
            <td v-if="hasHistoric" class="px-4 py-2.5 text-right font-semibold">
              <MoneyText :value="row.historicScenario" currency="RON" :places="2" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile View: Horizontal Card Carousel (1 Card == 1 Projection Year) -->
    <div v-if="projection && projection.scenarios && projection.scenarios.length > 0" class="md:hidden flex overflow-x-auto snap-x snap-mandatory gap-3.5 pb-3 scrollbar-none px-1">
      <div
        v-for="row in projection.scenarios.slice(0, 10)"
        :key="row.year"
        class="snap-start flex-shrink-0 w-[80vw] max-w-[280px] bg-terminal-surface border border-terminal-border/80 rounded-2xl p-4 space-y-3 shadow-lg"
      >
        <div class="flex items-center justify-between border-b border-white/10 pb-2">
          <span class="font-mono font-bold text-gray-100 text-sm">Anul {{ row.year }}</span>
          <span class="text-xs font-mono font-bold text-terminal-accent">PROIECTIE NET</span>
        </div>
        <div class="space-y-2 text-xs font-mono">
          <div class="flex items-center justify-between">
            <span class="text-gray-400">Conservativ (6%)</span>
            <MoneyText :value="row.conservativeScenario" currency="RON" :places="2" class="font-bold" />
          </div>
          <div class="flex items-center justify-between">
            <span class="text-gray-400">Moderat (8%)</span>
            <MoneyText :value="row.moderateScenario" currency="RON" :places="2" class="font-bold" />
          </div>
          <div v-if="hasHistoric" class="flex items-center justify-between border-t border-white/10 pt-1.5">
            <span class="text-gray-400">Historic CAGR</span>
            <MoneyText :value="row.historicScenario" currency="RON" :places="2" class="font-bold text-emerald-400" />
          </div>
        </div>
      </div>
    </div>

    <!-- Assumptions Expander/Footnote -->
    <div v-if="projection?.assumptions" class="border-t border-white/10 pt-3">
      <button
        @click="showAssumptions = !showAssumptions"
        class="text-xs text-terminal-accent hover:underline font-mono font-bold flex items-center space-x-1.5"
      >
        <span>{{ showAssumptions ? '▼' : '▶' }}</span>
        <span>View Model Assumptions &amp; Tax Rates</span>
      </button>

      <div v-if="showAssumptions" class="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono bg-terminal-bg/80 p-3.5 rounded-xl border border-white/10 text-gray-300">
        <div v-for="(val, key) in projection.assumptions" :key="key">
          <span class="text-gray-400 block uppercase text-[10px] font-bold">{{ key }}:</span>
          <span class="text-gray-100 font-semibold mt-0.5 block">{{ formatAssumptionVal(val) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
