<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { X, Pencil } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import AppButton from '../../../shared/ui/atoms/AppButton.vue';
import AppInput from '../../../shared/ui/atoms/AppInput.vue';
import FormField from '../../../shared/ui/molecules/FormField.vue';
import SimulationRuleBuilder from './SimulationRuleBuilder.vue';
import SimulationStockBuilder from './SimulationStockBuilder.vue';
import SimulationGroupBuilder from './SimulationGroupBuilder.vue';
import SimulationInstrumentBuilder from './SimulationInstrumentBuilder.vue';
import {
  useSimulationsQuery,
  useSaveSimulationMutation,
  useUpdateSimulationMutation,
  useDeleteSimulationMutation,
  useRunSimulationMutation
} from '../../../queries/useSimulationQuery';
import AdaptiveOverlay from '../../../shared/ui/organisms/AdaptiveOverlay.vue';
import { useFinancesStore } from '../../../stores/finances';
import { exportSimulationToExcel } from '../utils/exportSimulation';
import type {
  SimulationConfig,
  SimulationAllocationRule,
  SimulationStockRule,
  SimulationStartingHolding,
  SimulationPlannedExpense,
  SimulationResult,
  SavedSimulation,
  SimulationStockGroup,
  SimulationInstrumentConfig
} from '../../../shared/api/types';

const { t } = useI18n();
const financesStore = useFinancesStore();
const showMobileConfig = ref(false);

const { data: savedSimulations } = useSimulationsQuery();
const saveMutation = useSaveSimulationMutation();
const updateMutation = useUpdateSimulationMutation();
const deleteMutation = useDeleteSimulationMutation();
const runMutation = useRunSimulationMutation();

const selectedPresetId = ref('');
const presetName = ref('My Plan 2026');

const startMonth = ref(financesStore.selectedMonth || new Date().toISOString().substring(0, 7));
const horizonYear = ref(2036);
const baseCurrency = ref('RON');
const startingDeposit = ref('25000.00');
const depositAnnualRatePct = ref('6.50');
const stockScenario = ref<'CONSERVATIVE' | 'MODERATE' | 'HISTORICAL' | string>('MODERATE');
const coverShortfallFrom = ref<'DEPOSIT' | 'NONE'>('NONE');
const reinvestDividends = ref(true);

const instruments = ref<SimulationInstrumentConfig[]>([
  {
    id: 'inst-1',
    name: 'Depozit CEC RON',
    type: 'DEPOSIT',
    currency: 'RON',
    annualRatePct: '6.50',
    startingBalance: '25000.00'
  },
  {
    id: 'inst-2',
    name: 'FIDELIS EUR 5Y',
    type: 'BOND',
    currency: 'EUR',
    annualRatePct: '5.80',
    startingBalance: '5000.00',
    bondUnitNominal: '100',
    maturityYears: 5
  }
]);

const allocationRules = ref<SimulationAllocationRule[]>([
  {
    condition: { type: 'ALWAYS' },
    mode: 'PERCENT',
    depositPct: '40',
    stocksPct: '60'
  }
]);

const useGroupBuilder = ref(true);
const stockGroups = ref<SimulationStockGroup[]>([
  {
    id: 'grp-1',
    name: 'Stage 1: TLV Priority Accumulation',
    weightPct: 0,
    mode: 'SEQUENTIAL',
    members: [
      { symbol: 'TLV.RO', weightPct: 100, condition: { type: 'stock_count', value: '400' } }
    ]
  },
  {
    id: 'grp-2',
    name: 'Stage 2: BVB Hybrid Basket',
    weightPct: 0,
    mode: 'WEIGHTED',
    members: [
      { symbol: 'H2O.RO', weightPct: 20, condition: { type: 'stock_count', value: '75' } },
      { symbol: 'SNP.RO', weightPct: 50, condition: { type: 'stock_count', value: '10000' } },
      { symbol: 'SNG.RO', weightPct: 30, condition: { type: 'stock_count', value: '1000' } }
    ]
  }
]);

const stockRules = ref<SimulationStockRule[]>([
  {
    symbol: 'VWCE.DE',
    weightPct: '70',
    condition: { type: 'ALWAYS' }
  },
  {
    symbol: 'SXR8.DE',
    weightPct: '30',
    condition: { type: 'ALWAYS' }
  }
]);

const startingHoldings = ref<SimulationStartingHolding[]>([]);
const plannedExpenses = ref<SimulationPlannedExpense[]>([]);
const newExpMonth = ref('2028-06');
const newExpAmount = ref('15000.00');
const newExpLabel = ref('Avans Auto');

const simulationResult = ref<SimulationResult | null>(null);
const isRunning = ref(false);
const runError = ref('');
const showMonthlyRows = ref(false);
const expandedRows = ref<Record<string, boolean>>({});
const selectedRowDetail = ref<any>(null);

function toggleRowDetails(key: string) {
  expandedRows.value[key] = !expandedRows.value[key];
}

function buildConfig(): SimulationConfig {
  const hasInstruments = instruments.value.length > 0;
  return {
    startMonth: startMonth.value,
    horizonYear: Number(horizonYear.value) || 2036,
    baseCurrency: baseCurrency.value,
    startingDeposit: hasInstruments ? '0' : startingDeposit.value || '0',
    depositAnnualRatePct: hasInstruments ? '0' : depositAnnualRatePct.value || '0',
    stockScenario: stockScenario.value,
    allocationRules: allocationRules.value,
    stockRules: stockRules.value,
    stockGroups: useGroupBuilder.value ? stockGroups.value : null,
    reinvestDividends: reinvestDividends.value,
    startingHoldings: startingHoldings.value,
    plannedExpenses: plannedExpenses.value,
    coverShortfallFrom: coverShortfallFrom.value,
    instruments: instruments.value
  };
}

async function handleRunSimulation() {
  isRunning.value = true;
  runError.value = '';
  try {
    const res = await runMutation.mutateAsync(buildConfig());
    simulationResult.value = res;
  } catch (err: unknown) {
    runError.value = err instanceof Error ? err.message : 'Simulation run failed';
  } finally {
    isRunning.value = false;
  }
}

async function handleSavePreset() {
  if (!presetName.value) return;
  if (selectedPresetId.value) {
    await updateMutation.mutateAsync({
      id: selectedPresetId.value,
      name: presetName.value,
      config: buildConfig()
    });
  } else {
    const created: SavedSimulation = await saveMutation.mutateAsync({
      name: presetName.value,
      config: buildConfig()
    });
    selectedPresetId.value = created.id;
  }
}

async function handleDeletePreset() {
  if (!selectedPresetId.value) return;
  await deleteMutation.mutateAsync(selectedPresetId.value);
  selectedPresetId.value = '';
}

function handleLoadPreset() {
  const found = savedSimulations.value?.find((s) => s.id === selectedPresetId.value);
  if (!found) return;
  presetName.value = found.name;
  startMonth.value = found.config.startMonth || financesStore.selectedMonth || new Date().toISOString().substring(0, 7);
  horizonYear.value = found.config.horizonYear;
  baseCurrency.value = found.config.baseCurrency;
  startingDeposit.value = found.config.startingDeposit;
  depositAnnualRatePct.value = found.config.depositAnnualRatePct;
  stockScenario.value = found.config.stockScenario;
  allocationRules.value = [...found.config.allocationRules];
  stockRules.value = [...found.config.stockRules];
  plannedExpenses.value = [...found.config.plannedExpenses];
  startingHoldings.value = found.config.startingHoldings ? [...found.config.startingHoldings] : [];
  stockGroups.value = found.config.stockGroups ? [...found.config.stockGroups] : [];
  useGroupBuilder.value = !!(found.config.stockGroups && found.config.stockGroups.length > 0);
  reinvestDividends.value = found.config.reinvestDividends ?? true;
  instruments.value = found.config.instruments ? [...found.config.instruments] : instruments.value;
  if (found.config.coverShortfallFrom) {
    coverShortfallFrom.value = found.config.coverShortfallFrom;
  }
  handleRunSimulation();
}

function addPlannedExpense() {
  if (!newExpAmount.value || !newExpMonth.value) return;
  plannedExpenses.value.push({
    dateMonth: newExpMonth.value,
    amount: newExpAmount.value,
    label: newExpLabel.value || 'Planned Expense'
  });
  newExpAmount.value = '';
  newExpLabel.value = '';
}

function removePlannedExpense(idx: number) {
  plannedExpenses.value.splice(idx, 1);
}

function formatCurrency(val: string | undefined, curr = 'RON') {
  if (!val) return `0.00 ${curr}`;
  const num = parseFloat(val) || 0;
  return `${new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num)} ${curr}`;
}

const currencyBreakdown = computed<Record<string, number>>(() => {
  if (!simulationResult.value?.summary?.currencyBreakdownJson) return {};
  try {
    return JSON.parse(simulationResult.value.summary.currencyBreakdownJson);
  } catch {
    return {};
  }
});

const marketExposure = computed<Record<string, number>>(() => {
  if (!simulationResult.value?.summary?.marketExposureJson) return {};
  try {
    return JSON.parse(simulationResult.value.summary.marketExposureJson);
  } catch {
    return {};
  }
});

const netWorthByCurrency = computed<Record<string, number>>(() => {
  if (!simulationResult.value?.summary?.netWorthByCurrencyJson) return {};
  try {
    return JSON.parse(simulationResult.value.summary.netWorthByCurrencyJson);
  } catch {
    return {};
  }
});

interface PerStockSummaryItem {
  symbol: string;
  shares: number;
  invested: number;
  dividends: number;
  value: number;
  market: string;
}

const perStockSummary = computed<PerStockSummaryItem[]>(() => {
  if (!simulationResult.value?.summary?.perStockSummaryJson) return [];
  try {
    return JSON.parse(simulationResult.value.summary.perStockSummaryJson);
  } catch {
    return [];
  }
});

const stockValueByMarket = computed<Record<string, number>>(() => {
  if (!simulationResult.value?.summary?.stockValueByMarketJson) return {};
  try {
    return JSON.parse(simulationResult.value.summary.stockValueByMarketJson);
  } catch {
    return {};
  }
});

function handleExportExcel() {
  if (!simulationResult.value) return;
  exportSimulationToExcel(simulationResult.value, instruments.value, baseCurrency.value, presetName.value);
}

const gridInstruments = computed(() => {
  return instruments.value.map(inst => ({
    id: inst.id,
    name: inst.name,
    currency: inst.currency,
    type: inst.type,
  }));
});

function getInstrumentBalance(
  perInstrument: Array<{ instrumentId: string; balance: string; interestEarned: string; currency: string; type: string; units?: string | null; nav?: string | null }> | null | undefined,
  instrumentId: string
): { balance: string; interest: string; currency: string; units: string | null; nav: string | null } | null {
  if (!perInstrument) return null;
  const snap = perInstrument.find(i => i.instrumentId === instrumentId);
  if (!snap) return null;
  return { balance: snap.balance, interest: snap.interestEarned, currency: snap.currency, units: snap.units ?? null, nav: snap.nav ?? null };
}

const gridColSpan = computed(() => 6 + gridInstruments.value.length);

function yearDividends(row: { perStock?: Array<{ dividends: string }> | null }): number {
  if (!row.perStock?.length) return 0;
  return row.perStock.reduce((acc, s) => acc + (parseFloat(s.dividends) || 0), 0);
}

function annualDividendForJune(juneMonth: string): number {
  if (!simulationResult.value?.monthlyRows) return 0;
  const year = juneMonth.substring(0, 4);
  const rows = simulationResult.value.monthlyRows;
  // Try yearly row first (most accurate)
  const yearRow = simulationResult.value.rows.find(r => r.month === year);
  if (yearRow) {
    const annual = yearDividends(yearRow);
    if (annual > 0) return annual;
  }
  // Fallback: December cumulative delta (cumulative[Dec_Y] - cumulative[Dec_Y-1])
  const decRow = rows.find(r => r.month === `${year}-12`);
  const prevDecRow = rows.find(r => r.month === `${parseInt(year) - 1}-12`);
  const decTotal = decRow?.perStock?.reduce((acc, s) => acc + (parseFloat(s.dividends) || 0), 0) ?? 0;
  const prevTotal = prevDecRow?.perStock?.reduce((acc, s) => acc + (parseFloat(s.dividends) || 0), 0) ?? 0;
  return decTotal - prevTotal;
}

function getInstrumentDeltas(
  monthlyRows: Array<{ month: string; perInstrument?: Array<{ instrumentId: string; balance: string; interestEarned: string }> | null }>,
  currentMonth: string,
  instrumentId: string
): { total: number; interest: number; allocation: number } {
  const idx = monthlyRows.findIndex(r => r.month === currentMonth);
  if (idx < 0) return { total: 0, interest: 0, allocation: 0 };
  const cur = monthlyRows[idx]?.perInstrument?.find(i => i.instrumentId === instrumentId);
  const curBal = parseFloat(cur?.balance || '0');
  const curInt = parseFloat(cur?.interestEarned || '0');
  if (idx === 0) {
    const startBal = parseFloat(instruments.value.find(i => i.id === instrumentId)?.startingBalance || '0');
    const total = curBal - startBal;
    const interest = curInt;
    return { total, interest, allocation: total - interest };
  }
  const prev = monthlyRows[idx - 1]?.perInstrument?.find(i => i.instrumentId === instrumentId);
  const prevBal = parseFloat(prev?.balance || '0');
  const prevInt = parseFloat(prev?.interestEarned || '0');
  const total = curBal - prevBal;
  const interest = curInt - prevInt;
  return { total, interest, allocation: total - interest };
}

// Automatically trigger initial run on mount
watch(() => true, () => {
  handleRunSimulation();
}, { immediate: true });
</script>

<template>
  <div class="space-y-6 select-none bg-transparent sm:bg-terminal-surface/40 border-0 sm:border sm:border-terminal-border rounded-2xl p-0 sm:p-6">
    <!-- Section Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-terminal-border">
      <div class="flex items-center space-x-2">
        <span class="text-xl text-purple-400">📈</span>
        <div>
          <h2 class="text-base font-mono font-bold text-gray-100 uppercase tracking-wide">
            Simulate Future — Net Worth What-If Engine
          </h2>
          <p class="text-xs font-mono text-gray-400">
            Deterministic yearly projection over your investment horizon
          </p>
        </div>
      </div>

      <!-- Presets Toolbar (Desktop) -->
      <div class="hidden sm:flex flex-wrap items-center gap-2">
        <select
          v-model="selectedPresetId"
          @change="handleLoadPreset"
          class="bg-terminal-bg border border-terminal-border rounded-lg px-3 py-1.5 text-xs font-mono text-gray-200"
        >
          <option value="">— Select Saved Preset —</option>
          <option v-for="sim in (savedSimulations || [])" :key="sim.id" :value="sim.id">
            {{ sim.name }}
          </option>
        </select>
        <AppInput
          v-model="presetName"
          placeholder="Preset Name"
          class="w-32 text-xs"
        />
        <AppButton variant="secondary" @click="handleSavePreset">
          {{ selectedPresetId ? 'Update Preset' : 'Save As Preset' }}
        </AppButton>
        <AppButton
          v-if="selectedPresetId"
          variant="secondary"
          @click="handleDeletePreset"
          class="text-red-400 border-red-500/30"
        >
          Delete
        </AppButton>
      </div>

      <!-- Presets & Inputs Button (Mobile Trigger) -->
      <button
        type="button"
        @click="showMobileConfig = true"
        class="sm:hidden w-full flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-xs font-mono font-bold text-gray-200 hover:bg-white/[0.08]"
      >
        <span class="flex items-center gap-2">
          <span>⚙️</span>
          <span>Parametri Simulare ({{ startMonth }} · {{ horizonYear }} · {{ baseCurrency }})</span>
        </span>
        <span class="text-terminal-accent flex items-center gap-1"><Pencil :size="12" /> Config</span>
      </button>
    </div>

    <!-- Main Inputs Grid (Desktop) -->
    <div class="hidden sm:grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <FormField label="Start Month" required>
        <AppInput v-model="startMonth" type="month" monospace />
      </FormField>
      <FormField label="Horizon Year" required>
        <AppInput v-model="horizonYear" type="number" monospace />
      </FormField>
      <FormField label="Base Currency">
        <select
          v-model="baseCurrency"
          class="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-xs font-mono text-gray-200"
        >
          <option value="RON">RON</option>
          <option value="EUR">EUR</option>
          <option value="USD">USD</option>
        </select>
      </FormField>
      <FormField label="Stock Scenario">
        <select
          v-model="stockScenario"
          class="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-xs font-mono text-gray-200"
        >
          <option value="CONSERVATIVE">Conservative (~5% p.a.)</option>
          <option value="MODERATE">Moderate (~8% p.a.)</option>
          <option value="HISTORICAL">Historical S&P/ACWI</option>
        </select>
      </FormField>
      <FormField label="Dividends">
        <label class="flex items-center space-x-2 pt-2 cursor-pointer">
          <input
            type="checkbox"
            v-model="reinvestDividends"
            class="rounded border-terminal-border bg-terminal-bg text-terminal-accent focus:ring-terminal-accent"
          />
          <span class="text-xs font-mono text-gray-200">Reinvest Dividends</span>
        </label>
      </FormField>
    </div>

    <!-- Mobile Config Sliding Sheet Overlay -->
    <AdaptiveOverlay
      v-model="showMobileConfig"
      title="Parametri & Preset-uri Simulare"
      :max-width="420"
    >
      <div class="space-y-4 p-1">
        <div class="p-3 bg-white/[0.04] border border-white/10 rounded-2xl space-y-3">
          <label class="block text-xs font-mono font-bold text-gray-300 uppercase">Preset-uri Salvate</label>
          <select
            v-model="selectedPresetId"
            @change="handleLoadPreset"
            class="w-full bg-terminal-bg border border-terminal-border rounded-xl px-3 py-2 text-xs font-mono text-gray-200"
          >
            <option value="">— Select Saved Preset —</option>
            <option v-for="sim in (savedSimulations || [])" :key="sim.id" :value="sim.id">
              {{ sim.name }}
            </option>
          </select>
          <div class="flex items-center gap-2">
            <AppInput v-model="presetName" placeholder="Preset Name" class="flex-1 text-xs" />
            <AppButton variant="secondary" @click="handleSavePreset" size="sm">Save</AppButton>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <FormField label="Start Month" required>
            <AppInput v-model="startMonth" type="month" monospace />
          </FormField>
          <FormField label="Horizon Year" required>
            <AppInput v-model="horizonYear" type="number" monospace />
          </FormField>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <FormField label="Base Currency">
            <select
              v-model="baseCurrency"
              class="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-xs font-mono text-gray-200"
            >
              <option value="RON">RON</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </select>
          </FormField>
          <FormField label="Stock Scenario">
            <select
              v-model="stockScenario"
              class="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-xs font-mono text-gray-200"
            >
              <option value="CONSERVATIVE">Conservative (~5%)</option>
              <option value="MODERATE">Moderate (~8%)</option>
              <option value="HISTORICAL">Historical</option>
            </select>
          </FormField>
        </div>

        <div class="pt-2">
          <AppButton variant="primary" class="w-full" @click="showMobileConfig = false">
            Gata (Aplică Parametrii)
          </AppButton>
        </div>
      </div>
    </AdaptiveOverlay>

    <!-- Fixed Income & Deposits Manager -->
    <div class="bg-transparent sm:bg-white/[0.02] border-0 sm:border sm:border-white/10 rounded-2xl p-0 sm:p-6 space-y-4">
      <h3 class="text-xs font-mono font-bold text-terminal-accent uppercase tracking-wider flex items-center gap-2">
        <span>🏦</span> 1. Instrumente Financiare (Depozite / Obligațiuni / Fonduri de Investiții)
      </h3>
      <SimulationInstrumentBuilder v-model="instruments" />
    </div>

    <!-- Rule Builders Layout -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
      <!-- Allocation Rules Column -->
      <div class="bg-transparent sm:bg-white/[0.02] border-0 sm:border sm:border-white/10 rounded-2xl p-0 sm:p-6 space-y-4">
        <h3 class="text-xs font-mono font-bold text-terminal-accent uppercase tracking-wider">
          1.B Monthly Allocation Rules
        </h3>
        <SimulationRuleBuilder :rules="allocationRules" :instruments="instruments" @update:rules="allocationRules = $event" />
      </div>

      <!-- Stock Selection Rules Column -->
      <div class="bg-transparent sm:bg-white/[0.02] border-0 sm:border sm:border-white/10 rounded-2xl p-0 sm:p-6 space-y-4">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <h3 class="text-xs font-mono font-bold text-terminal-accent uppercase tracking-wider">
            2. Stock Allocation Strategy
          </h3>
          <div class="flex items-center space-x-1 bg-terminal-surface-light/60 rounded-xl p-1 border border-white/10">
            <button
              type="button"
              class="px-2.5 py-1 rounded-lg text-xs font-mono transition-colors"
              :class="useGroupBuilder ? 'bg-terminal-accent text-terminal-bg font-bold shadow-sm' : 'text-gray-400 hover:text-gray-100'"
              @click="useGroupBuilder = true"
            >
              Groups (Advanced)
            </button>
            <button
              type="button"
              class="px-2.5 py-1 rounded-lg text-xs font-mono transition-colors"
              :class="!useGroupBuilder ? 'bg-terminal-accent text-terminal-bg font-bold shadow-sm' : 'text-gray-400 hover:text-gray-100'"
              @click="useGroupBuilder = false"
            >
              Simple List
            </button>
          </div>
        </div>

        <!-- Starting Holdings Builder -->
        <div class="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <span class="text-xs font-mono font-bold uppercase text-gray-200 flex items-center gap-1.5">
              <span>📦</span> Holdings Inițiale (Punct de Plecare)
            </span>
            <span class="text-[10px] font-mono text-gray-400">Acțiuni deja deținute</span>
          </div>

          <div v-if="startingHoldings.length > 0" class="space-y-2">
            <div
              v-for="(h, idx) in startingHoldings"
              :key="idx"
              class="flex items-center justify-between p-2.5 bg-terminal-bg/60 border border-white/10 rounded-xl gap-2"
            >
              <input
                type="text"
                v-model="h.symbol"
                placeholder="SYMBOL (ex: TLV.RO)"
                class="w-28 bg-terminal-surface/80 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-gray-100 uppercase focus:outline-none focus:border-terminal-accent"
              />
              <div class="flex items-center space-x-1">
                <input
                  type="text"
                  v-model="h.shares"
                  placeholder="Acțiuni"
                  class="w-20 bg-terminal-surface/80 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-terminal-accent text-right focus:outline-none focus:border-terminal-accent"
                />
                <span class="text-[11px] font-mono text-gray-400">buc</span>
              </div>
              <button
                type="button"
                @click="startingHoldings.splice(idx, 1)"
                class="text-gray-500 hover:text-red-400 px-1 text-xs"
                title="Șterge"
              >
                <X :size="13" />
              </button>
            </div>
          </div>
          <div v-else class="text-[11px] font-mono text-gray-500 italic p-2 bg-terminal-bg/40 rounded border border-dashed border-terminal-border/50">
            Pornire de la 0 acțiuni deținute. Adaugă acțiunile existente dacă deții deja.
          </div>

          <AppButton variant="secondary" size="sm" @click="startingHoldings.push({ symbol: '', shares: '0' })">
            + Adaugă Holdings Inițiale
          </AppButton>
        </div>

        <SimulationGroupBuilder
          v-if="useGroupBuilder"
          v-model="stockGroups"
        />
        <SimulationStockBuilder
          v-else
          :stock-rules="stockRules"
          :starting-holdings="startingHoldings"
          @update:stock-rules="stockRules = $event"
          @update:starting-holdings="startingHoldings = $event"
        />
      </div>
    </div>

    <!-- Planned Expenses Timeline -->
    <div class="bg-transparent sm:bg-white/[0.02] border-0 sm:border sm:border-white/10 rounded-2xl p-0 sm:p-6 space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 class="text-xs font-mono font-bold text-gray-200 uppercase tracking-wider">
          3. Planned Future Expenses (Lump Sums)
        </h3>
        <div class="flex items-center space-x-2">
          <span class="text-xs font-mono text-gray-400">Cover Shortfall From:</span>
          <select
            v-model="coverShortfallFrom"
            class="bg-terminal-bg/70 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-mono text-gray-200 focus:outline-none focus:border-terminal-accent transition-colors"
          >
            <option value="NONE">NONE (Ignore shortfall)</option>
            <option value="DEPOSIT">DEPOSIT (Draw from bank deposit)</option>
          </select>
        </div>
      </div>

      <!-- Add Form Grid -->
      <div class="flex flex-wrap items-center gap-3 pb-3 border-b border-white/10">
        <AppInput v-model="newExpMonth" type="month" class="w-36 text-xs" />
        <AppInput v-model="newExpLabel" placeholder="Expense Description" class="flex-1 text-xs" />
        <AppInput v-model="newExpAmount" type="number" placeholder="Amount" class="w-32 text-xs" />
        <AppButton variant="secondary" @click="addPlannedExpense">+ Add Planned Expense</AppButton>
      </div>

      <!-- Planned Expenses List (Carousel on mobile, Wrap on desktop) -->
      <div class="flex overflow-x-auto snap-x sm:flex-wrap gap-2.5 pb-2 sm:pb-0 scrollbar-none">
        <div
          v-for="(exp, idx) in plannedExpenses"
          :key="idx"
          class="snap-start shrink-0 sm:shrink flex items-center space-x-2 px-3.5 py-2 rounded-xl border bg-white/5 border-white/10 text-xs font-mono transition-all duration-200"
        >
          <span class="text-purple-400 font-bold">{{ exp.dateMonth }}</span>
          <span class="text-gray-200">{{ exp.label || 'Expense' }}</span>
          <span class="text-rose-400 font-bold">-{{ formatCurrency(exp.amount, baseCurrency) }}</span>
          <button type="button" @click="removePlannedExpense(idx)" class="text-gray-400 hover:text-rose-400 font-bold ml-1 transition-colors">
            ✕
          </button>
        </div>

        <div
          @click="addPlannedExpense"
          class="snap-start shrink-0 sm:hidden flex items-center space-x-1.5 px-4 py-2 rounded-xl border-2 border-dashed border-terminal-accent/40 bg-terminal-surface/30 text-xs font-mono text-terminal-accent font-bold cursor-pointer hover:bg-terminal-accent/10"
        >
          <span>+ Cheltuială Viitoare</span>
        </div>
      </div>
      <div v-if="plannedExpenses.length === 0" class="text-xs font-mono text-gray-400 text-center py-3">
        No planned future expenses added.
      </div>
    </div>

    <!-- Run Simulation Action -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 border-t border-terminal-border">
      <div class="text-xs font-mono text-gray-400">
        <span v-if="isRunning" class="text-terminal-accent animate-pulse">● Running deterministic projection...</span>
        <span v-else-if="runError" class="text-terminal-down">✖ {{ runError }}</span>
        <span v-else-if="simulationResult" class="text-terminal-up">✓ Simulation calculated successfully</span>
      </div>
      <div class="flex items-center gap-2 w-full sm:w-auto">
        <AppButton
          v-if="simulationResult"
          variant="secondary"
          class="whitespace-nowrap text-xs flex-1 sm:flex-none"
          @click="handleExportExcel"
        >
          ⬇ Export Excel
        </AppButton>
        <AppButton
          variant="primary"
          class="whitespace-nowrap text-xs flex-1 sm:flex-none"
          :disabled="isRunning"
          @click="handleRunSimulation"
        >
          {{ isRunning ? 'SIMULATING...' : '▶ RUN SIMULATION' }}
        </AppButton>
      </div>
    </div>

    <!-- Results Overview -->
    <div v-if="simulationResult" class="space-y-6 pt-4 animate-fadeIn">
      <!-- Summary KPI Dashboard -->
      <div class="bg-terminal-bg border border-terminal-border rounded-2xl overflow-hidden">
        <!-- Dashboard Header -->
        <div class="flex items-center justify-between px-5 py-3 border-b border-terminal-border bg-terminal-surface/60">
          <div class="flex items-center gap-2">
            <span class="text-xs">📊</span>
            <span class="text-xs font-mono font-bold uppercase tracking-wider text-gray-300">Statistici & Performanță</span>
          </div>
          <span class="text-[10px] font-mono text-gray-500">Orizont {{ horizonYear }}</span>
        </div>

        <div class="p-5 space-y-5">
          <!-- Hero: Net Worth + Capital + ROI -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="bg-gradient-to-br from-terminal-up/10 to-terminal-up/5 border border-terminal-up/25 rounded-xl p-5 flex flex-col justify-between">
              <div class="text-[10px] font-mono text-terminal-up/70 uppercase tracking-wider">Patrimoniu Net {{ horizonYear }}</div>
              <div class="text-3xl font-mono font-black text-terminal-up mt-2 leading-tight break-all">{{ formatCurrency(simulationResult.summary?.finalNetWorth, baseCurrency) }}</div>
            </div>
            <div class="bg-terminal-surface/30 border border-terminal-border/60 rounded-xl p-4 flex flex-col justify-between">
              <div class="text-[10px] font-mono text-gray-500 uppercase">Capital Investit</div>
              <div class="text-xl font-mono font-bold text-gray-100 mt-1">{{ formatCurrency(simulationResult.summary?.totalInvested, baseCurrency) }}</div>
            </div>
            <div class="bg-purple-950/20 border border-purple-500/20 rounded-xl p-4 flex flex-col justify-between">
              <div class="text-[10px] font-mono text-gray-500 uppercase">ROI Total</div>
              <div class="text-xl font-mono font-bold text-purple-300 mt-1">
                {{ (() => { const nw = parseFloat(simulationResult.summary?.finalNetWorth || '0'); const inv = parseFloat(simulationResult.summary?.totalInvested || '1'); return inv > 0 ? ((nw / inv - 1) * 100).toFixed(1) + '%' : '—'; })() }}
              </div>
            </div>
          </div>

          <!-- Venituri Pasive -->
          <div class="space-y-2">
            <div class="flex items-center gap-3">
              <div class="h-px flex-1 bg-terminal-border/40"></div>
              <span class="text-[10px] font-mono font-bold uppercase text-emerald-500/80 tracking-widest px-1">Venituri Pasive</span>
              <div class="h-px flex-1 bg-terminal-border/40"></div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="flex items-center gap-3 p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl">
                <div class="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center text-base flex-shrink-0">🏦</div>
                <div class="min-w-0">
                  <div class="text-[10px] font-mono text-gray-500 uppercase">Dobânzi Depozite</div>
                  <div class="text-base font-mono font-bold text-emerald-400 truncate">{{ formatCurrency(simulationResult.summary?.totalDepositInterest || simulationResult.summary?.totalInterest, baseCurrency) }}</div>
                </div>
              </div>
              <div class="flex items-center gap-3 p-3 bg-sky-950/20 border border-sky-500/20 rounded-xl">
                <div class="w-9 h-9 rounded-xl bg-sky-500/15 flex items-center justify-center text-base flex-shrink-0">📋</div>
                <div class="min-w-0">
                  <div class="text-[10px] font-mono text-gray-500 uppercase">Cupoane Obligațiuni</div>
                  <div class="text-base font-mono font-bold text-sky-400 truncate">{{ formatCurrency(simulationResult.summary?.totalBondCoupons || '0', baseCurrency) }}</div>
                </div>
              </div>
              <div v-if="perStockSummary.some(s => s.dividends > 0)" class="flex items-center gap-3 p-3 bg-amber-950/20 border border-amber-500/20 rounded-xl">
                <div class="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center text-base flex-shrink-0">💰</div>
                <div class="min-w-0">
                  <div class="text-[10px] font-mono text-gray-500 uppercase">Dividende Acțiuni</div>
                  <div class="text-base font-mono font-bold text-amber-400 truncate">{{ formatCurrency(perStockSummary.reduce((a, s) => a + s.dividends, 0).toFixed(2), baseCurrency) }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Piețe de Capital -->
          <div class="space-y-2">
            <div class="flex items-center gap-3">
              <div class="h-px flex-1 bg-terminal-border/40"></div>
              <span class="text-[10px] font-mono font-bold uppercase text-purple-500/80 tracking-widest px-1">Piețe de Capital</span>
              <div class="h-px flex-1 bg-terminal-border/40"></div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              <div class="p-3 bg-purple-950/20 border border-purple-500/20 rounded-xl">
                <div class="text-[10px] font-mono text-gray-500 uppercase">Câștig Total Acțiuni</div>
                <div class="text-base font-mono font-bold text-purple-400 mt-0.5">{{ formatCurrency(simulationResult.summary?.totalStockCapitalGains, baseCurrency) }}</div>
              </div>
              <div v-for="(val, mkt) in stockValueByMarket" :key="mkt" class="p-3 bg-terminal-surface/30 border border-terminal-border/60 rounded-xl">
                <div class="text-[10px] font-mono text-gray-500 uppercase">{{ mkt }}</div>
                <div class="text-base font-mono font-bold text-purple-300 mt-0.5">{{ formatCurrency(val.toString(), baseCurrency) }}</div>
              </div>
            </div>
          </div>

          <!-- Instrumente Financiare -->
          <div v-if="instruments.length > 0" class="space-y-2">
            <div class="flex items-center gap-3">
              <div class="h-px flex-1 bg-terminal-border/40"></div>
              <span class="text-[10px] font-mono font-bold uppercase text-sky-500/80 tracking-widest px-1">Instrumente Financiare</span>
              <div class="h-px flex-1 bg-terminal-border/40"></div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <div
                v-for="inst in instruments"
                :key="inst.id"
                class="p-3 rounded-xl border"
                :class="inst.type === 'BOND' ? 'bg-amber-950/15 border-amber-500/20' : inst.type === 'FUND' ? 'bg-sky-950/15 border-sky-500/20' : 'bg-emerald-950/15 border-emerald-500/20'"
              >
                <div class="text-[10px] font-mono text-gray-500 uppercase truncate">{{ inst.name }}</div>
                <div class="text-base font-mono font-bold mt-0.5" :class="inst.type === 'BOND' ? 'text-amber-300' : inst.type === 'FUND' ? 'text-sky-300' : 'text-emerald-300'">
                  {{
                    (() => {
                      const lastYearly = simulationResult.rows[simulationResult.rows.length - 1];
                      const snap = lastYearly?.perInstrument?.find(p => p.instrumentId === inst.id);
                      return snap ? formatCurrency(snap.balance, inst.currency) : formatCurrency('0', inst.currency);
                    })()
                  }}
                </div>
                <div class="text-[10px] font-mono text-gray-600 mt-0.5">{{ inst.type }} · {{ inst.annualRatePct }}%/an</div>
              </div>
            </div>
          </div>

          <!-- Patrimoniu pe Valute -->
          <div v-if="Object.keys(netWorthByCurrency).length > 0" class="space-y-2">
            <div class="flex items-center gap-3">
              <div class="h-px flex-1 bg-terminal-border/40"></div>
              <span class="text-[10px] font-mono font-bold uppercase text-amber-500/80 tracking-widest px-1">Patrimoniu pe Valute</span>
              <div class="h-px flex-1 bg-terminal-border/40"></div>
            </div>
            <div class="flex flex-wrap gap-2">
              <div
                v-for="(val, cur) in netWorthByCurrency"
                :key="cur"
                class="flex items-center gap-2 px-4 py-2.5 rounded-xl border"
                :class="{
                  'bg-amber-950/20 border-amber-500/20': cur === 'RON',
                  'bg-sky-950/20 border-sky-500/20': cur === 'EUR',
                  'bg-emerald-950/20 border-emerald-500/20': cur === 'USD',
                  'bg-indigo-950/20 border-indigo-500/20': cur === 'GBP',
                  'bg-terminal-surface/30 border-terminal-border/50': !['RON','EUR','USD','GBP'].includes(cur as string),
                }"
              >
                <span class="text-[10px] font-mono font-bold text-gray-500 uppercase">{{ cur }}</span>
                <span class="text-sm font-mono font-bold" :class="{
                  'text-amber-400': cur === 'RON',
                  'text-sky-400': cur === 'EUR',
                  'text-emerald-300': cur === 'USD',
                  'text-indigo-400': cur === 'GBP',
                  'text-gray-200': !['RON','EUR','USD','GBP'].includes(cur as string),
                }">{{ formatCurrency(val.toString(), cur as string) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Stock Markets Exposure Card + Per-Company Breakdown -->
      <div v-if="Object.keys(marketExposure).length > 0 || perStockSummary.length > 0" class="p-4 bg-terminal-bg border border-terminal-border rounded-xl space-y-4">
        <div class="flex items-center justify-between text-xs font-mono font-bold text-gray-200">
          <span>🌍 EXPUNERE PE BURSE INTERNAȚIONALE (MARKETS EXPOSURE):</span>
          <span class="text-terminal-accent font-extrabold">{{ Object.keys(marketExposure).length }} Burse Active</span>
        </div>
        <div class="flex flex-wrap gap-3">
          <div v-for="(pct, mkt) in marketExposure" :key="mkt" class="flex items-center space-x-2 bg-terminal-surface px-3 py-1.5 rounded-lg border border-terminal-border text-xs font-mono">
            <span class="text-gray-300 font-bold">{{ mkt }}:</span>
            <span class="text-terminal-accent font-extrabold">{{ pct }}%</span>
          </div>
        </div>

        <!-- Per-company breakdown -->
        <div v-if="perStockSummary.length > 0" class="space-y-2 pt-2 border-t border-terminal-border/40">
          <div class="text-[11px] font-mono font-bold uppercase text-gray-400 tracking-wider">Detalii Per Companie</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            <div
              v-for="stk in perStockSummary"
              :key="stk.symbol"
              class="p-3 bg-terminal-surface border border-terminal-border rounded-lg space-y-1.5 text-xs font-mono"
            >
              <div class="flex items-center justify-between">
                <span class="font-bold text-gray-100 text-[13px]">{{ stk.symbol }}</span>
                <span class="text-[10px] text-gray-500 truncate ml-1">{{ stk.market }}</span>
              </div>
              <div class="grid grid-cols-2 gap-1 text-[11px]">
                <span class="text-gray-400">Acțiuni: <strong class="text-gray-200">{{ stk.shares }}</strong></span>
                <span class="text-gray-400 text-right">Investit: <strong class="text-gray-200">{{ formatCurrency(stk.invested.toString(), baseCurrency) }}</strong></span>
              </div>
              <div class="grid grid-cols-2 gap-1 text-[11px] pt-1 border-t border-terminal-border/40">
                <span class="text-amber-400 font-bold">Dividende: {{ formatCurrency(stk.dividends.toString(), baseCurrency) }}</span>
                <span class="text-purple-300 font-bold text-right">Valoare: {{ formatCurrency(stk.value.toString(), baseCurrency) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Projection Table -->
      <div class="space-y-3">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <h3 class="text-xs font-mono font-bold text-gray-200 uppercase">
            Timeline & Per-Stock Breakdown
          </h3>
          <div class="flex items-center space-x-1 bg-terminal-surface rounded-xl p-1 border border-terminal-border">
            <button
              type="button"
              class="px-2.5 py-1 rounded-lg text-xs font-mono transition-colors"
              :class="!showMonthlyRows ? 'bg-terminal-accent text-terminal-bg font-bold' : 'text-gray-400 hover:text-gray-200'"
              @click="showMonthlyRows = false"
            >
              Yearly Rollups
            </button>
            <button
              type="button"
              class="px-2.5 py-1 rounded-lg text-xs font-mono transition-colors"
              :class="showMonthlyRows ? 'bg-terminal-accent text-terminal-bg font-bold' : 'text-gray-400 hover:text-gray-200'"
              @click="showMonthlyRows = true"
            >
              Monthly Rows
            </button>
          </div>
        </div>

        <!-- Mobile Horizontal Card Carousel (1 Card == 1 Row/Year) -->
        <div class="sm:hidden flex overflow-x-auto snap-x snap-mandatory gap-3.5 pb-3 scrollbar-none px-1">
          <div
            v-for="row in (showMonthlyRows ? simulationResult.monthlyRows : simulationResult.rows)"
            :key="row.month"
            @click="selectedRowDetail = row"
            class="snap-start flex-shrink-0 w-[88vw] max-w-[340px] bg-terminal-surface border border-terminal-border hover:border-terminal-accent/60 p-4 rounded-2xl space-y-3 shadow-lg cursor-pointer active:scale-[0.99] transition-all"
          >
            <!-- Card Header -->
            <div class="flex items-center justify-between border-b border-terminal-border/60 pb-2.5">
              <div class="flex items-center space-x-2 font-mono font-bold text-sm text-gray-100">
                <span class="text-terminal-accent">📅 {{ row.month }}</span>
              </div>
              <div class="text-right">
                <span class="text-[10px] text-gray-500 block uppercase">Net Worth</span>
                <span class="font-mono font-extrabold text-sm text-terminal-up">{{ formatCurrency(row.netWorth, baseCurrency) }}</span>
              </div>
            </div>

            <!-- Card Key Metrics Grid -->
            <div class="grid grid-cols-2 gap-2 text-xs font-mono">
              <div class="p-2.5 bg-terminal-bg/60 border border-terminal-border/50 rounded-xl">
                <span class="text-gray-400 uppercase text-[10px] block">Venituri</span>
                <span class="font-bold text-emerald-400">+{{ formatCurrency(row.income, '') }}</span>
              </div>
              <div class="p-2.5 bg-terminal-bg/60 border border-terminal-border/50 rounded-xl">
                <span class="text-gray-400 uppercase text-[10px] block">Cheltuieli</span>
                <span class="font-bold text-red-400">-{{ formatCurrency(row.expenses, '') }}</span>
              </div>
              <div class="p-2.5 bg-terminal-bg/60 border border-terminal-border/50 rounded-xl">
                <span class="text-gray-400 uppercase text-[10px] block">Portofoliu Acțiuni</span>
                <span class="font-bold text-purple-300">{{ formatCurrency(row.stockValue, '') }}</span>
              </div>
              <div class="p-2.5 bg-terminal-bg/60 border border-terminal-border/50 rounded-xl">
                <span class="text-gray-400 uppercase text-[10px] block">Dividende An</span>
                <span class="font-bold text-amber-300">
                  {{ yearDividends(row) > 0 ? formatCurrency(yearDividends(row).toFixed(2), baseCurrency) : '—' }}
                </span>
              </div>
            </div>

            <!-- Instruments Breakdown if present -->
            <div v-if="gridInstruments && gridInstruments.length > 0" class="pt-2 border-t border-terminal-border/40 space-y-1.5 text-xs font-mono">
              <div class="text-[10px] text-gray-400 uppercase font-semibold">Instrumente Financiare:</div>
              <div
                v-for="inst in gridInstruments"
                :key="inst.id"
                class="flex items-center justify-between text-[11px] px-2.5 py-1 bg-terminal-bg/40 rounded-lg"
              >
                <span class="text-gray-300 truncate">{{ inst.name }}:</span>
                <span class="font-bold ml-2 shrink-0" :class="inst.type === 'FUND' ? 'text-sky-300' : inst.type === 'BOND' ? 'text-amber-300' : 'text-emerald-300'">
                  {{ getInstrumentBalance(row.perInstrument, inst.id) ? formatCurrency(getInstrumentBalance(row.perInstrument, inst.id)!.balance, '') + ' ' + inst.currency : '—' }}
                </span>
              </div>
            </div>

            <div class="text-[10px] font-mono text-terminal-accent/80 text-center pt-1 border-t border-terminal-border/30 flex items-center justify-center gap-1">
              <span>🔍</span> <span>Atinge pentru toate datele detaliate</span>
            </div>
          </div>
        </div>

        <!-- Desktop Projection Table -->
        <div class="hidden sm:block bg-terminal-bg border border-terminal-border rounded-2xl overflow-hidden shadow-lg">
          <div class="overflow-x-auto scrollbar-thin">
            <table class="w-full text-left border-separate border-spacing-0 font-mono text-xs min-w-[680px]">
              <thead class="sticky top-0 z-20">
                <tr class="text-[11px] uppercase text-gray-400 bg-terminal-surface">
                  <th class="p-3 border-b border-r border-terminal-border bg-terminal-surface">Year / Month</th>
                  <th class="p-3 text-right border-b border-r border-terminal-border bg-terminal-surface">Income</th>
                  <th class="p-3 text-right border-b border-r border-terminal-border bg-terminal-surface">Expenses</th>
                  <th class="p-3 text-right border-b border-r border-terminal-border bg-terminal-surface">Portfolio</th>
                  <th
                    v-for="inst in gridInstruments"
                    :key="inst.id"
                    class="p-3 text-right text-emerald-300 whitespace-nowrap border-b border-r border-terminal-border bg-terminal-surface"
                  >{{ inst.name }} ({{ inst.currency }})</th>
                  <th v-if="!showMonthlyRows" class="p-3 text-right text-amber-300 whitespace-nowrap border-b border-r border-terminal-border bg-terminal-surface">Dividende An</th>
                  <th v-if="showMonthlyRows" class="p-3 text-right text-amber-300 whitespace-nowrap border-b border-r border-terminal-border bg-terminal-surface">Dividende</th>
                  <th class="p-3 text-right text-terminal-up font-bold border-b border-terminal-border bg-terminal-surface">Total Net Worth</th>
                </tr>
              </thead>
              <tbody v-if="!showMonthlyRows" class="">
                <template v-for="row in simulationResult.rows" :key="row.month">
                  <tr class="border-b border-terminal-border/50 hover:bg-terminal-surface/50">
                    <td class="p-3 font-bold text-gray-200 flex items-center space-x-1.5 border-r border-terminal-border">
                      <button
                        v-if="row.perStock && row.perStock.length > 0"
                        type="button"
                        @click="toggleRowDetails(row.month)"
                        class="text-terminal-accent hover:text-white text-[10px]"
                        title="Toggle per-stock breakdown"
                      >
                        {{ expandedRows[row.month] ? '▼' : '▶' }}
                      </button>
                      <span>{{ row.month }}</span>
                    </td>
                    <td class="p-3 text-right text-emerald-400 border-r border-terminal-border">+{{ formatCurrency(row.income, '') }}</td>
                    <td class="p-3 text-right text-red-400 border-r border-terminal-border">-{{ formatCurrency(row.expenses, '') }}</td>
                    <td class="p-3 text-right font-bold text-purple-300 border-r border-terminal-border">
                      {{ formatCurrency(row.stockValue, '') }}
                      <span v-if="parseFloat(row.toStocks) > 0" class="text-[10px] font-normal text-emerald-500">
                        (+{{ formatCurrency(row.toStocks, '') }})
                      </span>
                    </td>
                    <td
                      v-for="inst in gridInstruments"
                      :key="inst.id"
                      class="p-3 text-right text-xs whitespace-nowrap border-r border-terminal-border"
                    >
                      <template v-if="getInstrumentBalance(row.perInstrument, inst.id)">
                        <span class="font-bold" :class="inst.type === 'FUND' ? 'text-sky-300' : inst.type === 'BOND' ? 'text-amber-300' : 'text-emerald-300'">
                          {{ formatCurrency(getInstrumentBalance(row.perInstrument, inst.id)!.balance, '') }}
                        </span>
                        <span class="text-[10px] text-gray-500 ml-0.5">{{ inst.currency }}</span>
                      </template>
                      <span v-else class="text-gray-600">—</span>
                    </td>
                    <td class="p-3 text-right whitespace-nowrap border-r border-terminal-border">
                      <span v-if="yearDividends(row) > 0" class="font-bold text-amber-300">
                        {{ formatCurrency(yearDividends(row).toFixed(2), baseCurrency) }}
                      </span>
                      <span v-else class="text-gray-600">—</span>
                    </td>
                    <td class="p-3 text-right font-bold text-terminal-up">{{ formatCurrency(row.netWorth, baseCurrency) }}</td>
                  </tr>
                  <tr v-if="row.perStock && row.perStock.length > 0 && expandedRows[row.month]" class="bg-terminal-bg/90">
                    <td :colspan="gridColSpan" class="p-3">
                      <div class="p-3 bg-terminal-surface border border-terminal-border rounded-lg space-y-2">
                        <div class="text-[11px] font-mono font-bold uppercase text-purple-300">
                          Per-Stock Portfolio Breakdown — {{ row.month }}
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                          <div
                            v-for="stk in row.perStock"
                            :key="stk.symbol"
                            class="p-2 bg-terminal-bg border border-terminal-border rounded text-xs font-mono"
                          >
                            <div class="flex justify-between font-bold text-gray-200">
                              <span>{{ stk.symbol }}</span>
                              <span class="text-purple-300">{{ formatCurrency(stk.value, baseCurrency) }}</span>
                            </div>
                            <div class="text-[11px] text-gray-400 flex justify-between mt-1">
                              <span>Investit: {{ formatCurrency(stk.invested, '') }}</span>
                              <span>{{ stk.shares }} buc</span>
                            </div>
                            <div v-if="parseFloat(stk.dividends) > 0" class="text-[11px] flex justify-between mt-0.5 pt-0.5 border-t border-terminal-border/30">
                              <span class="text-gray-500">Dividende an:</span>
                              <span class="text-amber-300 font-bold">{{ formatCurrency(stk.dividends, baseCurrency) }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
              <tbody v-else class="">
                <template v-if="simulationResult.monthlyRows && simulationResult.monthlyRows.length > 0">
                  <template v-for="mrow in simulationResult.monthlyRows" :key="mrow.month">
                    <tr
                      class="border-b border-terminal-border/50 hover:bg-terminal-surface/50"
                      :class="mrow.month.endsWith('-06') ? 'bg-amber-950/20' : ''"
                    >
                      <td class="p-3 font-bold text-gray-200 flex items-center space-x-1.5 border-r border-terminal-border">
                        <span v-if="mrow.month.endsWith('-06') && annualDividendForJune(mrow.month) > 0" class="text-[9px] text-amber-400" title="Lună dividende">💰</span>
                        <button
                          v-if="mrow.perStock && mrow.perStock.length > 0"
                          type="button"
                          @click="toggleRowDetails(mrow.month)"
                          class="text-terminal-accent hover:text-white text-[10px]"
                          title="Toggle per-stock breakdown"
                        >
                          {{ expandedRows[mrow.month] ? '▼' : '▶' }}
                        </button>
                        <span>{{ mrow.month }}</span>
                      </td>
                      <td class="p-3 text-right text-emerald-400 border-r border-terminal-border">+{{ formatCurrency(mrow.income, '') }}</td>
                      <td class="p-3 text-right text-red-400 border-r border-terminal-border">-{{ formatCurrency(mrow.expenses, '') }}</td>
                      <td class="p-3 text-right font-bold text-purple-300 border-r border-terminal-border">
                        {{ formatCurrency(mrow.stockValue, '') }}
                        <span v-if="parseFloat(mrow.toStocks) > 0" class="text-[10px] font-normal text-emerald-500">
                          (+{{ formatCurrency(mrow.toStocks, '') }})
                        </span>
                      </td>
                      <td
                        v-for="inst in gridInstruments"
                        :key="inst.id"
                        class="p-3 text-right text-xs whitespace-nowrap border-r border-terminal-border"
                      >
                        <template v-if="getInstrumentBalance(mrow.perInstrument, inst.id)">
                          <span class="font-bold" :class="inst.type === 'FUND' ? 'text-sky-300' : inst.type === 'BOND' ? 'text-amber-300' : 'text-emerald-300'">
                            {{ formatCurrency(getInstrumentBalance(mrow.perInstrument, inst.id)!.balance, '') }}
                          </span>
                          <span class="text-[10px] text-gray-500 ml-0.5">{{ inst.currency }}</span>
                          <template v-if="simulationResult?.monthlyRows">
                            <span
                              v-if="Math.abs(getInstrumentDeltas(simulationResult.monthlyRows, mrow.month, inst.id).allocation) > 0.01"
                              class="text-[10px] font-normal text-emerald-500"
                            >
                              (+{{ formatCurrency(getInstrumentDeltas(simulationResult.monthlyRows, mrow.month, inst.id).allocation.toFixed(2), '') }})
                            </span>
                            <span
                              v-if="Math.abs(getInstrumentDeltas(simulationResult.monthlyRows, mrow.month, inst.id).interest) > 0.01"
                              class="text-[10px] font-normal text-gray-500"
                            >
                              dob: +{{ formatCurrency(getInstrumentDeltas(simulationResult.monthlyRows, mrow.month, inst.id).interest.toFixed(2), '') }}
                            </span>
                          </template>
                          <div v-if="getInstrumentBalance(mrow.perInstrument, inst.id)!.units" class="text-[10px] text-gray-500">
                            {{ getInstrumentBalance(mrow.perInstrument, inst.id)!.units }} units
                          </div>
                        </template>
                        <span v-else class="text-gray-600">—</span>
                      </td>
                      <!-- Dividende column (monthly) — show only for June (annual payout month) -->
                      <td class="p-3 text-right whitespace-nowrap border-r border-terminal-border">
                        <template v-if="mrow.month.endsWith('-06')">
                          <template v-if="annualDividendForJune(mrow.month) > 0">
                            <div class="font-bold text-amber-300 text-xs">{{ formatCurrency(annualDividendForJune(mrow.month).toFixed(2), baseCurrency) }}</div>
                            <div class="text-[9px] text-amber-500/80">An {{ mrow.month.substring(0, 4) }}</div>
                          </template>
                          <span v-else class="text-amber-600/50 text-xs">—</span>
                        </template>
                        <span v-else class="text-gray-700">—</span>
                      </td>
                      <td class="p-3 text-right font-bold text-terminal-up">{{ formatCurrency(mrow.netWorth, baseCurrency) }}</td>
                    </tr>
                    <tr v-if="((mrow.perStock && mrow.perStock.length > 0) || (mrow.perInstrument && mrow.perInstrument.length > 0)) && expandedRows[mrow.month]" class="bg-terminal-bg/90">
                      <td :colspan="gridColSpan" class="p-3">
                        <div class="p-3 bg-terminal-surface border border-terminal-border rounded-lg space-y-3">
                          <div class="flex items-center justify-between">
                            <div class="text-[11px] font-mono font-bold uppercase text-purple-300">
                              Portfolio Breakdown — {{ mrow.month }}
                            </div>
                            <div v-if="(parseFloat(mrow.toStocks) || 0) === 0" class="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded text-[10px] font-mono text-amber-300">
                              Ținte acțiuni 100% atinse — surplusul s-a mutat în Depozit
                            </div>
                          </div>

                          <div v-if="mrow.perStock && mrow.perStock.length > 0" class="space-y-1.5">
                            <div class="text-[10px] font-mono font-bold uppercase text-purple-400 tracking-wider">Portofoliu Acțiuni</div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                              <div
                                v-for="stk in mrow.perStock.filter(s => parseFloat(s.shares || '0') > 0 || parseFloat(s.invested || '0') > 0)"
                                :key="stk.symbol"
                                class="p-2 bg-terminal-bg rounded-lg text-xs font-mono"
                                :class="(parseFloat(stk.invested) || 0) > 0 ? 'border border-terminal-accent/80 shadow-sm' : 'border border-terminal-border'"
                              >
                                <div class="flex justify-between font-bold text-gray-200">
                                  <span class="flex items-center gap-1.5">
                                    <span v-if="(parseFloat(stk.invested) || 0) > 0" class="text-terminal-accent font-extrabold text-[10px]">BUY</span>
                                    <span v-else class="text-gray-500 text-[10px]">HOLD</span>
                                    <span class="font-bold text-gray-100">{{ stk.symbol }}</span>
                                  </span>
                                  <span class="text-purple-300 font-bold">{{ formatCurrency(stk.value, baseCurrency) }}</span>
                                </div>
                                <div class="text-[11px] text-gray-300 flex justify-between items-center mt-1 space-x-2">
                                  <span>{{ stk.shares || '0' }} buc</span>
                                  <span v-if="(parseFloat(stk.invested) || 0) > 0" class="text-terminal-accent font-bold">
                                    +{{ formatCurrency(stk.invested, '') }}
                                  </span>
                                  <span v-if="(parseFloat(stk.dividends) || 0) > 0" class="text-emerald-400">
                                    div: {{ formatCurrency(stk.dividends, '') }}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </template>
                </template>
                <tr v-else>
                  <td :colspan="gridColSpan" class="p-4 text-center text-gray-400 font-mono text-xs">
                    No monthly data available. Run simulation to view monthly breakdown.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- SLIDING SHEET DRAWER PANEL FOR ROW DETAILS -->
    <Teleport to="body">
      <div
        v-if="selectedRowDetail"
        class="fixed inset-0 z-[110] flex flex-col justify-end bg-black/75 backdrop-blur-sm transition-all"
        @click.self="selectedRowDetail = null"
      >
        <div
          class="w-full bg-terminal-surface border-t border-terminal-accent/40 rounded-t-3xl p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto pb-28 animate-slideUp"
        >
          <!-- Mobile Drag Indicator -->
          <div class="w-12 h-1.5 bg-gray-600/60 rounded-full mx-auto mb-1"></div>

          <div class="flex items-center justify-between border-b border-terminal-border/60 pb-3">
            <div>
              <span class="text-xs font-mono text-terminal-accent uppercase block">Proiecție Detaliată</span>
              <h3 class="text-lg font-mono font-extrabold text-gray-100 flex items-center gap-2">
                📅 {{ selectedRowDetail.month }}
              </h3>
            </div>
            <button
              type="button"
              @click="selectedRowDetail = null"
              class="w-8 h-8 rounded-full bg-terminal-bg border border-terminal-border flex items-center justify-center text-gray-400 hover:text-white font-bold text-base"
            >
              ✕
            </button>
          </div>

          <!-- Net Worth Highlight Tile -->
          <div class="p-4 bg-gradient-to-br from-terminal-up/15 to-terminal-up/5 border border-terminal-up/30 rounded-2xl flex items-center justify-between">
            <div>
              <span class="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Total Patrimoniu Net</span>
              <span class="text-2xl font-mono font-black text-terminal-up">{{ formatCurrency(selectedRowDetail.netWorth, baseCurrency) }}</span>
            </div>
            <span class="text-2xl">📈</span>
          </div>

          <!-- Summary KPI Grid -->
          <div class="grid grid-cols-2 gap-2.5 text-xs font-mono">
            <div class="p-3 bg-terminal-bg border border-terminal-border rounded-xl">
              <span class="text-[10px] text-gray-400 uppercase block">Venituri</span>
              <span class="text-sm font-bold text-emerald-400">+{{ formatCurrency(selectedRowDetail.income, '') }}</span>
            </div>
            <div class="p-3 bg-terminal-bg border border-terminal-border rounded-xl">
              <span class="text-[10px] text-gray-400 uppercase block">Cheltuieli</span>
              <span class="text-sm font-bold text-red-400">-{{ formatCurrency(selectedRowDetail.expenses, '') }}</span>
            </div>
            <div class="p-3 bg-terminal-bg border border-terminal-border rounded-xl">
              <span class="text-[10px] text-gray-400 uppercase block">Valoare Portofoliu</span>
              <span class="text-sm font-bold text-purple-300">{{ formatCurrency(selectedRowDetail.stockValue, '') }}</span>
            </div>
            <div class="p-3 bg-terminal-bg border border-terminal-border rounded-xl">
              <span class="text-[10px] text-gray-400 uppercase block">Dividende Cumulate</span>
              <span class="text-sm font-bold text-amber-300">{{ yearDividends(selectedRowDetail) > 0 ? formatCurrency(yearDividends(selectedRowDetail).toFixed(2), baseCurrency) : '—' }}</span>
            </div>
          </div>

          <!-- Per-Stock Breakdown -->
          <div v-if="selectedRowDetail.perStock && selectedRowDetail.perStock.length > 0" class="space-y-2 pt-2 border-t border-terminal-border/60">
            <div class="text-xs font-mono font-bold text-purple-300 uppercase tracking-wider flex items-center justify-between">
              <span>Acțiuni în Portofoliu ({{ selectedRowDetail.perStock.length }})</span>
              <span class="text-[10px] text-gray-500 font-normal">Pondere pro-rata</span>
            </div>
            <div class="space-y-2">
              <div
                v-for="stk in selectedRowDetail.perStock"
                :key="stk.symbol"
                class="p-3 bg-terminal-bg border border-terminal-border rounded-xl space-y-1.5 text-xs font-mono"
              >
                <div class="flex items-center justify-between">
                  <span class="font-bold text-gray-100 text-sm">{{ stk.symbol }}</span>
                  <span class="text-purple-300 font-extrabold text-sm">{{ formatCurrency(stk.value, baseCurrency) }}</span>
                </div>
                <div class="grid grid-cols-2 gap-2 text-[11px] text-gray-400 pt-1 border-t border-terminal-border/30">
                  <span>Investit: <strong class="text-gray-200">{{ formatCurrency(stk.invested, '') }}</strong></span>
                  <span class="text-right">Acțiuni: <strong class="text-gray-200">{{ stk.shares }} buc</strong></span>
                </div>
                <div v-if="parseFloat(stk.dividends) > 0" class="flex items-center justify-between text-[11px] text-amber-300 pt-1 border-t border-terminal-border/30">
                  <span>Dividende generate:</span>
                  <span class="font-bold">+{{ formatCurrency(stk.dividends, baseCurrency) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Per-Instrument Breakdown -->
          <div v-if="gridInstruments && gridInstruments.length > 0" class="space-y-2 pt-2 border-t border-terminal-border/60">
            <div class="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
              Instrumente Financiare Detaliate
            </div>
            <div class="space-y-2">
              <div
                v-for="inst in gridInstruments"
                :key="inst.id"
                class="p-3 bg-terminal-bg border border-terminal-border rounded-xl flex items-center justify-between text-xs font-mono"
              >
                <div class="min-w-0 pr-2">
                  <span class="font-bold text-gray-100 block truncate">{{ inst.name }}</span>
                  <span class="text-[10px] text-gray-500 uppercase">{{ inst.type }} · {{ inst.currency }}</span>
                </div>
                <div class="text-right shrink-0">
                  <span class="font-mono font-extrabold text-sm block" :class="inst.type === 'FUND' ? 'text-sky-300' : inst.type === 'BOND' ? 'text-amber-300' : 'text-emerald-300'">
                    {{ getInstrumentBalance(selectedRowDetail.perInstrument, inst.id) ? formatCurrency(getInstrumentBalance(selectedRowDetail.perInstrument, inst.id)!.balance, '') + ' ' + inst.currency : '—' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Close Action -->
          <div class="pt-3 border-t border-terminal-border/60 flex justify-end">
            <AppButton variant="secondary" class="w-full sm:w-auto" @click="selectedRowDetail = null">
              Închide Panoul Detaliat
            </AppButton>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
