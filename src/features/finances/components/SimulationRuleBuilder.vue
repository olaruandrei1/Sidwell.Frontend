<script setup lang="ts">
import { computed } from 'vue';
import { X } from '@lucide/vue';
import type {
  SimulationAllocationRule,
  SimulationConditionType,
  SimulationInstrumentConfig,
} from '../../../shared/api/types';
import AppButton from '../../../shared/ui/atoms/AppButton.vue';
import AppInput from '../../../shared/ui/atoms/AppInput.vue';
import FormField from '../../../shared/ui/molecules/FormField.vue';

const props = defineProps<{
  rules: SimulationAllocationRule[];
  instruments?: SimulationInstrumentConfig[];
}>();

const emit = defineEmits<{
  'update:rules': [rules: SimulationAllocationRule[]];
}>();

const conditionTypes: { value: SimulationConditionType; label: string }[] = [
  { value: 'ALWAYS', label: 'Always (fallback)' },
  { value: 'UNTIL_DEPOSIT', label: 'Until Instrument Balance Target' },
  { value: 'UNTIL_DATE', label: 'Until Date' },
  { value: 'UNTIL_STOCK_COUNT', label: 'Until Stock Count Target' },
  { value: 'BETWEEN_DATES', label: 'Between Dates (Period Override)' },
];

const hasAlwaysRule = computed(() =>
  props.rules.some((r) => r.condition.type === 'ALWAYS')
);

function addRule() {
  const updated = [
    ...props.rules,
    {
      condition: { type: 'ALWAYS' as SimulationConditionType },
      mode: 'PERCENT' as const,
      depositPct: '50',
      stocksPct: '50',
    },
  ];
  emit('update:rules', updated);
}

function removeRule(index: number) {
  const updated = props.rules.filter((_, i) => i !== index);
  emit('update:rules', updated);
}

function updateRule(index: number, patch: Partial<SimulationAllocationRule>) {
  const updated = props.rules.map((r, i) => (i === index ? { ...r, ...patch } : r));
  emit('update:rules', updated);
}

function updateConditionType(index: number, type: SimulationConditionType) {
  const rule = props.rules[index];
  if (!rule) return;
  const updated = props.rules.map((r, i) =>
    i === index
      ? {
          ...r,
          condition: {
            ...rule.condition,
            type,
            date: type === 'UNTIL_DATE' || type === 'BETWEEN_DATES' ? (rule.condition.date || '') : null,
            startDate: type === 'BETWEEN_DATES' ? (rule.condition.startDate || '') : null,
            amount: type === 'UNTIL_DEPOSIT' ? (rule.condition.amount || '0') : null,
            count: type === 'UNTIL_STOCK_COUNT' ? (rule.condition.count || 0) : null,
          },
        }
      : r
  );
  emit('update:rules', updated);
}

function moveRule(index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= props.rules.length) return;
  const updated = [...props.rules];
  const temp = updated[index];
  const targetVal = updated[target];
  if (!temp || !targetVal) return;
  updated[index] = targetVal;
  updated[target] = temp;
  emit('update:rules', updated);
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <h3 class="text-xs font-mono font-bold text-gray-300 uppercase tracking-wider">
        Allocation Rules
      </h3>
      <AppButton variant="outline" size="sm" @click="addRule">
        + Add Rule
      </AppButton>
    </div>

    <!-- Warning: no ALWAYS rule -->
    <div
      v-if="rules.length > 0 && !hasAlwaysRule"
      class="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono"
    >
      ⚠ No ALWAYS (fallback) rule — add one as the last rule to avoid unallocated months.
    </div>

    <!-- Rules list container (Carousel on mobile, Stack on desktop) -->
    <div class="flex sm:block overflow-x-auto snap-x gap-3 pb-3 sm:pb-0 scrollbar-none space-y-0 sm:space-y-3">
      <div
        v-for="(rule, idx) in rules"
        :key="idx"
        class="snap-start shrink-0 w-[285px] sm:w-auto bg-terminal-surface border border-terminal-border rounded-lg p-4 space-y-3 relative group hover:border-terminal-accent/30 transition-colors"
      >
      <!-- Header row: number + reorder + remove -->
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <span class="w-6 h-6 rounded-md bg-terminal-accent/20 text-terminal-accent text-xs font-mono font-bold flex items-center justify-center">
            {{ idx + 1 }}
          </span>
          <span class="text-[11px] font-mono text-gray-500 uppercase">
            {{ rule.condition.type === 'ALWAYS' ? 'Fallback' : 'Priority' }} Rule
          </span>
        </div>
        <div class="flex items-center space-x-1">
          <button
            type="button"
            class="w-6 h-6 rounded text-gray-500 hover:text-gray-200 hover:bg-terminal-border/50 flex items-center justify-center text-xs transition-colors"
            :disabled="idx === 0"
            @click="moveRule(idx, -1)"
          >▲</button>
          <button
            type="button"
            class="w-6 h-6 rounded text-gray-500 hover:text-gray-200 hover:bg-terminal-border/50 flex items-center justify-center text-xs transition-colors"
            :disabled="idx === rules.length - 1"
            @click="moveRule(idx, 1)"
          >▼</button>
          <button
            type="button"
            class="w-6 h-6 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center text-xs transition-colors"
            @click="removeRule(idx)"
          ><X :size="13" /></button>
        </div>
      </div>

      <!-- Condition -->
      <div class="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <FormField
          label="Condition"
          :class="rule.condition.type === 'ALWAYS' ? 'sm:col-span-8' : 'sm:col-span-5'"
        >
          <select
            :value="rule.condition.type"
            @change="updateConditionType(idx, ($event.target as HTMLSelectElement).value as SimulationConditionType)"
            class="w-full bg-terminal-bg border border-terminal-border rounded-md px-3 py-2 text-sm font-mono text-gray-200 focus:outline-none focus:border-terminal-accent"
          >
            <option v-for="ct in conditionTypes" :key="ct.value" :value="ct.value">
              {{ ct.label }}
            </option>
          </select>
        </FormField>

        <!-- Condition params -->
        <FormField v-if="rule.condition.type === 'UNTIL_DATE'" label="Until Date" class="sm:col-span-4">
          <AppInput
            :modelValue="rule.condition.date || ''"
            @update:modelValue="updateRule(idx, { condition: { ...rule.condition, date: $event } })"
            placeholder="2030-06"
            monospace
          />
        </FormField>

        <template v-if="rule.condition.type === 'BETWEEN_DATES'">
          <FormField label="Start (de la)" class="sm:col-span-3">
            <AppInput
              :modelValue="rule.condition.startDate || ''"
              @update:modelValue="updateRule(idx, { condition: { ...rule.condition, startDate: $event } })"
              placeholder="2029-01"
              monospace
            />
          </FormField>
          <FormField label="End (pana la)" class="sm:col-span-3">
            <AppInput
              :modelValue="rule.condition.date || ''"
              @update:modelValue="updateRule(idx, { condition: { ...rule.condition, date: $event } })"
              placeholder="2030-05"
              monospace
            />
          </FormField>
        </template>

        <template v-if="rule.condition.type === 'UNTIL_DEPOSIT'">
          <FormField label="Target Instrument" class="sm:col-span-4">
            <select
              :value="rule.targetInstrumentId || ''"
              @change="updateRule(idx, { targetInstrumentId: ($event.target as HTMLSelectElement).value })"
              class="w-full bg-terminal-bg border border-terminal-border rounded-md px-3 py-2 text-xs font-mono font-bold text-terminal-accent focus:outline-none focus:border-terminal-accent"
            >
              <option value="">— Total Cash / All Deposits —</option>
              <option v-for="inst in (instruments || [])" :key="inst.id" :value="inst.id">
                {{ inst.name }} ({{ inst.currency }})
              </option>
            </select>
          </FormField>
          <FormField label="Target Balance Amount" class="sm:col-span-3">
            <AppInput
              :modelValue="rule.condition.amount || ''"
              @update:modelValue="updateRule(idx, { condition: { ...rule.condition, amount: $event } })"
              type="number"
              placeholder="50000"
              monospace
            />
          </FormField>
        </template>

        <FormField v-if="rule.condition.type === 'UNTIL_STOCK_COUNT'" label="Stock Count" class="sm:col-span-4">
          <AppInput
            :modelValue="String(rule.condition.count ?? '')"
            @update:modelValue="updateRule(idx, { condition: { ...rule.condition, count: parseInt($event) || 0 } })"
            type="number"
            placeholder="5"
            monospace
          />
        </FormField>

        <!-- Mode -->
        <FormField
          label="Mode"
          :class="rule.condition.type === 'ALWAYS' ? 'sm:col-span-4' : 'sm:col-span-3'"
        >
          <select
            :value="rule.mode"
            @change="updateRule(idx, { mode: ($event.target as HTMLSelectElement).value as 'PERCENT' | 'AMOUNT' })"
            class="w-full bg-terminal-bg border border-terminal-border rounded-md px-3 py-2 text-sm font-mono text-gray-200 focus:outline-none focus:border-terminal-accent"
          >
            <option value="PERCENT">Percentage</option>
            <option value="AMOUNT">Fixed Amount</option>
          </select>
        </FormField>
      </div>

      <!-- PERCENT mode: sliders (moving in tandem to always equal 100%) -->
      <div v-if="rule.mode === 'PERCENT'" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Deposit %">
          <div class="flex items-center space-x-2">
            <input
              type="range"
              min="0" max="100"
              :value="parseInt(String(rule.depositPct || '0'))"
              @input="updateRule(idx, {
                depositPct: ($event.target as HTMLInputElement).value,
                stocksPct: String(100 - parseInt(($event.target as HTMLInputElement).value || '0'))
              })"
              class="flex-1 accent-terminal-accent h-1.5 bg-terminal-border rounded-full cursor-pointer"
            />
            <span class="text-xs font-mono text-gray-300 w-10 text-right">{{ rule.depositPct || '0' }}%</span>
          </div>
        </FormField>
        <FormField label="Stocks %">
          <div class="flex items-center space-x-2">
            <input
              type="range"
              min="0" max="100"
              :value="parseInt(String(rule.stocksPct || '0'))"
              @input="updateRule(idx, {
                stocksPct: ($event.target as HTMLInputElement).value,
                depositPct: String(100 - parseInt(($event.target as HTMLInputElement).value || '0'))
              })"
              class="flex-1 accent-terminal-accent h-1.5 bg-terminal-border rounded-full cursor-pointer"
            />
            <span class="text-xs font-mono text-gray-300 w-10 text-right">{{ rule.stocksPct || '0' }}%</span>
          </div>
        </FormField>
      </div>

      <!-- AMOUNT mode: inputs -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Deposit Amount">
          <AppInput
            :modelValue="rule.depositAmount || ''"
            @update:modelValue="updateRule(idx, { depositAmount: $event })"
            type="number"
            placeholder="500.00"
            monospace
          />
        </FormField>
        <FormField label="Stocks Amount">
          <AppInput
            :modelValue="rule.stocksAmount || ''"
            @update:modelValue="updateRule(idx, { stocksAmount: $event })"
            type="number"
            placeholder="500.00"
            monospace
          />
        </FormField>
      </div>

      <!-- Destination Instrument Selector for Deposit % or Amount -->
      <div v-if="instruments && instruments.length > 0" class="pt-1">
        <FormField label="Destinație Alocare Depozit / Titluri (Unde merg banii alocați pe depozit)">
          <select
            :value="rule.targetInstrumentId || ''"
            @change="updateRule(idx, { targetInstrumentId: ($event.target as HTMLSelectElement).value })"
            class="w-full bg-terminal-bg border border-terminal-border rounded-md px-3 py-2 text-xs font-mono font-bold text-terminal-accent focus:outline-none focus:border-terminal-accent"
          >
            <option value="">— Sold General Cash / Depozit Implicit —</option>
            <option v-for="inst in instruments" :key="inst.id" :value="inst.id">
              {{ inst.type === 'FUND' ? '📊 Fond' : inst.type === 'BOND' ? '📜 Obligațiune' : '🏦 Depozit' }} {{ inst.name }} ({{ inst.currency }}) — {{ inst.type === 'FUND' ? 'Randament' : 'Dobândă' }}: {{ inst.annualRatePct }}%/an
            </option>
          </select>
        </FormField>
      </div>
    </div>

    <!-- Empty Dashed Card Slide at the end of Carousel on Mobile -->
    <div
      @click="addRule"
      class="snap-start shrink-0 w-[180px] sm:hidden border-2 border-dashed border-terminal-accent/30 hover:border-terminal-accent/70 bg-terminal-surface/30 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors group text-center my-auto"
    >
      <div class="w-10 h-10 rounded-full bg-terminal-accent/10 border border-terminal-accent/30 flex items-center justify-center text-terminal-accent group-hover:scale-110 transition-transform">
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </div>
      <span class="text-xs font-mono font-bold text-terminal-accent uppercase tracking-wider">+ Add Rule</span>
    </div>
  </div>

  <div v-if="rules.length === 0" class="text-center py-6 text-xs font-mono text-gray-500 border border-dashed border-terminal-border rounded-lg">
    No allocation rules defined. Add a rule to specify how income is split.
  </div>
</div>
</template>
