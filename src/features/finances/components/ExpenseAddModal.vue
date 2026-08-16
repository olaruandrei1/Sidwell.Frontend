<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { X } from '@lucide/vue';
import AdaptiveOverlay from '../../../shared/ui/organisms/AdaptiveOverlay.vue';
import FormField from '../../../shared/ui/molecules/FormField.vue';
import AppInput from '../../../shared/ui/atoms/AppInput.vue';
import AppButton from '../../../shared/ui/atoms/AppButton.vue';
import { useFinancesStore } from '../../../stores/finances';
import { useFinanceSettingsQuery, useAddExpenseMutation, useUpdateExpenseMutation, useFinancesQuery } from '../../../queries/useFinancesQuery';
import type { PaymentSourceEntry } from '../../../queries/useFinancesQuery';
import { usePortfolioQuery } from '../../../queries/usePortfolioQuery';
import type { FinanceCategoryType, WealthAllocationDto } from '../../../shared/api/types';

const { t } = useI18n();
const financesStore = useFinancesStore();
const { data: settings } = useFinanceSettingsQuery();
const addExpenseMutation = useAddExpenseMutation();
const updateExpenseMutation = useUpdateExpenseMutation();
const { data: financesData } = useFinancesQuery(computed(() => financesStore.selectedMonth));
const { data: portfolioData } = usePortfolioQuery();

const paidFromWealth = ref(false);
const selectedSources = ref<Array<{ key: string; amount: string }>>([]);
const isMultiMonth = ref(false);
const recurringEditScope = ref<'ALL' | 'ONLY_THIS_MONTH' | 'THIS_AND_FUTURE'>('THIS_AND_FUTURE');
const startMonth = ref('2026-05');
const endMonth = ref('2026-10');

function getMonthsInRange(start: string, end: string): string[] {
  const sParts = start.split('-').map(Number);
  const eParts = end.split('-').map(Number);
  let y = sParts[0] || 2026;
  let m = sParts[1] || 1;
  const eY = eParts[0] || 2026;
  const eM = eParts[1] || 12;
  const result: string[] = [];
  while (y < eY || (y === eY && m <= eM)) {
    result.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
    if (result.length > 60) break;
  }
  return result.length ? result : [start];
}

function addSource() {
  selectedSources.value.push({ key: '', amount: '' });
}

function removeSource(index: number) {
  selectedSources.value.splice(index, 1);
}

const coveredAmount = computed(() => {
  return selectedSources.value.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
});

const remainingFromCash = computed(() => {
  const total = parseFloat(amount.value) || 0;
  return Math.max(0, total - coveredAmount.value);
});

type PaymentSource = {
  key: string;
  label: string;
  institution: string;
  institutionType: 'BANK' | 'BROKER';
  currency: string;
  type: 'BANK_DEPOSIT' | 'BROKER_CASH' | 'DCA_TARGET';
  balance: number;
  group: 'BANK' | 'BROKER' | 'POSITION';
};

const availableSources = computed<PaymentSource[]>(() => {
  const sources: PaymentSource[] = [];
  const buckets = (financesData.value?.cumulativeWealth ?? []) as WealthAllocationDto[];

  // BANK: keep per-type (depozit 12L != cont economii, they behave differently)
  for (const b of buckets.filter(x => x.institutionType === 'BANK')) {
    sources.push({
      key: `wealth::${b.institution}::${b.institutionType}::${b.currency}::${b.type}`,
      label: `${b.institution} · ${b.currency} · ${b.type} (${parseFloat(b.amount).toFixed(2)} ${b.currency})`,
      institution: b.institution,
      institutionType: 'BANK',
      currency: b.currency,
      type: b.type,
      balance: parseFloat(b.amount) || 0,
      group: 'BANK',
    });
  }

  // BROKER: collapse DCA_TARGET + BROKER_CASH into a single per-(institution, currency) bucket.
  // Reason: for spending purposes they're the same "cash at broker". Type distinction only matters for planning.
  const brokerBuckets = new Map<string, { institution: string; currency: string; total: number }>();
  for (const b of buckets.filter(x => x.institutionType === 'BROKER')) {
    const key = `${b.institution}::${b.currency}`;
    const existing = brokerBuckets.get(key) ?? { institution: b.institution, currency: b.currency, total: 0 };
    existing.total += parseFloat(b.amount) || 0;
    brokerBuckets.set(key, existing);
  }
  for (const [key, bkt] of brokerBuckets) {
    sources.push({
      key: `wealth::broker::${key}`,
      label: `${bkt.institution} · ${bkt.currency} (cash total: ${bkt.total.toFixed(2)} ${bkt.currency})`,
      institution: bkt.institution,
      institutionType: 'BROKER',
      currency: bkt.currency,
      type: 'BROKER_CASH',
      balance: bkt.total,
      group: 'BROKER',
    });
  }

  // Portfolio holdings — later can trigger a real SELL at market price
  const holdings = portfolioData.value?.holdings ?? [];
  for (const h of holdings) {
    sources.push({
      key: `position::${h.ticker.symbol}`,
      label: `${h.ticker.symbol} · ${Math.trunc(parseFloat(String(h.shares)) || 0)} buc @ ${parseFloat(String(h.marketValue)).toFixed(2)} ${h.currency}`,
      institution: h.ticker.symbol,
      institutionType: 'BROKER',
      currency: h.currency,
      type: 'BROKER_CASH',
      balance: parseFloat(String(h.marketValue)) || 0,
      group: 'POSITION',
    });
  }
  return sources;
});

const groupedSources = computed(() => {
  const groups: Record<string, PaymentSource[]> = { BANK: [], BROKER: [], POSITION: [] };
  for (const s of availableSources.value) groups[s.group]?.push(s);
  return groups;
});

const type = ref<FinanceCategoryType>('LOAN');
const category = ref('');
const name = ref('');
const amount = ref('');
const currency = ref('RON');
const interestRatePct = ref('');
const hasDueDate = ref(false);
const dueDate = ref('');
const status = ref<'PAID' | 'DUE' | 'PENDING'>('PAID');
const month = ref(financesStore.selectedMonth || '2026-07');
const isRecurring = ref(true);

const availableCategories = computed(() => {
  const all = settings.value?.categories || [];
  return all.filter((c) => c.type === type.value);
});

watch(availableCategories, (list) => {
  if (list.length > 0) {
    category.value = list[0]?.name || 'General';
  } else {
    category.value = 'General';
  }
  isRecurring.value = type.value === 'LOAN' || type.value === 'SUBSCRIPTION';
}, { immediate: true });

watch(
  () => financesStore.isAddExpenseModalOpen,
  (isOpen) => {
    if (isOpen) {
      if (financesStore.editingExpense) {
        const exp = financesStore.editingExpense;
        type.value = exp.type;
        name.value = exp.name || '';
        category.value = exp.category || 'General';
        amount.value = String(exp.amount || '');
        currency.value = exp.currency || 'RON';
        interestRatePct.value = exp.interestRatePct ? String(exp.interestRatePct) : '';
        hasDueDate.value = Boolean(exp.dueDate);
        dueDate.value = exp.dueDate || '';
        status.value = exp.status as any || 'PAID';
        month.value = exp.month || financesStore.selectedMonth || '2026-07';
        isRecurring.value = exp.isRecurring ?? false;
        paidFromWealth.value = false;
        selectedSources.value = [];
        isMultiMonth.value = false;
        recurringEditScope.value = 'THIS_AND_FUTURE';
      } else {
        month.value = financesStore.selectedMonth || '2026-07';
        hasDueDate.value = false;
        dueDate.value = '';
        isMultiMonth.value = false;
        startMonth.value = financesStore.selectedMonth || '2026-05';
        endMonth.value = financesStore.selectedMonth || '2026-10';
      }
    }
  }
);

watch(hasDueDate, (enabled) => {
  if (enabled) {
    const currentM = month.value || financesStore.selectedMonth || '2026-07';
    dueDate.value = `${currentM}-05`;
  } else {
    dueDate.value = '';
  }
});

watch(month, (newMonth) => {
  if (hasDueDate.value && newMonth) {
    dueDate.value = `${newMonth}-05`;
  }
});

function resetForm() {
  type.value = 'LOAN';
  name.value = '';
  amount.value = '';
  currency.value = 'RON';
  interestRatePct.value = '';
  hasDueDate.value = false;
  dueDate.value = '';
  status.value = 'PAID';
  month.value = financesStore.selectedMonth || '2026-07';
  isRecurring.value = true;
  paidFromWealth.value = false;
  selectedSources.value = [];
  isMultiMonth.value = false;
}

async function handleSubmit() {
  if (!amount.value) return;
  const resolvedName = (name.value || category.value || type.value || 'Cheltuială').trim();

  const basePayload: Parameters<typeof addExpenseMutation.mutateAsync>[0] = {
    name: resolvedName,
    category: category.value || 'General',
    type: type.value,
    amount: amount.value,
    currency: currency.value,
    status: status.value,
    month: month.value,
    isRecurring: isMultiMonth.value ? false : isRecurring.value,
    ...(dueDate.value ? { dueDate: dueDate.value } : {}),
    ...(type.value === 'LOAN' && interestRatePct.value ? { interestRatePct: interestRatePct.value } : {})
  };

  if (paidFromWealth.value && selectedSources.value.length > 0) {
    basePayload.paymentSources = selectedSources.value
      .filter(s => s.key && parseFloat(s.amount) > 0)
      .map(s => {
        const src = availableSources.value.find(a => a.key === s.key);
        if (!src) return null;

        if (src.group === 'POSITION') {
          const brokerBucket = availableSources.value.find(b => b.group === 'BROKER' && b.currency === src.currency);
          return {
            positionSymbol: src.institution,
            institution: brokerBucket?.institution,
            amount: String(s.amount),
          };
        }
        return {
          institution: src.institution,
          institutionType: src.institutionType,
          currency: src.currency,
          type: src.type,
          amount: String(s.amount),
        };
      })
      .filter(Boolean) as PaymentSourceEntry[];
  }

  if (financesStore.editingExpense) {
    const isRecurringEdit = isRecurring.value && financesStore.editingExpense.isRecurring;
    const scope = isRecurringEdit ? recurringEditScope.value : 'ALL';
    const payloadWithScope = {
      ...basePayload,
      // For scope-sensitive ops, use the currently viewed month (not the expense's origin month)
      // so the backend can correctly create per-month overrides vs. full updates.
      month: (isRecurringEdit && scope !== 'ALL')
        ? (financesStore.selectedMonth || month.value)
        : month.value,
      recurringEditScope: scope
    } as const;
    await updateExpenseMutation.mutateAsync({ id: financesStore.editingExpense.id, payload: payloadWithScope });
  } else if (isMultiMonth.value) {
    const months = getMonthsInRange(startMonth.value, endMonth.value);
    for (const m of months) {
      await addExpenseMutation.mutateAsync({ ...basePayload, month: m });
    }
  } else {
    await addExpenseMutation.mutateAsync(basePayload);
  }

  resetForm();
  financesStore.closeAddExpenseModal();
}
</script>

<template>
  <AdaptiveOverlay
    :model-value="financesStore.isAddExpenseModalOpen"
    :title="financesStore.editingExpense ? 'EDITEAZĂ CHELTUIALĂ / RATĂ' : t('finances.modalAddTitle')"
    @update:model-value="(val) => !val && financesStore.closeAddExpenseModal()"
    @close="financesStore.closeAddExpenseModal"
  >
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField :label="t('finances.typeLabel')">
          <select
            v-model="type"
            class="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-xs font-mono text-gray-200 focus:outline-none focus:border-terminal-accent"
          >
            <option value="LOAN">{{ t('enums.LOAN') }}</option>
            <option value="SUBSCRIPTION">{{ t('enums.SUBSCRIPTION') }}</option>
            <option value="UTILITY">{{ t('enums.UTILITY') }}</option>
            <option value="FOOD">{{ t('enums.FOOD') }}</option>
            <option value="CIGARETTES">{{ t('enums.CIGARETTES') }}</option>
            <option value="OTHER">{{ t('enums.OTHER') }}</option>
          </select>
        </FormField>

        <FormField :label="t('finances.categoryLabel')">
          <select
            v-model="category"
            class="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-xs font-mono text-gray-200 focus:outline-none focus:border-terminal-accent"
          >
            <option v-for="cat in availableCategories" :key="cat.id" :value="cat.name">
              {{ cat.name }}
            </option>
          </select>
        </FormField>
      </div>

      <FormField :label="t('finances.nameLabel')">
        <AppInput
          v-model="name"
          placeholder="ex: Credit / Factură Engie / Mega Image (opțional - implicit categoria)"
        />
      </FormField>

      <div class="grid grid-cols-3 gap-3">
        <div class="col-span-2">
          <FormField :label="t('finances.amountLabel')" required>
            <AppInput
              v-model="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              monospace
            />
          </FormField>
        </div>
        <div>
          <FormField :label="t('finances.currencyLabel')">
            <select
              v-model="currency"
              class="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-xs font-mono text-gray-200 focus:outline-none focus:border-terminal-accent h-[38px]"
            >
              <option value="RON">RON</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </select>
          </FormField>
        </div>
      </div>

      <div v-if="type === 'LOAN'" class="p-3 bg-terminal-accent/10 border border-terminal-accent/30 rounded-lg">
        <FormField :label="t('finances.interestLabel')">
          <div class="flex items-center space-x-2">
            <AppInput
              v-model="interestRatePct"
              type="number"
              step="0.01"
              placeholder="ex: 5.89 / 18.00"
              monospace
              class="w-full"
            />
            <span class="text-xs font-mono text-terminal-accent font-bold">%</span>
          </div>
        </FormField>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField :label="t('finances.statusLabel')">
          <select
            v-model="status"
            class="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-xs font-mono text-gray-200 focus:outline-none focus:border-terminal-accent"
          >
            <option value="PAID">{{ t('enums.PAID') }}</option>
            <option value="DUE">{{ t('enums.DUE') }}</option>
            <option value="PENDING">{{ t('enums.PENDING') }}</option>
          </select>
        </FormField>

        <div>
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-mono text-gray-400 uppercase">Dată Scadență (Opțional)</span>
            <label class="flex items-center space-x-1.5 cursor-pointer text-xs font-mono text-terminal-accent">
              <input
                type="checkbox"
                v-model="hasDueDate"
                class="rounded bg-terminal-bg border-terminal-border text-terminal-accent focus:ring-0"
              />
              <span>Bifează (ziua 5 din lună)</span>
            </label>
          </div>
          <AppInput
            v-model="dueDate"
            type="date"
            monospace
            :disabled="!hasDueDate"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Luna Selectată (YYYY-MM)">
          <AppInput
            v-model="month"
            type="month"
            monospace
          />
        </FormField>
        <div class="flex items-center pt-6">
          <label class="flex items-center space-x-2 cursor-pointer text-xs font-mono text-gray-200">
            <input
              type="checkbox"
              v-model="isRecurring"
              class="rounded bg-terminal-bg border-terminal-border text-terminal-accent focus:ring-0"
            />
            <span>Cheltuială Recurentă Lunară</span>
          </label>
        </div>
      </div>

      <!-- Recurring period / Multi-month range toggle -->
      <div v-if="!financesStore.editingExpense" class="p-3 rounded-lg border bg-terminal-bg/40 border-terminal-border space-y-3">
        <label class="flex items-center space-x-2 cursor-pointer text-xs font-mono">
          <input
            type="checkbox"
            v-model="isMultiMonth"
            class="rounded bg-terminal-bg border-terminal-border text-terminal-accent focus:ring-0"
          />
          <span class="font-bold uppercase" :class="isMultiMonth ? 'text-terminal-accent' : 'text-gray-300'">
            Adaugă plată recurentă pe o perioadă de luni (ex: 05.05 - 05.10)
          </span>
        </label>
        <div v-if="isMultiMonth" class="grid grid-cols-2 gap-3 pt-1">
          <div>
            <span class="text-[10px] font-mono text-gray-400 block mb-1">DE LA LUNA (YYYY-MM)</span>
            <AppInput v-model="startMonth" type="month" monospace />
          </div>
          <div>
            <span class="text-[10px] font-mono text-gray-400 block mb-1">PÂNĂ LA LUNA (YYYY-MM)</span>
            <AppInput v-model="endMonth" type="month" monospace />
          </div>
        </div>
      </div>

      <!-- Paid-from-wealth source picker -->
      <div class="p-3 rounded-lg border" :class="paidFromWealth ? 'bg-terminal-accent/10 border-terminal-accent/40' : 'bg-terminal-bg/40 border-terminal-border'">
        <label class="flex items-center space-x-2 cursor-pointer text-xs font-mono">
          <input
            type="checkbox"
            v-model="paidFromWealth"
            class="rounded bg-terminal-bg border-terminal-border text-terminal-accent focus:ring-0"
          />
          <span class="font-bold uppercase" :class="paidFromWealth ? 'text-terminal-accent' : 'text-gray-300'">
            Cheltuială realizată din depozit / portofoliu
          </span>
        </label>

        <div v-if="paidFromWealth" class="mt-3 space-y-3">
          <div v-for="(source, idx) in selectedSources" :key="idx" class="flex items-start gap-2">
            <div class="flex-1">
              <select
                v-model="source.key"
                class="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-xs font-mono text-gray-200 focus:outline-none focus:border-terminal-accent"
              >
                <option value="" disabled>-- alege sursa --</option>
                <optgroup v-if="groupedSources.BANK && groupedSources.BANK.length" label="🏦 Bănci">
                  <option v-for="s in groupedSources.BANK" :key="s.key" :value="s.key">{{ s.label }}</option>
                </optgroup>
                <optgroup v-if="groupedSources.BROKER && groupedSources.BROKER.length" label="💼 Broker (cash / DCA)">
                  <option v-for="s in groupedSources.BROKER" :key="s.key" :value="s.key">{{ s.label }}</option>
                </optgroup>
                <optgroup v-if="groupedSources.POSITION && groupedSources.POSITION.length" label="📈 Poziții deschise">
                  <option v-for="s in groupedSources.POSITION" :key="s.key" :value="s.key">{{ s.label }}</option>
                </optgroup>
              </select>
            </div>
            <div class="w-28">
              <input
                v-model="source.amount"
                type="number"
                step="0.01"
                placeholder="Sumă"
                class="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-xs font-mono text-gray-200 focus:outline-none focus:border-terminal-accent"
              />
            </div>
            <button
              type="button"
              @click="removeSource(idx)"
              class="mt-1 text-red-400 hover:text-red-300 p-1 flex items-center"
            ><X :size="13" /></button>
          </div>

          <button
            type="button"
            @click="addSource"
            class="text-xs font-mono text-terminal-accent hover:text-terminal-accent/80 font-bold"
          >+ Adaugă sursă</button>

          <div v-if="amount" class="text-[11px] font-mono text-gray-400 mt-1">
            Din free cash: <span class="text-terminal-accent font-bold">{{ remainingFromCash.toFixed(2) }} {{ currency }}</span>
          </div>

          <p class="text-[10px] font-mono text-gray-500 italic">
            🏦/💼 Bănci și broker cash → retragere negativă în Patrimoniu. 📈 Pozițiile broker → SELL automat la preț curent.
          </p>
        </div>
      </div>

      <!-- Scope for recurring edits -->
      <div v-if="financesStore.editingExpense && isRecurring" class="bg-terminal-surface/90 border border-terminal-accent/40 rounded-xl p-3.5 space-y-2.5">
        <div class="flex items-center gap-2">
          <span class="text-xs font-mono font-bold text-terminal-accent uppercase">🔄 Sferă Modificare Plată Recurentă</span>
        </div>
        <div class="space-y-2">
          <label class="flex items-center gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors" :class="{ 'bg-terminal-accent/10 border border-terminal-accent/30': recurringEditScope === 'ONLY_THIS_MONTH' }">
            <input type="radio" v-model="recurringEditScope" value="ONLY_THIS_MONTH" class="text-terminal-accent focus:ring-0" />
            <div>
              <div class="text-xs font-mono font-bold text-gray-200">Schimbă doar pentru luna asta ({{ month }})</div>
              <div class="text-[10px] font-mono text-gray-400">Creează o modificare punctuală doar pentru această lună; restul lunilor rămân neschimbate.</div>
            </div>
          </label>
          <label class="flex items-center gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors" :class="{ 'bg-terminal-accent/10 border border-terminal-accent/30': recurringEditScope === 'THIS_AND_FUTURE' }">
            <input type="radio" v-model="recurringEditScope" value="THIS_AND_FUTURE" class="text-terminal-accent focus:ring-0" />
            <div>
              <div class="text-xs font-mono font-bold text-gray-200">Schimbă pentru luna asta + următoarele luni</div>
              <div class="text-[10px] font-mono text-gray-400">Aplică noua valoare începând din {{ month }} și pe viitor; lunile din urmă nu sunt afectate.</div>
            </div>
          </label>
          <label class="flex items-center gap-2.5 cursor-pointer p-1.5 rounded-lg hover:bg-white/5 transition-colors opacity-80" :class="{ 'bg-terminal-accent/10 border border-terminal-accent/30': recurringEditScope === 'ALL' }">
            <input type="radio" v-model="recurringEditScope" value="ALL" class="text-terminal-accent focus:ring-0" />
            <div>
              <div class="text-[11px] font-mono font-bold text-gray-400">Schimbăm peste tot (toate lunile)</div>
              <div class="text-[9px] font-mono text-gray-500">Modifică plata în întregul istoric trecute și viitoare.</div>
            </div>
          </label>
        </div>
      </div>

      <div class="flex items-center justify-end space-x-3 pt-4 border-t border-terminal-border">
        <AppButton
          type="button"
          variant="secondary"
          @click="financesStore.closeAddExpenseModal"
        >
          {{ t('finances.cancel') }}
        </AppButton>
        <AppButton
          type="submit"
          variant="primary"
          :disabled="!amount || (paidFromWealth && selectedSources.length === 0) || addExpenseMutation.isPending.value || updateExpenseMutation.isPending.value"
        >
          {{ (addExpenseMutation.isPending.value || updateExpenseMutation.isPending.value) ? t('finances.saving') : (financesStore.editingExpense ? 'Salvează Modificările' : t('finances.saveExpense')) }}
        </AppButton>
      </div>
    </form>
  </AdaptiveOverlay>
</template>
