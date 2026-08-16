<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import MoneyText from '../../../shared/ui/atoms/MoneyText.vue';
import { useGrowthProjectionQuery } from '../../../queries/useTickersQuery';

const props = withDefaults(
  defineProps<{
    symbol: string;
    currency?: string | undefined;
    targetShares: string | null;
    scenarioIndex?: number;
  }>(),
  { scenarioIndex: 1 }
);

const selectedScenarioIndex = ref(props.scenarioIndex);

// Follow the shared scenario selected above the projection & holding panels.
watch(() => props.scenarioIndex, (idx) => {
  if (typeof idx === 'number') selectedScenarioIndex.value = idx;
});

const queryShares = computed(() => props.targetShares ?? '');

const { data: projection, isLoading } = useGrowthProjectionQuery(
  computed(() => props.symbol),
  queryShares
);

function compactMoney(raw: string | number | undefined | null, currency: string): string {
  if (raw === null || raw === undefined) return '—';
  const v = typeof raw === 'number' ? raw : parseFloat(String(raw));
  if (!Number.isFinite(v)) return '—';
  const abs = Math.abs(v);
  const short = abs >= 1e9 ? `${(v / 1e9).toFixed(2)}B`
    : abs >= 1e6 ? `${(v / 1e6).toFixed(2)}M`
    : abs >= 1e3 ? `${(v / 1e3).toFixed(2)}K`
    : v.toFixed(2);
  return `${short} ${currency}`;
}
</script>

<template>
  <div class="border border-white/10 sw-glass-card rounded-2xl p-5 space-y-4 font-mono shadow-lg h-full">
    <div class="flex items-center justify-between border-b border-white/10 pb-3">
      <div>
        <h3 class="text-xs font-bold text-gray-200 uppercase tracking-wider">Target Share Projection</h3>
        <p class="text-[10px] text-gray-500 font-sans mt-0.5">Multi-scenario CAGR growth model</p>
      </div>
      <div v-if="targetShares" class="text-right">
        <span class="text-[10px] text-gray-500 font-mono uppercase tracking-wider">Target</span>
        <div class="text-sm font-black text-terminal-accent font-mono">{{ parseFloat(String(targetShares)) }} sh</div>
      </div>
    </div>

    <!-- No target shares set -->
    <div v-if="!targetShares" class="py-8 text-center space-y-2">
      <div class="text-2xl opacity-20">◎</div>
      <p class="text-xs text-gray-500 font-mono">No target shares set</p>
      <p class="text-[10px] text-gray-600 font-sans">Set a target in the transaction form to enable projections</p>
    </div>

    <div v-else-if="isLoading" class="py-6 text-center text-xs text-gray-400 animate-pulse font-mono">
      Loading growth projection...
    </div>

    <template v-else-if="projection">
      <!-- Scenario selector -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          v-for="(sc, idx) in projection.scenarios"
          :key="sc.name"
          type="button"
          @click="selectedScenarioIndex = idx"
          class="px-3 py-3 rounded-xl border text-left transition-all duration-200 active:scale-[0.98] min-w-0"
          :class="[
            selectedScenarioIndex === idx
              ? 'bg-terminal-accent/15 border-terminal-accent shadow-sm'
              : 'bg-white/5 border-white/10 hover:border-white/25'
          ]"
        >
          <div class="text-[9px] uppercase font-bold tracking-widest truncate"
               :class="selectedScenarioIndex === idx ? 'text-terminal-accent' : 'text-gray-500'">
            {{ sc.name }}
          </div>
          <div class="text-lg font-black mt-1 leading-none truncate"
               :class="selectedScenarioIndex === idx ? 'text-terminal-accent' : 'text-white'">
            {{ sc.cagr }}%
          </div>
          <div class="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">per year</div>
          <div class="text-[11px] font-mono font-semibold text-gray-300 mt-2 pt-2 border-t border-white/5 truncate">
            {{ compactMoney(sc.rows[sc.rows.length - 1]?.value, currency || 'RON') }}
          </div>
        </button>
      </div>

      <!-- Year-by-year -->
      <div class="flex items-center justify-between text-xs font-bold px-0.5">
        <span class="text-gray-300 font-mono">{{ projection.scenarios[selectedScenarioIndex]?.name }} — Year-by-Year</span>
        <span class="text-terminal-accent font-mono">{{ parseFloat(String(projection.targetShares)) }} shares</span>
      </div>

      <!-- Desktop: table -->
      <div class="hidden sm:block bg-terminal-bg/70 border border-white/10 rounded-xl overflow-hidden shadow-inner">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="border-b border-white/10 text-[10px] uppercase text-gray-400 bg-terminal-surface-light/60 font-bold">
                <th class="p-3">Year</th>
                <th class="p-3 text-right">Capital In</th>
                <th class="p-3 text-right">Projected</th>
                <th class="p-3 text-right text-emerald-400">Gain</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5 font-mono text-sm">
              <tr
                v-for="row in projection.scenarios[selectedScenarioIndex]?.rows || []"
                :key="row.year"
                class="hover:bg-white/[0.04] transition-colors"
              >
                <td class="p-3 font-bold text-gray-200">{{ row.year }}</td>
                <td class="p-3 text-right font-semibold text-gray-300">
                  <MoneyText :value="row.invested" :currency="currency" :places="2" :color="false" />
                </td>
                <td class="p-3 text-right font-bold text-purple-300">
                  <MoneyText :value="row.value" :currency="currency" :places="2" :color="false" />
                </td>
                <td class="p-3 text-right font-bold text-emerald-400">
                  +<MoneyText :value="(parseFloat(row.value) - parseFloat(row.invested)).toFixed(2)" :currency="currency" :places="2" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Mobile: swipeable year cards -->
      <div class="sm:hidden flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 scrollbar-none -mx-1 px-1">
        <div
          v-for="row in projection.scenarios[selectedScenarioIndex]?.rows || []"
          :key="row.year"
          class="snap-start shrink-0 w-[56vw] max-w-[220px] bg-terminal-bg/70 border border-white/10 rounded-xl p-3.5 space-y-2 shadow-inner"
        >
          <div class="flex items-center justify-between border-b border-white/10 pb-2">
            <span class="text-sm font-black text-gray-100 font-mono">Year {{ row.year }}</span>
          </div>
          <div class="flex items-center justify-between gap-2 text-xs font-mono">
            <span class="text-[11px] text-gray-400 uppercase tracking-wider">Capital In</span>
            <MoneyText :value="row.invested" :currency="currency" :places="2" :color="false" />
          </div>
          <div class="flex items-center justify-between gap-2 text-xs font-mono">
            <span class="text-[11px] text-gray-400 uppercase tracking-wider">Projected</span>
            <span class="font-bold text-purple-300"><MoneyText :value="row.value" :currency="currency" :places="2" :color="false" /></span>
          </div>
          <div class="flex items-center justify-between gap-2 text-xs font-mono">
            <span class="text-[11px] text-gray-400 uppercase tracking-wider">Gain</span>
            <span class="font-bold text-emerald-400">+<MoneyText :value="(parseFloat(row.value) - parseFloat(row.invested)).toFixed(2)" :currency="currency" :places="2" /></span>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="py-4 text-center text-xs text-gray-400">No growth projection data available.</div>
  </div>
</template>
