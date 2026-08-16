<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { X } from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import AdaptiveOverlay from '../../../shared/ui/organisms/AdaptiveOverlay.vue';
import AppButton from '../../../shared/ui/atoms/AppButton.vue';
import AppInput from '../../../shared/ui/atoms/AppInput.vue';
import { useFinancesStore } from '../../../stores/finances';
import { useScanReceiptMutation, useConfirmScannedExpenseMutation, useFinanceSettingsQuery } from '../../../queries/useFinancesQuery';
import type { ExpenseLineItemDto, FinanceCategoryType } from '../../../shared/api/types';

const { t } = useI18n();
const financesStore = useFinancesStore();
const scanReceiptMutation = useScanReceiptMutation();
const confirmExpenseMutation = useConfirmScannedExpenseMutation();
const { data: settings } = useFinanceSettingsQuery();

type Mode = 'chooser' | 'scan' | 'form';

const mode = ref<Mode>('chooser');
const isScanning = ref(false);
const scanError = ref('');
const merchantName = ref('');
const receiptDateInput = ref('');

type EditableItem = {
  name: string;
  qty: number;
  unitPrice: string;
  amount: string;
  type: FinanceCategoryType;
  category: string;
};

const items = ref<EditableItem[]>([]);

const typeOptions: { value: FinanceCategoryType; label: string; emoji: string }[] = [
  { value: 'FOOD', label: 'Mâncare', emoji: '🍞' },
  { value: 'CIGARETTES', label: 'Țigări', emoji: '🚬' },
  { value: 'UTILITY', label: 'Utilități', emoji: '⚡' },
  { value: 'VARIABLE', label: 'Buffer', emoji: '🧺' },
  { value: 'OTHER', label: 'Altele', emoji: '❔' },
];

function inferType(name: string): FinanceCategoryType {
  const n = name.toLowerCase();
  if (/(tigar|tutun|marlboro|winston|kent|camel|davidoff|lm |lucky)/i.test(n)) return 'CIGARETTES';
  if (/(pain|lapte|carne|branz|casca|iaurt|apa|bere|vin|cola|suc|paste|orez|zahar|faina|banan|mar|rosii|castrav|salata|cafea)/i.test(n)) return 'FOOD';
  return 'FOOD';
}

function defaultCategoryFor(type: FinanceCategoryType): string {
  const match = settings.value?.categories?.find(c => c.type === type);
  return match?.name || type;
}

watch(() => financesStore.isGeminiModalOpen, (isOpen) => {
  if (isOpen) {
    resetForm();
    if (financesStore.pendingScanFile) {
      const file = financesStore.pendingScanFile;
      financesStore.pendingScanFile = null;
      startScan(file);
    }
  }
}, { immediate: true });

function resetForm() {
  mode.value = 'chooser';
  merchantName.value = '';
  receiptDateInput.value = new Date().toISOString().slice(0, 10);
  items.value = [];
  scanError.value = '';
}

function pickManual() {
  mode.value = 'form';
  items.value = [];
  addRow();
}

function pickScan() {
  mode.value = 'scan';
}

function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  startScan(file);
}

async function startScan(file: File) {
  isScanning.value = true;
  scanError.value = '';
  try {
    const created = await scanReceiptMutation.mutateAsync(file);
    merchantName.value = created.name.replace(/^\[AI\]\s*/, '');
    const scanned = created.lineItems || [];
    items.value = scanned.map(it => {
      const t = (it.type as FinanceCategoryType) || inferType(it.name);
      return {
        name: it.name,
        qty: it.qty,
        unitPrice: it.unitPrice,
        amount: it.amount,
        type: t,
        category: it.category || defaultCategoryFor(t),
      };
    });
    if (items.value.length === 0) addRow();
    mode.value = 'form';
  } catch (err: unknown) {
    scanError.value = err instanceof Error ? err.message : 'Failed to scan receipt image.';
  } finally {
    isScanning.value = false;
  }
}

async function scanSimulated() {
  const dummyFile = new File(['dummy'], 'receipt.jpg', { type: 'image/jpeg' });
  await startScan(dummyFile);
}

function addRow() {
  items.value.push({
    name: '',
    qty: 1,
    unitPrice: '0.00',
    amount: '0.00',
    type: 'FOOD',
    category: defaultCategoryFor('FOOD'),
  });
}

function removeRow(idx: number) {
  items.value.splice(idx, 1);
}

function onTypeChange(item: EditableItem) {
  item.category = defaultCategoryFor(item.type);
}

function assignAllType(type: FinanceCategoryType) {
  for (const it of items.value) {
    it.type = type;
    it.category = defaultCategoryFor(type);
  }
}

function recalcAmount(item: EditableItem) {
  const price = parseFloat(item.unitPrice) || 0;
  const qty = item.qty || 0;
  const computed = price * qty;
  if (computed > 0) item.amount = computed.toFixed(2);
}

const validItems = computed(() => items.value.filter(it => it.name.trim() && (parseFloat(it.amount) || 0) > 0));

const grouped = computed(() => {
  const groups = new Map<FinanceCategoryType, EditableItem[]>();
  for (const it of validItems.value) {
    const list = groups.get(it.type) ?? [];
    list.push(it);
    groups.set(it.type, list);
  }
  return Array.from(groups.entries()).map(([type, list]) => ({
    type,
    items: list,
    total: list.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0),
    label: typeOptions.find(o => o.value === type)?.label ?? type,
    emoji: typeOptions.find(o => o.value === type)?.emoji ?? '',
  }));
});

const totalAmount = computed(() => validItems.value.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0));

const isSaving = ref(false);

async function save() {
  if (validItems.value.length === 0) return;
  const receiptId = `${Date.now()}`;
  const merchant = merchantName.value.trim() || 'Bon';
  const receiptDate = receiptDateInput.value || new Date().toISOString().slice(0, 10);
  const month = financesStore.selectedMonth;

  isSaving.value = true;
  try {
    for (const g of grouped.value) {
      const lineItems: ExpenseLineItemDto[] = g.items.map(it => ({
        name: it.name,
        qty: it.qty,
        unitPrice: it.unitPrice,
        amount: it.amount,
        category: it.category,
        type: it.type,
        receiptId,
        receiptName: merchant,
        receiptDate,
      }));
      await confirmExpenseMutation.mutateAsync({
        name: `${merchant} — ${g.label}`,
        category: g.items[0]?.category || defaultCategoryFor(g.type),
        type: g.type,
        amount: g.total.toFixed(2),
        currency: 'RON',
        status: 'PAID',
        month,
        isRecurring: false,
        lineItems,
      });
    }
    close();
  } finally {
    isSaving.value = false;
  }
}

function close() {
  resetForm();
  financesStore.closeGeminiModal();
}

function backToChooser() {
  mode.value = 'chooser';
  items.value = [];
  scanError.value = '';
}
</script>

<template>
  <AdaptiveOverlay
    :model-value="financesStore.isGeminiModalOpen"
    :title="mode === 'chooser' ? 'Introdu Bon' : mode === 'scan' ? 'Scanează Bon' : 'Detalii Bon'"
    @update:model-value="(val) => !val && close()"
    @close="close"
  >
    <div class="space-y-5 select-none">
      <!-- CHOOSER -->
      <div v-if="mode === 'chooser'" class="space-y-4">
        <p class="text-xs font-mono text-gray-400 text-center">
          Alege cum introduci bonul. Ambele merg spre același formular editabil.
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            class="p-6 border-2 border-terminal-border hover:border-terminal-accent/60 rounded-xl bg-terminal-bg/40 transition-all group flex flex-col items-center gap-3 hover:bg-terminal-accent/5"
            @click="pickScan"
          >
            <div class="text-4xl group-hover:scale-110 transition-transform">📷</div>
            <div class="text-sm font-mono font-bold text-gray-100 uppercase">Scanare AI</div>
            <p class="text-[11px] font-mono text-gray-500 text-center">
              Fă poză bonului. Gemini extrage articolele, apoi editezi înainte de salvare.
            </p>
          </button>
          <button
            type="button"
            class="p-6 border-2 border-terminal-border hover:border-terminal-accent/60 rounded-xl bg-terminal-bg/40 transition-all group flex flex-col items-center gap-3 hover:bg-terminal-accent/5"
            @click="pickManual"
          >
            <div class="text-4xl group-hover:scale-110 transition-transform">✍️</div>
            <div class="text-sm font-mono font-bold text-gray-100 uppercase">Manual</div>
            <p class="text-[11px] font-mono text-gray-500 text-center">
              Introdu articolele rând cu rând. Ideal când nu ai bonul fizic.
            </p>
          </button>
        </div>
      </div>

      <!-- SCAN UPLOAD -->
      <div v-else-if="mode === 'scan'" class="space-y-4">
        <label class="block border-2 border-dashed border-terminal-border hover:border-terminal-accent/50 rounded-xl p-8 text-center transition-colors cursor-pointer bg-terminal-bg/50">
          <input type="file" accept="image/*" class="hidden" @change="onFileSelected" :disabled="isScanning" />
          <div v-if="isScanning" class="space-y-3">
            <div class="inline-block w-8 h-8 border-2 border-terminal-accent border-t-transparent rounded-full animate-spin"></div>
            <p class="text-xs font-mono text-terminal-accent animate-pulse">{{ t('finances.scanning') }}</p>
          </div>
          <div v-else class="space-y-3">
            <div class="text-3xl text-gray-400">📷</div>
            <h5 class="text-xs font-mono font-bold text-gray-200 uppercase">{{ t('finances.clickToScan') }}</h5>
            <p class="text-xs text-gray-400 max-w-sm mx-auto">{{ t('finances.clickToScanDesc') }}</p>
            <p v-if="scanError" class="text-xs font-mono text-terminal-down">{{ scanError }}</p>
          </div>
        </label>
        <div class="flex justify-between text-xs">
          <button type="button" class="text-gray-500 hover:text-gray-200 font-mono uppercase" @click="backToChooser">← Înapoi</button>
          <button type="button" class="text-terminal-accent hover:text-terminal-accent/80 font-mono uppercase" @click="scanSimulated" :disabled="isScanning">Simulare scan →</button>
        </div>
      </div>

      <!-- FORM (editable, prefilled after scan OR empty from manual) -->
      <div v-else class="space-y-4">
        <!-- Header info -->
        <div class="bg-terminal-surface/60 p-4 rounded-xl border border-terminal-border space-y-3">
          <div class="flex items-center justify-between">
            <span class="px-2.5 py-0.5 bg-terminal-surface-light text-gray-200 border border-terminal-border rounded text-xs font-mono font-bold uppercase">
              {{ items.length }} articole · Total {{ totalAmount.toFixed(2) }} RON
            </span>
            <button type="button" class="text-[10px] font-mono uppercase text-gray-500 hover:text-gray-300" @click="backToChooser">
              ← Schimbă metoda
            </button>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <AppInput v-model="merchantName" placeholder="Nume magazin / comerciant *" />
            <AppInput v-model="receiptDateInput" type="date" />
          </div>
        </div>

        <!-- Bulk assign -->
        <div v-if="items.length > 0" class="flex items-center gap-2 flex-wrap text-[10px] font-mono">
          <span class="text-gray-500 uppercase">Aloc toate →</span>
          <button
            v-for="opt in typeOptions"
            :key="opt.value"
            type="button"
            class="px-2 py-1 rounded border border-terminal-border hover:border-terminal-accent/50 text-gray-300 hover:text-terminal-accent transition-colors"
            @click="assignAllType(opt.value)"
          >
            {{ opt.emoji }} {{ opt.label }}
          </button>
        </div>

        <!-- Items table -->
        <div class="border border-terminal-border rounded-xl bg-terminal-bg/40 max-h-96 overflow-y-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead class="sticky top-0 bg-terminal-surface-light/80 backdrop-blur z-10">
              <tr class="border-b border-terminal-border text-gray-400 font-mono">
                <th class="py-2 px-2">Articol</th>
                <th class="py-2 px-2 text-right w-14">Qty</th>
                <th class="py-2 px-2 text-right w-20">Preț</th>
                <th class="py-2 px-2 text-right w-20">Sumă</th>
                <th class="py-2 px-2 w-32">Categorie</th>
                <th class="py-2 px-2 w-8"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-terminal-border/50 font-mono">
              <tr v-for="(it, idx) in items" :key="idx" class="text-gray-300">
                <td class="py-1 px-1"><input v-model="it.name" class="w-full bg-terminal-surface border border-terminal-border rounded px-2 py-1 text-xs font-sans focus:outline-none focus:border-terminal-accent" placeholder="Denumire" /></td>
                <td class="py-1 px-1"><input v-model.number="it.qty" type="number" min="1" step="1" class="w-full bg-terminal-surface border border-terminal-border rounded px-1 py-1 text-xs text-right focus:outline-none focus:border-terminal-accent" /></td>
                <td class="py-1 px-1"><input v-model="it.unitPrice" type="number" step="0.01" @blur="recalcAmount(it)" class="w-full bg-terminal-surface border border-terminal-border rounded px-1 py-1 text-xs text-right focus:outline-none focus:border-terminal-accent" /></td>
                <td class="py-1 px-1"><input v-model="it.amount" type="number" step="0.01" class="w-full bg-terminal-surface border border-terminal-border rounded px-1 py-1 text-xs text-right font-bold focus:outline-none focus:border-terminal-accent" /></td>
                <td class="py-1 px-1">
                  <select v-model="it.type" @change="onTypeChange(it)" class="w-full bg-terminal-surface border border-terminal-border rounded px-1 py-1 text-[11px] focus:outline-none focus:border-terminal-accent">
                    <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">{{ opt.emoji }} {{ opt.label }}</option>
                  </select>
                </td>
                <td class="py-1 px-1 text-center">
                  <button type="button" class="text-gray-600 hover:text-red-400 flex items-center p-0.5" @click="removeRow(idx)"><X :size="13" /></button>
                </td>
              </tr>
              <tr v-if="items.length === 0">
                <td colspan="6" class="p-4 text-center text-gray-500 italic">Niciun articol. Apasă „+ Adaugă articol”.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <button type="button" class="w-full py-2 rounded-lg border-2 border-dashed border-terminal-border hover:border-terminal-accent/50 text-terminal-accent text-xs font-mono font-bold uppercase transition-colors" @click="addRow">
          + Adaugă articol
        </button>

        <!-- Grouped preview -->
        <div v-if="grouped.length > 1" class="space-y-1.5">
          <div class="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Se vor crea {{ grouped.length }} cheltuieli:</div>
          <div class="grid grid-cols-2 gap-2">
            <div v-for="g in grouped" :key="g.type" class="flex items-center justify-between px-3 py-2 bg-terminal-surface/50 border border-terminal-border/60 rounded-lg text-xs font-mono">
              <span class="text-gray-300">{{ g.emoji }} {{ g.label }} <span class="text-gray-500">({{ g.items.length }})</span></span>
              <span class="font-bold text-terminal-accent">{{ g.total.toFixed(2) }} RON</span>
            </div>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-end space-x-3 pt-4 border-t border-terminal-border">
        <AppButton variant="secondary" @click="close">
          {{ t('finances.close') }}
        </AppButton>
        <AppButton
          v-if="mode === 'form'"
          variant="primary"
          :disabled="isSaving || validItems.length === 0 || !merchantName.trim()"
          @click="save"
        >
          {{ isSaving ? 'Se salvează…' : grouped.length > 1 ? `Salvează ${grouped.length} cheltuieli` : 'Salvează bon' }}
        </AppButton>
      </div>
    </div>
  </AdaptiveOverlay>
</template>
