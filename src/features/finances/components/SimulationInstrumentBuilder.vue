<script setup lang="ts">
import { X } from 'lucide-vue-next';
import type { SimulationInstrumentConfig } from '../../../shared/api/types';
import AppButton from '../../../shared/ui/atoms/AppButton.vue';
import TickerSearchInput, { type TickerSearchResult } from '../../../shared/ui/molecules/TickerSearchInput.vue';

const props = defineProps<{
  modelValue: SimulationInstrumentConfig[];
}>();

const emit = defineEmits<{
  'update:modelValue': [instruments: SimulationInstrumentConfig[]];
}>();

const currencyOptions = ['RON', 'EUR', 'USD', 'GBP'];
const typeOptions: { value: 'DEPOSIT' | 'BOND' | 'FUND'; label: string; icon: string }[] = [
  { value: 'DEPOSIT', label: 'Depozit', icon: '🏦' },
  { value: 'BOND', label: 'Obligațiuni', icon: '📜' },
  { value: 'FUND', label: 'Fond Investiții', icon: '📊' },
];

function addInstrument() {
  const count = props.modelValue.length + 1;
  const newInst: SimulationInstrumentConfig = {
    id: `inst-${Date.now()}`,
    name: count === 1 ? 'Depozit CEC RON' : 'FIDELIS EUR 5Y',
    type: count === 1 ? 'DEPOSIT' : 'BOND',
    currency: count === 1 ? 'RON' : 'EUR',
    annualRatePct: count === 1 ? '6.50' : '5.80',
    startingBalance: count === 1 ? '25000.00' : '5000.00',
    bondUnitNominal: '99',
    maturityYears: 5,
  };
  emit('update:modelValue', [...props.modelValue, newInst]);
}

function removeInstrument(idx: number) {
  emit('update:modelValue', props.modelValue.filter((_, i) => i !== idx));
}

function updateInstrument(idx: number, patch: Partial<SimulationInstrumentConfig>) {
  const updated = props.modelValue.map((inst, i) => (i === idx ? { ...inst, ...patch } : inst));
  emit('update:modelValue', updated);
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between text-xs font-mono bg-terminal-surface/70 p-3 rounded-xl border border-terminal-border">
      <span class="text-gray-300 font-bold flex items-center gap-1.5">
        <span>🏦</span> <strong>Instrumente Financiare (Depozite / Obligațiuni / Fonduri):</strong>
      </span>
      <span class="text-terminal-accent font-extrabold">{{ modelValue.length }} Instrumente Activelor Fixe</span>
    </div>

    <!-- Carousel on mobile, Grid on desktop -->
    <div class="flex sm:grid sm:grid-cols-2 gap-3 sm:gap-4 overflow-x-auto snap-x pb-3 sm:pb-0 scrollbar-none">
      <div
        v-for="(inst, idx) in modelValue"
        :key="inst.id || idx"
        class="snap-start shrink-0 w-[285px] sm:w-auto p-4 bg-terminal-surface/60 border border-terminal-border rounded-xl space-y-3 relative hover:border-terminal-accent/50 transition-colors"
      >
        <button
          type="button"
          class="absolute top-3 right-3 text-gray-500 hover:text-red-400 text-xs p-1"
          @click="removeInstrument(idx)"
          title="Șterge Instrument"
        >
          <X :size="13" />
        </button>

        <div class="flex items-center space-x-2">
          <span class="px-2 py-0.5 rounded bg-terminal-bg border border-terminal-border text-[11px] font-mono font-extrabold text-terminal-accent">
            #{{ idx + 1 }}
          </span>
          <input
            type="text"
            :value="inst.name"
            @input="(e) => updateInstrument(idx, { name: (e.target as HTMLInputElement).value })"
            placeholder="Denumire (ex: FIDELIS EUR 5Y)"
            class="bg-terminal-bg border border-terminal-border rounded px-2.5 py-1 text-xs font-mono font-bold text-gray-100 w-full focus:outline-none focus:border-terminal-accent"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono">
          <div>
            <label class="block text-[10px] text-gray-400 uppercase mb-1">Tip Instrument</label>
            <!-- Mobile Native Dropdown -->
            <select
              :value="inst.type"
              @change="(e) => updateInstrument(idx, { type: (e.target as HTMLSelectElement).value as any })"
              class="sm:hidden w-full bg-terminal-bg border border-terminal-border rounded px-2.5 py-1.5 text-xs font-mono font-bold text-terminal-accent focus:outline-none focus:border-terminal-accent"
            >
              <option v-for="tOpt in typeOptions" :key="tOpt.value" :value="tOpt.value">
                {{ tOpt.icon }} {{ tOpt.label }}
              </option>
            </select>

            <!-- Desktop Pill Buttons -->
            <div class="hidden sm:flex items-center space-x-1 bg-terminal-bg border border-terminal-border rounded p-0.5">
              <button
                v-for="tOpt in typeOptions"
                :key="tOpt.value"
                type="button"
                class="flex-1 py-1 px-1 rounded text-[10px] font-bold text-center transition-colors truncate"
                :class="inst.type === tOpt.value ? 'bg-terminal-accent text-terminal-bg' : 'text-gray-400 hover:text-gray-200'"
                @click="updateInstrument(idx, { type: tOpt.value })"
              >
                {{ tOpt.icon }} {{ tOpt.label }}
              </button>
            </div>
          </div>

          <div>
            <label class="block text-[10px] text-gray-400 uppercase mb-1">Valută</label>
            <select
              :value="inst.currency"
              @change="(e) => updateInstrument(idx, { currency: (e.target as HTMLSelectElement).value })"
              class="w-full bg-terminal-bg border border-terminal-border rounded px-2 py-1 text-xs font-mono font-bold text-terminal-accent focus:outline-none"
            >
              <option v-for="c in currencyOptions" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
        </div>

        <div v-if="inst.type === 'FUND'" class="text-xs font-mono">
          <label class="block text-[10px] text-gray-400 uppercase mb-1">Simbol ETF / Fond (Master Search)</label>
          <TickerSearchInput
            :model-value="inst.ticker || ''"
            @update:model-value="(val) => updateInstrument(idx, { ticker: val })"
            @select="(item) => { if (item.currency) updateInstrument(idx, { currency: item.currency }); }"
            placeholder="Căutare ETF (ex: VWCE, EUNL)..."
          />
        </div>

        <div class="grid grid-cols-2 gap-2.5 text-xs font-mono">
          <div>
            <label class="block text-[10px] text-gray-400 uppercase mb-1 truncate">Suma Inițială</label>
            <input
              type="text"
              :value="inst.startingBalance"
              @input="(e) => updateInstrument(idx, { startingBalance: (e.target as HTMLInputElement).value })"
              class="w-full bg-terminal-bg border border-terminal-border rounded px-2 py-1 text-xs font-mono text-gray-100 focus:outline-none focus:border-terminal-accent text-right font-bold"
            />
          </div>

          <div>
            <label class="block text-[10px] text-gray-400 uppercase mb-1 truncate">{{ inst.type === 'FUND' ? 'Randament Estimat' : 'Dobândă % / An' }}</label>
            <input
              type="text"
              :value="inst.annualRatePct"
              @input="(e) => updateInstrument(idx, { annualRatePct: (e.target as HTMLInputElement).value })"
              class="w-full bg-terminal-bg border border-terminal-border rounded px-2 py-1 text-xs font-mono text-terminal-accent focus:outline-none focus:border-terminal-accent text-right font-bold"
            />
          </div>

          <div v-if="inst.type === 'BOND'">
            <label class="block text-[10px] text-gray-400 uppercase mb-1 truncate">Preț Nominal / Titlu</label>
            <input
              type="text"
              :value="inst.bondUnitNominal || '99'"
              @input="(e) => updateInstrument(idx, { bondUnitNominal: (e.target as HTMLInputElement).value })"
              placeholder="99 RON"
              class="w-full bg-terminal-bg border border-terminal-border rounded px-2 py-1 text-xs font-mono text-gray-100 focus:outline-none focus:border-terminal-accent text-right"
            />
          </div>

          <div v-if="inst.type === 'BOND'">
            <label class="block text-[10px] text-gray-400 uppercase mb-1 truncate">Maturitate (Ani)</label>
            <input
              type="number"
              min="1"
              max="30"
              :value="inst.maturityYears || 5"
              @input="(e) => updateInstrument(idx, { maturityYears: Number((e.target as HTMLInputElement).value) || 5 })"
              class="w-full bg-terminal-bg border border-terminal-border rounded px-2 py-1 text-xs font-mono text-gray-100 focus:outline-none focus:border-terminal-accent text-right"
            />
          </div>
        </div>
      </div>

      <!-- Empty Dashed Card Slide at the end of Carousel on Mobile -->
      <div
        @click="addInstrument"
        class="snap-start shrink-0 w-[180px] sm:hidden border-2 border-dashed border-terminal-accent/30 hover:border-terminal-accent/70 bg-terminal-surface/30 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors group text-center my-auto"
      >
        <div class="w-10 h-10 rounded-full bg-terminal-accent/10 border border-terminal-accent/30 flex items-center justify-center text-terminal-accent group-hover:scale-110 transition-transform">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </div>
        <span class="text-xs font-mono font-bold text-terminal-accent uppercase tracking-wider">+ Instrument</span>
      </div>
    </div>

    <!-- Desktop Add Button -->
    <div class="hidden sm:block">
      <AppButton variant="secondary" @click="addInstrument">
        + Adaugă Instrument Nou
      </AppButton>
    </div>
  </div>
</template>
