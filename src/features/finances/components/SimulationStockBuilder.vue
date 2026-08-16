<script setup lang="ts">
import { X } from 'lucide-vue-next';
import type {
  SimulationStockRule,
  SimulationStartingHolding,
  SimulationConditionType,
} from '../../../shared/api/types';
import AppButton from '../../../shared/ui/atoms/AppButton.vue';
import AppInput from '../../../shared/ui/atoms/AppInput.vue';
import FormField from '../../../shared/ui/molecules/FormField.vue';
import { computed } from 'vue';

const props = defineProps<{
  stockRules: SimulationStockRule[];
  startingHoldings: SimulationStartingHolding[];
}>();

const emit = defineEmits<{
  'update:stockRules': [rules: SimulationStockRule[]];
  'update:startingHoldings': [holdings: SimulationStartingHolding[]];
}>();

const conditionTypes: { value: SimulationConditionType; label: string }[] = [
  { value: 'ALWAYS', label: 'Always' },
  { value: 'UNTIL_DATE', label: 'Until Date' },
  { value: 'UNTIL_DEPOSIT', label: 'Until Deposit' },
  { value: 'UNTIL_STOCK_COUNT', label: 'Until Count' },
];

const hasEqualSplit = computed(() =>
  props.stockRules.some((r) => !r.weightPct && r.weightPct !== '0')
);

function addStockRule() {
  emit('update:stockRules', [
    ...props.stockRules,
    {
      symbol: '',
      weightPct: null,
      condition: { type: 'ALWAYS' as SimulationConditionType },
    },
  ]);
}

function removeStockRule(index: number) {
  emit('update:stockRules', props.stockRules.filter((_, i) => i !== index));
}

function updateStockRule(index: number, patch: Partial<SimulationStockRule>) {
  emit(
    'update:stockRules',
    props.stockRules.map((r, i) => (i === index ? { ...r, ...patch } : r))
  );
}

function updateStockConditionType(index: number, type: SimulationConditionType) {
  const rule = props.stockRules[index];
  if (!rule) return;
  emit(
    'update:stockRules',
    props.stockRules.map((r, i) =>
      i === index
        ? {
            ...r,
            condition: {
              type,
              date: type === 'UNTIL_DATE' ? (rule.condition.date || '') : null,
              amount: type === 'UNTIL_DEPOSIT' ? (rule.condition.amount || '0') : null,
              count: type === 'UNTIL_STOCK_COUNT' ? (rule.condition.count || 0) : null,
            },
          }
        : r
    )
  );
}

function addHolding() {
  emit('update:startingHoldings', [
    ...props.startingHoldings,
    { symbol: '', shares: '0' },
  ]);
}

function removeHolding(index: number) {
  emit(
    'update:startingHoldings',
    props.startingHoldings.filter((_, i) => i !== index)
  );
}

function updateHolding(index: number, patch: Partial<SimulationStartingHolding>) {
  emit(
    'update:startingHoldings',
    props.startingHoldings.map((h, i) => (i === index ? { ...h, ...patch } : h))
  );
}
</script>

<template>
  <div class="space-y-4">
    <!-- Stock Rules -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-xs font-mono font-bold text-gray-300 uppercase tracking-wider">
          Stock Selection Rules
        </h3>
        <AppButton variant="outline" size="sm" @click="addStockRule">
          + Add Stock
        </AppButton>
      </div>

      <div
        v-if="hasEqualSplit && stockRules.length > 1"
        class="px-3 py-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-mono"
      >
        ℹ Some stocks omit weight — active stocks will be split equally.
      </div>

      <div
        v-for="(sr, idx) in stockRules"
        :key="idx"
        class="bg-terminal-surface border border-terminal-border rounded-lg p-3 space-y-2 hover:border-terminal-accent/30 transition-colors"
      >
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-mono text-gray-500 uppercase">Stock #{{ idx + 1 }}</span>
          <button
            type="button"
            class="w-6 h-6 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center text-xs transition-colors"
            @click="removeStockRule(idx)"
          ><X :size="13" /></button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <FormField label="Symbol" class="sm:col-span-3">
            <AppInput
              :modelValue="sr.symbol"
              @update:modelValue="updateStockRule(idx, { symbol: $event.toUpperCase() })"
              placeholder="AAPL"
              monospace
            />
          </FormField>
          <FormField label="Weight %" class="sm:col-span-3">
            <AppInput
              :modelValue="sr.weightPct || ''"
              @update:modelValue="updateStockRule(idx, { weightPct: $event || null })"
              type="number"
              placeholder="Equal"
              monospace
            />
          </FormField>
          <FormField
            label="Condition"
            :class="sr.condition.type === 'ALWAYS' ? 'sm:col-span-6' : 'sm:col-span-3'"
          >
            <select
              :value="sr.condition.type"
              @change="updateStockConditionType(idx, ($event.target as HTMLSelectElement).value as SimulationConditionType)"
              class="w-full bg-terminal-bg border border-terminal-border rounded-md px-3 py-2 text-sm font-mono text-gray-200 focus:outline-none focus:border-terminal-accent"
            >
              <option v-for="ct in conditionTypes" :key="ct.value" :value="ct.value">
                {{ ct.label }}
              </option>
            </select>
          </FormField>

          <FormField
            v-if="sr.condition.type === 'UNTIL_DATE'"
            label="Until Date"
            class="sm:col-span-3"
          >
            <AppInput
              :modelValue="sr.condition.date || ''"
              @update:modelValue="updateStockRule(idx, { condition: { ...sr.condition, date: $event } })"
              placeholder="2030-06"
              monospace
            />
          </FormField>
          <FormField
            v-if="sr.condition.type === 'UNTIL_DEPOSIT'"
            label="Deposit Target"
            class="sm:col-span-3"
          >
            <AppInput
              :modelValue="sr.condition.amount || ''"
              @update:modelValue="updateStockRule(idx, { condition: { ...sr.condition, amount: $event } })"
              type="number"
              placeholder="50000"
              monospace
            />
          </FormField>
          <FormField
            v-if="sr.condition.type === 'UNTIL_STOCK_COUNT'"
            label="Max Count"
            class="sm:col-span-3"
          >
            <AppInput
              :modelValue="String(sr.condition.count ?? '')"
              @update:modelValue="updateStockRule(idx, { condition: { ...sr.condition, count: parseInt($event) || 0 } })"
              type="number"
              placeholder="5"
              monospace
            />
          </FormField>
        </div>
      </div>

      <div v-if="stockRules.length === 0" class="text-center py-4 text-xs font-mono text-gray-500 border border-dashed border-terminal-border rounded-lg">
        No stock rules. Add stocks to include equity in your simulation.
      </div>
    </div>

    <!-- Starting Holdings -->
    <div class="space-y-3 pt-2 border-t border-terminal-border/50">
      <div class="flex items-center justify-between">
        <h3 class="text-xs font-mono font-bold text-gray-300 uppercase tracking-wider">
          Starting Holdings (optional)
        </h3>
        <AppButton variant="ghost" size="sm" @click="addHolding">
          + Add Holding
        </AppButton>
      </div>

      <div class="space-y-2">
        <div
          v-for="(h, idx) in startingHoldings"
          :key="idx"
          class="flex items-end space-x-2"
        >
          <FormField label="Symbol" class="flex-1">
            <AppInput
              :modelValue="h.symbol"
              @update:modelValue="updateHolding(idx, { symbol: $event.toUpperCase() })"
              placeholder="AAPL"
              monospace
            />
          </FormField>
          <FormField label="Shares" class="flex-1">
            <AppInput
              :modelValue="h.shares"
              @update:modelValue="updateHolding(idx, { shares: $event })"
              type="number"
              placeholder="10"
              monospace
            />
          </FormField>
          <button
            type="button"
            class="mb-5 w-6 h-6 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center text-xs transition-colors"
            @click="removeHolding(idx)"
          >✕</button>
        </div>
      </div>
    </div>
  </div>
</template>
