<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useFinancesStore } from '../../stores/finances';
import {
  useFinancesQuery,
  useUpdateExpenseStatusMutation,
  useDeleteExpenseMutation,
  useAddWealthAllocationMutation,
  useUpdateWealthAllocationMutation,
  useDeleteWealthAllocationMutation,
  useWealthSnapshotPreviewQuery,
  useApplyWealthSnapshotMutation,
  useUpdateFinanceSettingsMutation,
  useAddExtraIncomeMutation,
  useDeleteExtraIncomeMutation
} from '../../queries/useFinancesQuery';
import ExpenseAddModal from './components/ExpenseAddModal.vue';
import GeminiReceiptModal from './components/GeminiReceiptModal.vue';
import ExpenseDetailModal from './components/ExpenseDetailModal.vue';
import SimulateFutureSection from './components/SimulateFutureSection.vue';
import AppButton from '../../shared/ui/atoms/AppButton.vue';
import AppInput from '../../shared/ui/atoms/AppInput.vue';
import FormField from '../../shared/ui/molecules/FormField.vue';
import { usePortfolioQuery } from '../../queries/usePortfolioQuery';
import type { PortfolioPnlEntryDto } from '../../queries/useFinancesQuery';
import type { ExpenseItemDto, WealthAllocationDto, ExchangeRateDto } from '../../shared/api/types';
import { api } from '../../shared/api/client';
import { X, Pencil, Check, Trash2 } from 'lucide-vue-next';

const { t } = useI18n();
const financesStore = useFinancesStore();
const { data, isLoading } = useFinancesQuery(computed(() => financesStore.selectedMonth));
const { data: portfolioData } = usePortfolioQuery();

const monthOptions = computed(() => {
  const options = [];
  const now = new Date();
  for (let i = -12; i <= 36; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const isCurrent = i === 0;
    options.push({
      val,
      label: isCurrent ? `${val} (${t('finances.currentMonth')})` : val
    });
  }
  return options;
});

const updateStatusMutation = useUpdateExpenseStatusMutation();
const deleteExpenseMutation = useDeleteExpenseMutation();
const addWealthMutation = useAddWealthAllocationMutation();
const addExtraIncomeMutation = useAddExtraIncomeMutation();
const deleteExtraIncomeMutation = useDeleteExtraIncomeMutation();

function openAddExtraIncome() {
  extraIncomeName.value = '';
  extraIncomeAmount.value = '';
  extraIncomeCurrency.value = displayCurrency.value || 'RON';
  extraIncomeNotes.value = '';
  isAddingExtraIncome.value = true;
}

async function handleAddExtraIncome() {
  if (!extraIncomeAmount.value) return;
  await addExtraIncomeMutation.mutateAsync({
    name: extraIncomeName.value.trim() || 'Venit ocazional',
    amount: extraIncomeAmount.value,
    currency: extraIncomeCurrency.value,
    month: financesStore.selectedMonth,
    ...(extraIncomeNotes.value ? { notes: extraIncomeNotes.value.trim() } : {}),
  });
  isAddingExtraIncome.value = false;
}

async function removeExtraIncome(id: string) {
  await deleteExtraIncomeMutation.mutateAsync(id);
}

const deleteConfirm = ref<{ item: ExpenseItemDto } | null>(null);
const deleteScope = ref<'ONLY_THIS_MONTH' | 'THIS_AND_FUTURE' | 'ALL'>('ONLY_THIS_MONTH');

function openDeleteConfirm(item: ExpenseItemDto) {
  deleteConfirm.value = { item };
  deleteScope.value = 'ONLY_THIS_MONTH';
}

function cancelDelete() {
  deleteConfirm.value = null;
}

async function confirmDelete() {
  if (!deleteConfirm.value) return;
  const { item } = deleteConfirm.value;
  const scope = item.isRecurring ? deleteScope.value : 'ALL';
  await deleteExpenseMutation.mutateAsync({ id: item.id, scope, month: financesStore.selectedMonth });
  deleteConfirm.value = null;
}
const updateWealthMutation = useUpdateWealthAllocationMutation();
const deleteWealthMutation = useDeleteWealthAllocationMutation();
const { data: snapshotPreview } = useWealthSnapshotPreviewQuery(computed(() => financesStore.selectedMonth));
const applySnapshotMutation = useApplyWealthSnapshotMutation();

async function handleApplySnapshot() {
  await applySnapshotMutation.mutateAsync(financesStore.selectedMonth);
}
const updateSettingsMutation = useUpdateFinanceSettingsMutation();

const isEditingIncome = ref(false);
const newIncomeAmount = ref('');
const newIncomeCurrency = ref('RON');

function startEditingIncome() {
  newIncomeAmount.value = data.value?.settings.monthlyIncome.amount || '24500.00';
  newIncomeCurrency.value = data.value?.settings.monthlyIncome.currency || 'RON';
  isEditingIncome.value = true;
}

async function saveIncome() {
  if (!data.value) return;
  await updateSettingsMutation.mutateAsync({
    ...data.value.settings,
    monthlyIncome: {
      amount: newIncomeAmount.value,
      currency: newIncomeCurrency.value
    }
  });
  isEditingIncome.value = false;
}

const exchangeRates = ref<Map<string, number>>(new Map([['RON', 1]]));
const defaultCurrencies = ['RON', 'EUR', 'USD', 'GBP', 'CHF'];
const availableCurrencies = ref<string[]>(defaultCurrencies);

const LS_KEY = 'finances_display_currency';
const displayCurrency = ref<string>(localStorage.getItem(LS_KEY) || 'RON');

async function loadExchangeRates() {
  try {
    const rates = await api.get<ExchangeRateDto[]>('/settings/exchange-rates');
    const map = new Map<string, number>([['RON', 1]]);
    for (const r of rates) {
      const rate = parseFloat(r.rateToRon);
      if (!isNaN(rate) && rate > 0) map.set(r.currency, rate);
    }
    exchangeRates.value = map;
    const dbCodes = rates.map(r => r.currency);
    const merged = new Set([...defaultCurrencies, ...dbCodes]);
    availableCurrencies.value = Array.from(merged).sort((a, b) =>
      a === 'RON' ? -1 : b === 'RON' ? 1 : a.localeCompare(b)
    );
    if (!merged.has(displayCurrency.value)) {
      displayCurrency.value = 'RON';
      localStorage.setItem(LS_KEY, 'RON');
    }
  } catch { /* keep defaults */ }
}
loadExchangeRates();

function onDisplayCurrencyChange() {
  localStorage.setItem(LS_KEY, displayCurrency.value);
}

function convertToDisplay(val: string | number | null | undefined, fromCurrency: string): number {
  const n = typeof val === 'number' ? val : (parseFloat(String(val ?? 0)) || 0);
  if (isNaN(n)) return 0;
  const from = fromCurrency || 'RON';
  const to = displayCurrency.value || 'RON';
  if (from === to) return n;
  const rateFrom = exchangeRates.value.get(from) ?? 1;
  const rateTo = exchangeRates.value.get(to) ?? 1;
  return (n * rateFrom) / rateTo;
}

function convertBetween(val: string | number | null | undefined, from: string, to: string): number {
  const n = typeof val === 'number' ? val : (parseFloat(String(val ?? 0)) || 0);
  if (isNaN(n) || !from || !to || from === to) return n || 0;
  const rateFrom = exchangeRates.value.get(from) ?? 1;
  const rateTo = exchangeRates.value.get(to) ?? 1;
  return (n * rateFrom) / rateTo;
}

function formatNumber(numStr: string | number) {
  const num = typeof numStr === 'number' ? numStr : (parseFloat(numStr) || 0);
  return new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
}

function fmt(val: string | number | null | undefined, fromCurrency: string): string {
  return formatNumber(convertToDisplay(val, fromCurrency));
}

const incomeCurrency = computed(() => data.value?.summary.currency ?? 'RON');
const isNonRonIncome = computed(() => data.value?.settings.monthlyIncome.currency !== 'RON');

const mobileCameraInput = ref<HTMLInputElement | null>(null);
const nativeMonthSelectRef = ref<HTMLSelectElement | null>(null);
const isFabOpen = ref(false);

function triggerMobileCamera() {
  isFabOpen.value = false;
  mobileCameraInput.value?.click();
}

function openMobileAddExpense() {
  isFabOpen.value = false;
  financesStore.openAddExpenseModal();
}

function triggerMonthPicker() {
  isFabOpen.value = false;
  nativeMonthSelectRef.value?.focus();
  nativeMonthSelectRef.value?.click();
}

function onMobileCameraCapture(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  financesStore.openGeminiModal(file);
  input.value = '';
}

const isAddingWealth = ref(false);
const wealthName = ref('');
const wealthInst = ref('Banca Transilvania');
const wealthInstType = ref<'BANK' | 'BROKER'>('BANK');
const wealthType = ref<'BANK_DEPOSIT' | 'BROKER_CASH' | 'DCA_TARGET'>('BANK_DEPOSIT');
const wealthAmount = ref('');
const wealthCurrency = ref('RON');
const wealthInterest = ref('');
const wealthNotes = ref('');
const fxConvertEnabled = ref(false);
const fxSourceCurrency = ref('RON');

// ── Extra income (one-off / occasional) ─────────────────────────────────────
const isAddingExtraIncome = ref(false);
const extraIncomeName = ref('');
const extraIncomeAmount = ref('');
const extraIncomeCurrency = ref('RON');
const extraIncomeNotes = ref('');
const wealthAccountKey = ref<string>('__new__');

const defaultBanks = ['Banca Transilvania','ING Bank','BCR','BRD','Raiffeisen Bank','CEC Bank','Revolut','UniCredit Bank','Other'];
const defaultBrokers = ['TradeVille','XTB','Interactive Brokers','Trading212','eToro','Other'];

const availableInstitutions = computed(() => {
  if (!data.value) return wealthInstType.value === 'BANK' ? defaultBanks : defaultBrokers;
  if (wealthInstType.value === 'BANK') {
    return (data.value.settings?.banks?.length) ? data.value.settings.banks : defaultBanks;
  } else {
    return (data.value.settings?.brokers?.length) ? data.value.settings.brokers : defaultBrokers;
  }
});

function onWealthInstTypeChange() {
  if (availableInstitutions.value.length > 0) wealthInst.value = availableInstitutions.value[0] ?? 'Other';
  wealthType.value = wealthInstType.value === 'BANK' ? 'BANK_DEPOSIT' : 'DCA_TARGET';
}

function toggleAddingWealth() {
  isAddingWealth.value = !isAddingWealth.value;
  if (isAddingWealth.value && availableInstitutions.value.length > 0) {
    wealthInst.value = availableInstitutions.value[0] ?? 'Other';
  }
}

type ExistingAccount = {
  key: string;
  institution: string;
  institutionType: 'BANK' | 'BROKER';
  currency: string;
  type: string;
  interestRatePct?: string;
  representativeName: string;
};

const existingAccounts = computed<ExistingAccount[]>(() => {
  const source = [...(data.value?.cumulativeWealth ?? []), ...(data.value?.wealthAllocations ?? [])];
  const seen = new Map<string, ExistingAccount>();
  for (const w of source) {
    const key = `${w.institution}::${w.institutionType}::${w.currency}::${w.type}::${w.name}`;
    if (seen.has(key)) continue;
    const entry: ExistingAccount = {
      key, institution: w.institution, institutionType: w.institutionType,
      currency: w.currency, type: w.type,
      representativeName: w.subItems?.[0]?.name || w.name,
    };
    if (w.interestRatePct) entry.interestRatePct = w.interestRatePct;
    seen.set(key, entry);
  }
  return Array.from(seen.values());
});

const groupedExistingAccounts = computed(() => ({
  BANK: existingAccounts.value.filter(a => a.institutionType === 'BANK'),
  BROKER: existingAccounts.value.filter(a => a.institutionType === 'BROKER'),
}));

function onWealthAccountKeyChange() {
  if (wealthAccountKey.value === '__new__') return;
  const acc = existingAccounts.value.find(a => a.key === wealthAccountKey.value);
  if (!acc) return;
  wealthInst.value = acc.institution;
  wealthInstType.value = acc.institutionType;
  wealthType.value = acc.type as typeof wealthType.value;
  wealthCurrency.value = acc.currency;
  wealthName.value = acc.representativeName;
  if (acc.interestRatePct) wealthInterest.value = acc.interestRatePct;
}

const totalWealthAllocated = computed(() => {
  if (!data.value?.wealthAllocations) return 0;
  return data.value.wealthAllocations.reduce((sum, item) => sum + convertToDisplay(item.amount, item.currency), 0);
});

type InstitutionGroup = {
  key: string;
  institution: string;
  institutionType: 'BANK' | 'BROKER';
  currency: string;
  type: string;
  accountName: string;        // BANK: account name. BROKER: '' (label comes from type badge).
  cumulativeAmount: number;   // snapshot balance in NATIVE currency (from cumulativeWealth)
  currentMonthAmount: number; // this-month contribution in NATIVE currency
  totalAmount: number;        // final total shown on the card (deposited-so-far, native currency)
  monthDelta: number;         // amount added this month (display badge)
  positionsPnl: number;       // BROKER only: unrealized P&L for positions on (broker, currency), native
  hasPositions: boolean;      // BROKER only: whether any positions exist for that broker+currency
  interestRatePct?: string;
};

// Strips legal suffixes (S.A., SRL, Ltd…) and normalises case+punctuation so that
// wealth-allocation institution names ("TradeVille S.A.") match the broker identifiers
// that come back from transactions ("TRADEVILLE").
function normBroker(s: string): string {
  return s
    .replace(/\s+(s\.?a\.?|s\.?r\.?l\.?|ltd\.?|llc\.?|inc\.?|plc\.?)$/i, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const institutionGroups = computed<InstitutionGroup[]>(() => {
  const current = data.value?.wealthAllocations ?? [];
  const cumulative = data.value?.cumulativeWealth ?? [];
  const holdings = data.value?.holdingsAsOfMonth ?? [];
  const groups = new Map<string, InstitutionGroup>();

  // One card per distinct (institution, type, currency, name) — for both bank and broker.
  // BROKER buckets can differ per type (BROKER_CASH vs DCA_TARGET) and per name.
  function makeKey(w: WealthAllocationDto): string {
    return `${w.institution}::${w.institutionType}::${w.currency}::${w.type}::${w.name}`;
  }

  function ensure(key: string, seed: Omit<InstitutionGroup, 'key'>): InstitutionGroup {
    let g = groups.get(key);
    if (!g) {
      g = { key, ...seed };
      groups.set(key, g);
    }
    return g;
  }

  function seedFor(w: WealthAllocationDto): Omit<InstitutionGroup, 'key'> {
    return {
      institution: w.institution,
      institutionType: w.institutionType as 'BANK' | 'BROKER',
      currency: w.currency, type: w.type,
      cumulativeAmount: 0, currentMonthAmount: 0,
      totalAmount: 0, monthDelta: 0,
      positionsPnl: 0, hasPositions: false,
      accountName: w.name,
    };
  }

  // Pass 1: this-month deposits (aggregated per bucket, native currency)
  for (const w of current) {
    const key = makeKey(w);
    const g = ensure(key, seedFor(w));
    if (w.interestRatePct !== undefined && !g.interestRatePct) g.interestRatePct = w.interestRatePct;
    g.currentMonthAmount += parseFloat(w.amount) || 0;
  }

  // Pass 2: cumulative balance up to selected month
  for (const w of cumulative) {
    const key = makeKey(w);
    const g = ensure(key, seedFor(w));
    if (w.interestRatePct !== undefined && !g.interestRatePct) g.interestRatePct = w.interestRatePct;
    g.cumulativeAmount += parseFloat(w.amount) || 0;
  }

  // Pass 3: broker P&L per (institution, currency). Same P&L number shows on every card that
  // shares the same broker+currency (each type bucket gets the label). Errors on the margin
  // due to fees / FX drift are expected — user knows the P&L is a directional signal.
  //
  // Skip holdings whose backend `Close = 0` fallback yielded MarketValue=0 (no synced price
  // history yet — common for BVB tickers). Otherwise mkt-cost would surface as -cost, i.e. a
  // fake "colossal loss" the user sees on the card.
  const pnlByBrokerCurrency = new Map<string, number>();
  const hasPositionsByBrokerCurrency = new Map<string, boolean>();
  for (const h of holdings) {
    const shares = parseFloat(h.shares) || 0;
    const mkt = parseFloat(h.marketValue) || 0;
    const avg = parseFloat(h.avgCost) || 0;
    if (shares <= 0 || mkt <= 0) continue;
    const cost = shares * avg;
    const bcKey = `${normBroker(h.broker)}::${h.currency}`;
    pnlByBrokerCurrency.set(bcKey, (pnlByBrokerCurrency.get(bcKey) ?? 0) + (mkt - cost));
    hasPositionsByBrokerCurrency.set(bcKey, true);
  }

  // Broker net invested (BUY − SELL cash flow via that broker, all-time up to selected month),
  // keyed by (institution, currency). Drives the BROKER_CASH card total instead of the raw
  // wealth_allocations contribution — DCA_TARGET cards stay untouched since they represent a
  // savings goal, not capital already deployed.
  const netInvestedByBrokerCurrency = new Map<string, number>();
  for (const b of data.value?.summary?.brokerNetInvested ?? []) {
    const bcKey = `${normBroker(b.broker)}::${b.currency}`;
    netInvestedByBrokerCurrency.set(bcKey, parseFloat(b.amount) || 0);
  }

  // Pass 4: finalize per-card totals + attach broker P&L
  // Pre-scan: which broker+currency combos have an explicit BROKER_CASH card?
  const hasBrokerCash = new Set<string>();
  for (const g of groups.values()) {
    if (g.institutionType === 'BROKER' && g.type === 'BROKER_CASH') {
      hasBrokerCash.add(`${normBroker(g.institution)}::${g.currency}`);
    }
  }

  for (const g of groups.values()) {
    g.totalAmount = g.cumulativeAmount > 0 ? g.cumulativeAmount : g.currentMonthAmount;
    g.monthDelta = g.currentMonthAmount;
    if (g.institutionType === 'BROKER') {
      const bcKey = `${normBroker(g.institution)}::${g.currency}`;
      g.positionsPnl = pnlByBrokerCurrency.get(bcKey) ?? 0;
      g.hasPositions = hasPositionsByBrokerCurrency.get(bcKey) ?? false;
      // When there's no BROKER_CASH card, the DCA_TARGET card is the only capital
      // tracker for this broker. Add net-invested so it shows total capital
      // (undeployed allocation + deployed in positions), not just the remainder.
      if (g.type === 'DCA_TARGET' && !hasBrokerCash.has(bcKey)) {
        g.totalAmount += netInvestedByBrokerCurrency.get(bcKey) ?? 0;
      }
    }
  }

  // Sort by display-currency value so cross-currency ordering feels stable
  return Array.from(groups.values()).sort((a, b) =>
    convertToDisplay(b.totalAmount, b.currency) - convertToDisplay(a.totalAmount, a.currency)
  );
});

// Total deposited across all buckets, in display currency.
const totalDeposits = computed(() =>
  institutionGroups.value.reduce((sum, g) => sum + convertToDisplay(g.totalAmount, g.currency), 0)
);

// Portfolio-wide unrealized P&L in display currency (across every broker+currency).
// Same guard as pnlByBrokerCurrency: skip holdings whose price didn't sync (mkt=0),
// otherwise cost dominates and the header shows a fake "colossal loss".
const totalPortfolioPnl = computed(() => {
  const holdings = data.value?.holdingsAsOfMonth ?? [];
  let pnl = 0;
  for (const h of holdings) {
    const shares = parseFloat(h.shares) || 0;
    const mkt = parseFloat(h.marketValue) || 0;
    const avg = parseFloat(h.avgCost) || 0;
    if (shares <= 0 || mkt <= 0) continue;
    pnl += convertToDisplay(mkt - shares * avg, h.currency);
  }
  return pnl;
});

function effectiveDueDate(item: ExpenseItemDto): string {
  const selMonth = financesStore.selectedMonth;
  if (item.isRecurring && selMonth) {
    const day = item.dueDate ? item.dueDate.substring(8, 10) : '01';
    return `${selMonth}-${day}`;
  }
  if (item.dueDate) return item.dueDate;
  const created = item.createdAt.slice(0, 10);
  if (selMonth && !created.startsWith(selMonth)) return `${selMonth}-01`;
  return created;
}

const holdingsAsOfMonth = computed(() => data.value?.holdingsAsOfMonth ?? []);

const totalPortfolioValue = computed(() =>
  holdingsAsOfMonth.value.reduce((sum, h) => {
    const mkt = parseFloat(h.marketValue) || 0;
    if (mkt <= 0) return sum;
    return sum + convertToDisplay(mkt, h.currency);
  }, 0)
);

// Today's portfolio PnL vs avg buy price, summed across all positions in display currency.
// Uses today's price regardless of the selected month (future months also compare vs today).
const todayPnlTotal = computed(() => {
  const entries: PortfolioPnlEntryDto[] = data.value?.todayPortfolioPnl ?? [];
  return entries.reduce((sum, e) => sum + convertToDisplay(parseFloat(e.pnlAmount) || 0, e.currency), 0);
});

// Main patrimoniu figure = capital deposited ± today's portfolio PnL.
const totalPatrimoniu = computed(() => totalDeposits.value + todayPnlTotal.value);

const isPatrimoniuPreviewMode = computed(() =>
  (data.value?.wealthAllocations.length ?? 0) === 0 && (data.value?.cumulativeWealth?.length ?? 0) > 0
);

const fxConvertedPreview = computed(() => {
  if (!fxConvertEnabled.value) return null;
  if (fxSourceCurrency.value === wealthCurrency.value) return null;
  const converted = convertBetween(wealthAmount.value, fxSourceCurrency.value, wealthCurrency.value);
  if (!converted) return null;
  return { amount: converted, currency: wealthCurrency.value };
});

async function handleAddWealth() {
  if (!wealthAmount.value) return;
  let resolvedName = wealthName.value.trim();
  if (wealthAccountKey.value !== '__new__') {
    const acc = existingAccounts.value.find(a => a.key === wealthAccountKey.value);
    if (acc) resolvedName = acc.representativeName;
  }
  const fallbackName = `${wealthInst.value} ${wealthCurrency.value} ${wealthType.value}`;

  const insertAmount = fxConvertEnabled.value && fxSourceCurrency.value !== wealthCurrency.value
    ? convertBetween(wealthAmount.value, fxSourceCurrency.value, wealthCurrency.value).toFixed(2)
    : wealthAmount.value;

  await addWealthMutation.mutateAsync({
    name: resolvedName || fallbackName,
    institution: wealthInst.value || (availableInstitutions.value[0] ?? 'Other'),
    institutionType: wealthInstType.value,
    type: wealthType.value,
    amount: insertAmount,
    currency: wealthCurrency.value,
    month: financesStore.selectedMonth,
    ...(wealthInterest.value ? { interestRatePct: wealthInterest.value } : {}),
    ...(wealthNotes.value ? { notes: wealthNotes.value.trim() } : {})
  });
  wealthName.value = '';
  wealthAmount.value = '';
  wealthInterest.value = '';
  wealthNotes.value = '';
  wealthAccountKey.value = '__new__';
  fxConvertEnabled.value = false;
  isAddingWealth.value = false;
}

const editingWealth = ref<WealthAllocationDto | null>(null);
const editName = ref('');
const editAmount = ref('');
const editInterest = ref('');
const editInst = ref('');

function startEditWealth(alloc: WealthAllocationDto) {
  editingWealth.value = alloc;
  editName.value = alloc.name;
  editAmount.value = alloc.amount;
  editInterest.value = alloc.interestRatePct ?? '';
  editInst.value = alloc.institution;
}

function cancelEditWealth() { editingWealth.value = null; }

async function saveEditWealth() {
  if (!editingWealth.value) return;
  const original = editingWealth.value;
  const patch: Partial<WealthAllocationDto> = {
    name: editName.value || original.name,
    institution: editInst.value || original.institution,
    institutionType: original.institutionType,
    type: original.type,
    amount: editAmount.value || original.amount,
    currency: original.currency,
  };
  if (editInterest.value) patch.interestRatePct = editInterest.value;
  if (original.notes) patch.notes = original.notes;
  await updateWealthMutation.mutateAsync({ id: original.id, patch });
  editingWealth.value = null;
}

async function handleDeleteWealth(id: string) {
  if (!confirm('Sigur ștergi această alocare din luna curentă?')) return;
  await deleteWealthMutation.mutateAsync(id);
}

// ── Generic broker commissions deduction ──────────────────────────────────────
const isAddingCommission = ref(false);
const commissionBroker = ref('');
const commissionAmount = ref('');
const commissionCurrency = ref('RON');

const availableBrokers = computed(() => {
  const names = institutionGroups.value
    .filter(g => g.institutionType === 'BROKER')
    .map(g => g.institution);
  return [...new Set(names)];
});

function openCommissionForm() {
  commissionBroker.value = availableBrokers.value[0] ?? '';
  commissionAmount.value = '';
  commissionCurrency.value = displayCurrency.value || 'RON';
  isAddingCommission.value = true;
}

async function handleAddCommission() {
  const amt = parseFloat(commissionAmount.value);
  if (!amt || !commissionBroker.value) return;
  await addWealthMutation.mutateAsync({
    name: 'Comisioane Generice',
    institution: commissionBroker.value,
    institutionType: 'BROKER',
    type: 'BROKER_CASH',
    amount: (-Math.abs(amt)).toFixed(2),
    currency: commissionCurrency.value,
    month: financesStore.selectedMonth,
  });
  isAddingCommission.value = false;
  commissionAmount.value = '';
}

const loansAndSubscriptions = computed(() => {
  if (!data.value) return [];
  return data.value.expenses.filter((e) => e.type === 'LOAN' || e.type === 'SUBSCRIPTION');
});

const utilitiesAndVariable = computed(() => {
  if (!data.value) return [];
  return data.value.expenses.filter((e) => e.type !== 'LOAN' && e.type !== 'SUBSCRIPTION');
});

type CategoryBucket = {
  type: string;
  label: string;
  emoji: string;
  color: string;
  total: number;
  expenses: ExpenseItemDto[];
};

const CATEGORY_META: Record<string, { label: string; emoji: string; color: string }> = {
  FOOD:       { label: 'Mâncare',       emoji: '🍞', color: 'emerald' },
  CIGARETTES: { label: 'Țigări',        emoji: '🚬', color: 'orange'  },
  UTILITY:    { label: 'Utilități',     emoji: '⚡', color: 'sky'     },
  VARIABLE:   { label: 'Buffer/Diverse',emoji: '🧺', color: 'purple'  },
  OTHER:      { label: 'Altele',        emoji: '❔', color: 'gray'    },
};

const aggregatedByCategory = computed<CategoryBucket[]>(() => {
  const buckets = new Map<string, CategoryBucket>();
  for (const e of utilitiesAndVariable.value) {
    const meta = CATEGORY_META[e.type] ?? { label: e.type, emoji: '📦', color: 'gray' };
    const bucket = buckets.get(e.type) ?? { type: e.type, label: meta.label, emoji: meta.emoji, color: meta.color, total: 0, expenses: [] };
    bucket.total += convertToDisplay(e.amount, e.currency);
    bucket.expenses.push(e);
    buckets.set(e.type, bucket);
  }
  return Array.from(buckets.values()).sort((a, b) => b.total - a.total);
});

const categoryDetail = ref<CategoryBucket | null>(null);
const expandedExpenseId = ref<string | null>(null);

function openCategoryDetail(bucket: CategoryBucket) {
  categoryDetail.value = bucket;
  expandedExpenseId.value = null;
}

function closeCategoryDetail() {
  categoryDetail.value = null;
  expandedExpenseId.value = null;
}

function toggleExpense(id: string) {
  expandedExpenseId.value = expandedExpenseId.value === id ? null : id;
}

function formatShortDate(iso: string | undefined | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

async function toggleStatus(expense: ExpenseItemDto) {
  const next: 'PAID' | 'DUE' | 'PENDING' =
    expense.status === 'PAID' ? 'DUE' : expense.status === 'DUE' ? 'PENDING' : 'PAID';
  await updateStatusMutation.mutateAsync({ id: expense.id, status: next, month: financesStore.selectedMonth });
}

async function confirmPayment(expense: ExpenseItemDto) {
  await updateStatusMutation.mutateAsync({ id: expense.id, status: 'PAID', month: financesStore.selectedMonth });
}

function isOverdueUnconfirmed(item: ExpenseItemDto): boolean {
  if (item.status === 'PAID') return false;
  const due = effectiveDueDate(item);
  if (!due) return false;
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return due <= todayStr;
}

function getStatusBadgeClass(status: 'PAID' | 'DUE' | 'PENDING') {
  switch (status) {
    case 'PAID':    return 'bg-terminal-up/10 text-terminal-up border-terminal-up/30';
    case 'DUE':     return 'bg-terminal-down/10 text-terminal-down border-terminal-down/30';
    case 'PENDING': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
  }
}

function getCategoryColor(type: string) {
  switch (type) {
    case 'LOAN':         return 'text-red-400 border-red-500/50';
    case 'SUBSCRIPTION': return 'text-purple-400 border-purple-500/50';
    case 'UTILITY':      return 'text-sky-400 border-sky-500/50';
    case 'FOOD':         return 'text-emerald-400 border-emerald-500/50';
    case 'CIGARETTES':   return 'text-orange-400 border-orange-500/50';
    default:             return 'text-gray-300 border-gray-600/50';
  }
}

// Tab state
const activeTab = ref<'cheltuieli' | 'avere' | 'simulare'>('cheltuieli');
const activeExpenseTab = ref<'fixed' | 'variable'>('fixed');

const totalFixed = computed(() => loansAndSubscriptions.value.reduce((s, e) => s + convertToDisplay(e.amount, e.currency), 0));
const totalVariable = computed(() => utilitiesAndVariable.value.reduce((s, e) => s + convertToDisplay(e.amount, e.currency), 0));
const totalExpenses = computed(() => totalFixed.value + totalVariable.value);
</script>

<template>
  <div class="select-none pb-24">

    <!-- Hidden camera input -->
    <input ref="mobileCameraInput" type="file" accept="image/*" capture="environment" class="hidden" @change="onMobileCameraCapture" />

    <!-- ─── MOBILE FAB ────────────────────────────────────────────────────────── -->
    <div class="sm:hidden fixed bottom-20 right-4 z-50">
      <Transition name="fade">
        <div v-if="isFabOpen" class="fixed inset-0 bg-black/60 backdrop-blur-xs z-40" @click="isFabOpen = false" />
      </Transition>
      <div class="relative z-50 flex flex-col items-end gap-3">
        <TransitionGroup name="fab-speeddial">
          <div v-if="isFabOpen" key="month-action" class="flex items-center gap-2">
            <span class="bg-terminal-surface/95 border border-terminal-border px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-gray-200 shadow-xl">
              {{ financesStore.selectedMonth }}
            </span>
            <select
              ref="nativeMonthSelectRef"
              :value="financesStore.selectedMonth"
              @change="(e) => { financesStore.setSelectedMonth((e.target as HTMLSelectElement).value); isFabOpen = false; }"
              class="w-12 h-12 rounded-full bg-indigo-600 text-white shadow-xl flex items-center justify-center text-lg active:scale-95 transition-transform appearance-none text-center cursor-pointer font-bold"
            >
              <option v-for="opt in monthOptions" :key="opt.val" :value="opt.val">{{ opt.val }}</option>
            </select>
          </div>
          <div v-if="isFabOpen" key="camera-action" class="flex items-center gap-2">
            <span class="bg-terminal-surface/95 border border-terminal-border px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-gray-200 shadow-xl">Scanare Bon</span>
            <button type="button" @click="triggerMobileCamera" class="w-12 h-12 rounded-full bg-emerald-500 text-terminal-bg shadow-xl flex items-center justify-center text-xl hover:scale-110 active:scale-95 transition-all cursor-pointer">📷</button>
          </div>
          <div v-if="isFabOpen" key="expense-action" class="flex items-center gap-2">
            <span class="bg-terminal-surface/95 border border-terminal-border px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-gray-200 shadow-xl">Adaugă Cheltuială</span>
            <button type="button" @click="openMobileAddExpense" class="w-12 h-12 rounded-full bg-terminal-accent text-terminal-bg shadow-xl flex items-center justify-center text-xl hover:scale-110 active:scale-95 transition-all cursor-pointer">💳</button>
          </div>
          <div v-if="isFabOpen" key="extra-income-action" class="flex items-center gap-2">
            <span class="bg-terminal-surface/95 border border-terminal-border px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-gray-200 shadow-xl">Venit ocazional</span>
            <button type="button" @click="isFabOpen = false; openAddExtraIncome()" class="w-12 h-12 rounded-full bg-amber-500 text-terminal-bg shadow-xl flex items-center justify-center text-xl hover:scale-110 active:scale-95 transition-all cursor-pointer">💰</button>
          </div>
        </TransitionGroup>
        <button type="button" @click="isFabOpen = !isFabOpen"
          class="relative w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 cursor-pointer border border-white/20 active:scale-95 group z-10 overflow-visible"
          :class="isFabOpen ? 'bg-rose-500 text-white shadow-rose-500/50' : 'bg-gradient-to-tr from-cyan-500 via-emerald-400 to-cyan-400 text-black shadow-lg shadow-cyan-500/40 scale-105 hover:scale-110'"
        >
          <span v-if="!isFabOpen" class="absolute -inset-1 rounded-full bg-cyan-400/40 blur-md animate-ping opacity-75 pointer-events-none"></span>
          <svg class="w-7 h-7 transition-transform duration-300 relative z-10" :class="isFabOpen ? 'rotate-45 text-white' : 'text-slate-950 group-hover:rotate-90'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>
    </div>

    <!-- ─── PAGE HEADER ──────────────────────────────────────────────────────── -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-terminal-border pb-5 mb-5">
      <div>
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-terminal-accent animate-pulse"></span>
          <h1 class="text-xl font-mono font-bold text-gray-100 uppercase tracking-tight">{{ t('finances.title') }}</h1>
        </div>
        <p class="text-[11px] font-mono text-gray-500 mt-0.5">{{ t('finances.subtitle') }}</p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <!-- Month -->
        <select
          :value="financesStore.selectedMonth"
          @change="(e) => financesStore.setSelectedMonth((e.target as HTMLSelectElement).value)"
          class="bg-terminal-surface border border-terminal-border rounded-xl px-3 py-2 text-xs font-mono font-bold text-gray-100 focus:outline-none focus:border-terminal-accent"
        >
          <option v-for="opt in monthOptions" :key="opt.val" :value="opt.val">{{ opt.label }}</option>
        </select>

        <!-- Display currency -->
        <div class="flex items-center gap-1.5 bg-terminal-surface border border-terminal-border rounded-xl px-3 py-2">
          <span class="text-[10px] font-mono text-gray-500 uppercase">{{ t('finances.displayIn') }}</span>
          <select v-model="displayCurrency" @change="onDisplayCurrencyChange" class="bg-transparent text-xs font-mono font-bold text-terminal-accent focus:outline-none cursor-pointer">
            <option v-for="c in availableCurrencies" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>

        <!-- Income inline (desktop) -->
        <div v-if="data" class="hidden sm:flex items-center gap-1.5 bg-terminal-surface border border-terminal-border rounded-xl px-3 py-2">
          <span class="text-[10px] font-mono text-gray-500 uppercase">{{ t('finances.incomeLabel') }}:</span>
          <template v-if="isEditingIncome">
            <input v-model="newIncomeAmount" type="number" step="100" class="bg-transparent w-20 text-xs font-mono font-bold text-gray-100 focus:outline-none border-b border-terminal-accent/50" />
            <select v-model="newIncomeCurrency" class="bg-transparent text-xs font-mono text-gray-300 focus:outline-none">
              <option v-for="c in availableCurrencies" :key="c" :value="c">{{ c }}</option>
            </select>
            <button type="button" @click="saveIncome" class="text-terminal-accent hover:text-terminal-accent/80 ml-1 flex items-center"><Check :size="13" /></button>
          </template>
          <template v-else>
            <span class="text-xs font-mono font-bold text-gray-100">{{ data.settings.monthlyIncome.amount }} {{ data.settings.monthlyIncome.currency }}</span>
            <button type="button" @click="startEditingIncome" class="text-terminal-accent hover:text-terminal-accent/70 ml-1 flex items-center"><Pencil :size="13" /></button>
          </template>
        </div>

        <AppButton variant="secondary" @click="financesStore.openGeminiModal()" size="sm" class="hidden sm:inline-flex">
          <span class="mr-1">🧾</span> Bon
        </AppButton>
        <AppButton variant="secondary" @click="openAddExtraIncome" size="sm" class="hidden sm:inline-flex">
          + Venit ocazional
        </AppButton>
        <AppButton variant="primary" @click="financesStore.openAddExpenseModal" size="sm" class="hidden sm:inline-flex">
          + Cheltuială
        </AppButton>
        <router-link to="/settings#finances" class="hidden sm:flex px-3 py-1.5 rounded-xl bg-terminal-surface border border-terminal-border hover:border-terminal-accent/50 text-xs font-mono text-gray-400 hover:text-gray-200 transition-colors items-center gap-1">
          <span>⚙</span><span>{{ t('finances.configEnumsBtn') }}</span>
        </router-link>
      </div>
    </div>

    <!-- ─── LOADING ───────────────────────────────────────────────────────────── -->
    <div v-if="isLoading && !data" class="text-center py-20 text-xs font-mono text-gray-500 animate-pulse">{{ t('finances.loading') }}</div>

    <!-- ─── SUMMARY STRIP ─────────────────────────────────────────────────────── -->
    <div v-if="data" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">

      <!-- Venit Net -->
      <div class="bg-terminal-surface border border-terminal-border rounded-2xl p-3.5 flex flex-col gap-1 group relative">
        <div class="flex items-center justify-between gap-1">
          <p class="text-[10px] sm:text-[11px] font-mono font-bold text-gray-400 uppercase tracking-widest">{{ t('finances.incomeLabel') }}</p>
          <button
            type="button"
            @click="isEditingIncome ? saveIncome() : startEditingIncome()"
            class="opacity-0 group-hover:opacity-100 text-[10px] font-mono font-bold px-1 py-0.5 rounded border transition-all flex-shrink-0"
            :class="isEditingIncome ? 'text-terminal-accent border-terminal-accent/50 bg-terminal-accent/10 opacity-100' : 'text-gray-500 border-white/20 hover:text-terminal-accent hover:border-terminal-accent/50'"
          ><Check v-if="isEditingIncome" :size="13" /><Pencil v-else :size="13" /></button>
        </div>
        <template v-if="isEditingIncome">
          <div class="flex items-center gap-1 mt-1">
            <input v-model="newIncomeAmount" type="number" step="100" class="bg-transparent flex-1 min-w-0 text-base font-mono font-black text-gray-100 focus:outline-none border-b border-terminal-accent/50" />
            <select v-model="newIncomeCurrency" class="bg-transparent text-xs font-mono text-gray-400 focus:outline-none">
              <option v-for="c in availableCurrencies" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
        </template>
        <template v-else>
          <p class="text-2xl sm:text-3xl font-mono font-black text-gray-100 leading-none sw-private">
            {{ fmt(data.summary.netIncome, incomeCurrency) }}
          </p>
          <p class="text-[11px] font-mono text-gray-500">{{ displayCurrency }}<span v-if="isNonRonIncome"> · {{ data.settings.monthlyIncome.amount }} {{ data.settings.monthlyIncome.currency }}</span></p>
          <p v-if="data.summary.totalExtraIncomes && parseFloat(data.summary.totalExtraIncomes) > 0" class="text-[10px] font-mono text-amber-400/80 mt-0.5">
            + {{ formatNumber(data.summary.totalExtraIncomes || '0') }} ocazional
          </p>
        </template>
      </div>

      <!-- Total Cheltuieli -->
      <div class="bg-terminal-surface border border-terminal-border rounded-2xl p-3.5 flex flex-col gap-1">
        <p class="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-widest">{{ t('finances.totalExpenses') }}</p>
        <p class="text-2xl sm:text-3xl font-mono font-black text-terminal-down leading-none sw-private">
          {{ formatNumber(totalExpenses) }}
        </p>
        <p class="text-[10px] font-mono text-gray-500">{{ displayCurrency }} · {{ loansAndSubscriptions.length + utilitiesAndVariable.length }} intrări</p>
      </div>

      <!-- Cheltuieli Fixe -->
      <button
        type="button"
        class="text-left bg-terminal-surface border rounded-2xl p-3.5 flex flex-col gap-1 hover:border-amber-500/50 transition-colors"
        :class="activeTab === 'cheltuieli' && activeExpenseTab === 'fixed' ? 'border-amber-500/40 bg-amber-500/5' : 'border-terminal-border'"
        @click="activeTab = 'cheltuieli'; activeExpenseTab = 'fixed'"
      >
        <p class="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-widest">{{ t('finances.subTabFixed') }}</p>
        <p class="text-2xl sm:text-3xl font-mono font-black text-amber-300 leading-none sw-private">
          {{ formatNumber(totalFixed) }}
        </p>
        <p class="text-[10px] font-mono text-gray-500">{{ displayCurrency }} · {{ loansAndSubscriptions.length }} înreg.</p>
      </button>

      <!-- Cheltuieli Variabile -->
      <button
        type="button"
        class="text-left bg-terminal-surface border rounded-2xl p-3.5 flex flex-col gap-1 hover:border-sky-500/50 transition-colors"
        :class="activeTab === 'cheltuieli' && activeExpenseTab === 'variable' ? 'border-sky-500/40 bg-sky-500/5' : 'border-terminal-border'"
        @click="activeTab = 'cheltuieli'; activeExpenseTab = 'variable'"
      >
        <p class="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-widest">Variabile</p>
        <p class="text-2xl sm:text-3xl font-mono font-black text-sky-300 leading-none sw-private">
          {{ formatNumber(totalVariable) }}
        </p>
        <p class="text-[10px] font-mono text-gray-500">{{ displayCurrency }} · {{ utilitiesAndVariable.length }} bonuri</p>
      </button>

      <!-- Avere Alocată -->
      <button
        type="button"
        class="text-left bg-terminal-surface border rounded-2xl p-3.5 flex flex-col gap-1 hover:border-terminal-accent/50 transition-colors"
        :class="activeTab === 'avere' ? 'border-terminal-accent/40 bg-terminal-accent/5' : 'border-terminal-border'"
        @click="activeTab = 'avere'"
      >
        <p class="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-widest">Alocat</p>
        <p class="text-2xl sm:text-3xl font-mono font-black text-terminal-accent leading-none sw-private">
          {{ formatNumber(totalWealthAllocated) }}
        </p>
        <p class="text-[10px] font-mono text-gray-500">{{ displayCurrency }} · {{ data.wealthAllocations.length }} conturi</p>
      </button>

      <!-- Cash Liber -->
      <div class="bg-terminal-surface border border-terminal-border rounded-2xl p-3.5 flex flex-col gap-1">
        <div class="flex items-center justify-between gap-1">
          <p class="text-[10px] sm:text-[11px] font-mono font-bold text-gray-400 uppercase tracking-widest">Economisit</p>
          <span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex-shrink-0">{{ data.summary.savingsRatePct }}%</span>
        </div>
        <p class="text-2xl sm:text-3xl font-mono font-black text-terminal-up leading-none sw-private">
          {{ fmt(data.summary.freeCash, incomeCurrency) }}
        </p>
        <p class="text-[10px] font-mono text-gray-500">{{ displayCurrency }}</p>
        <div class="h-1 bg-terminal-border rounded-full overflow-hidden mt-auto">
          <div
            class="h-full bg-gradient-to-r from-terminal-accent to-terminal-up transition-all duration-500"
            :style="{ width: `${Math.min(100, Math.max(0, parseFloat(data.summary.savingsRatePct)))}%` }"
          />
        </div>
      </div>
    </div>

    <!-- ─── TAB NAV ────────────────────────────────────────────────────────────── -->
    <div v-if="data" class="flex border-b border-terminal-border mb-6">
      <button
        v-for="tab in (['cheltuieli', 'avere', 'simulare'] as const)"
        :key="tab"
        type="button"
        @click="activeTab = tab"
        class="px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider border-b-2 -mb-px transition-colors capitalize"
        :class="activeTab === tab
          ? 'text-terminal-accent border-terminal-accent'
          : 'text-gray-500 border-transparent hover:text-gray-200'"
      >
        {{ tab }}
        <span v-if="tab === 'cheltuieli'" class="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
          :class="activeTab === 'cheltuieli' ? 'bg-terminal-accent/20 text-terminal-accent' : 'bg-terminal-surface text-gray-500'">
          {{ loansAndSubscriptions.length + utilitiesAndVariable.length }}
        </span>
        <span v-if="tab === 'avere'" class="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
          :class="activeTab === 'avere' ? 'bg-terminal-accent/20 text-terminal-accent' : 'bg-terminal-surface text-gray-500'">
          {{ data.wealthAllocations.length }}
        </span>
      </button>
    </div>

    <!-- ─── EXTRA INCOMES STRIP ────────────────────────────────────────────────── -->
    <div v-if="data && data.extraIncomes && data.extraIncomes.length > 0 && activeTab === 'cheltuieli'" class="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5">
      <div class="mb-2.5">
        <span class="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">💰 Venituri ocazionale · {{ financesStore.selectedMonth }}</span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        <div v-for="extra in data.extraIncomes" :key="extra.id" class="group flex items-center justify-between gap-2 bg-terminal-surface/60 border border-amber-500/20 rounded-xl px-3 py-2.5">
          <div class="min-w-0 flex-1">
            <div class="text-sm font-mono font-bold text-gray-100 truncate leading-tight">{{ extra.name }}</div>
            <div class="mt-0.5 flex items-center gap-1.5 text-[11px] font-mono">
              <span class="text-amber-300 font-bold sw-private">+ {{ formatNumber(extra.amount) }} {{ extra.currency }}</span>
              <span v-if="extra.notes" class="text-gray-500 truncate">· {{ extra.notes }}</span>
            </div>
          </div>
          <button type="button" @click="removeExtraIncome(extra.id)" class="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-all flex items-center touch-manipulation p-1.5 rounded-lg hover:bg-white/5 flex-shrink-0"><Trash2 :size="14" /></button>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════════════════
         TAB: CHELTUIELI
    ════════════════════════════════════════════════════════════════════════════ -->
    <div v-if="data && activeTab === 'cheltuieli'" class="space-y-5">

      <!-- Segmented control: FIXE | VARIABILE -->
      <div class="flex flex-col sm:flex-row sm:items-center gap-3">
        <div class="grid grid-cols-2 gap-0 p-1 rounded-2xl bg-terminal-surface border border-terminal-border w-full sm:w-auto">
          <button
            type="button"
            @click="activeExpenseTab = 'fixed'"
            class="relative flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-mono font-bold uppercase tracking-wider transition-all duration-200"
            :class="activeExpenseTab === 'fixed'
              ? 'bg-gradient-to-br from-amber-500/25 to-amber-600/15 text-amber-200 shadow-inner shadow-amber-500/10'
              : 'text-gray-500 hover:text-gray-200'"
          >
            <span class="inline-flex items-center justify-center w-5 h-5 rounded-md"
              :class="activeExpenseTab === 'fixed' ? 'bg-amber-500/30 text-amber-100' : 'bg-terminal-bg text-gray-500'">
              <svg viewBox="0 0 24 24" fill="none" class="w-3 h-3" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M6 12h12M9 18h6"/></svg>
            </span>
            <span>{{ t('finances.subTabFixed') }}</span>
            <span
              class="min-w-[22px] px-1.5 py-0.5 rounded-md text-[11px] font-black tabular-nums"
              :class="activeExpenseTab === 'fixed' ? 'bg-amber-500/30 text-amber-100' : 'bg-terminal-bg text-gray-500'"
            >{{ loansAndSubscriptions.length }}</span>
          </button>
          <button
            type="button"
            @click="activeExpenseTab = 'variable'; categoryDetail = null"
            class="relative flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-mono font-bold uppercase tracking-wider transition-all duration-200"
            :class="activeExpenseTab === 'variable'
              ? 'bg-gradient-to-br from-sky-500/25 to-sky-600/15 text-sky-200 shadow-inner shadow-sky-500/10'
              : 'text-gray-500 hover:text-gray-200'"
          >
            <span class="inline-flex items-center justify-center w-5 h-5 rounded-md"
              :class="activeExpenseTab === 'variable' ? 'bg-sky-500/30 text-sky-100' : 'bg-terminal-bg text-gray-500'">
              <svg viewBox="0 0 24 24" fill="none" class="w-3 h-3" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M13 3L4 14h7l-1 7 9-11h-7l1-7z"/></svg>
            </span>
            <span>{{ t('finances.subTabVariable') }}</span>
            <span
              class="min-w-[22px] px-1.5 py-0.5 rounded-md text-[11px] font-black tabular-nums"
              :class="activeExpenseTab === 'variable' ? 'bg-sky-500/30 text-sky-100' : 'bg-terminal-bg text-gray-500'"
            >{{ utilitiesAndVariable.length }}</span>
          </button>
        </div>
        <div class="flex-1"></div>
        <div class="flex items-baseline gap-2 sm:justify-end px-3 sm:px-0">
          <span class="text-[10px] font-mono text-gray-500 uppercase tracking-wider">{{ t('finances.totalLabel') }}</span>
          <span class="text-lg font-mono font-black sw-private"
            :class="activeExpenseTab === 'fixed' ? 'text-amber-300' : 'text-sky-300'">
            {{ formatNumber(activeExpenseTab === 'fixed' ? totalFixed : totalVariable) }}
            <span class="text-[11px] font-bold text-gray-400">{{ displayCurrency }}</span>
          </span>
        </div>
      </div>

      <!-- ── FIXED: card grid ── -->
      <div v-if="activeExpenseTab === 'fixed'">
        <div v-if="loansAndSubscriptions.length === 0" class="py-12 text-center text-xs font-mono text-gray-500 bg-terminal-surface border border-terminal-border rounded-2xl">
          {{ t('finances.noFixedForMonth', { month: financesStore.selectedMonth }) }}
        </div>
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            v-for="item in loansAndSubscriptions"
            :key="item.id"
            class="bg-terminal-surface border border-terminal-border rounded-2xl p-4 flex flex-col gap-3 hover:border-terminal-accent/40 transition-colors"
          >
            <!-- Row 1: type badge + recurring + status -->
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-[10px] font-mono font-bold border rounded px-2 py-0.5 uppercase tracking-wider flex-shrink-0" :class="getCategoryColor(item.type)">
                  {{ item.type }}
                </span>
                <span v-if="item.isRecurring" class="text-[10px] font-mono text-amber-500 flex-shrink-0">↺ recurent</span>
              </div>
              <button
                v-if="isOverdueUnconfirmed(item)"
                type="button"
                @click="confirmPayment(item)"
                class="px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold border cursor-pointer bg-amber-500/15 text-amber-300 border-amber-500/50 hover:bg-amber-500/25 transition animate-pulse touch-manipulation flex-shrink-0"
              ><span class="flex items-center gap-1"><Check :size="12" /> CONFIRMĂ</span></button>
              <button
                v-else
                type="button"
                @click="toggleStatus(item)"
                class="px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold border cursor-pointer hover:opacity-80 transition-opacity touch-manipulation flex-shrink-0"
                :class="getStatusBadgeClass(item.status)"
              >{{ t('enums.' + item.status, item.status) }}</button>
            </div>

            <!-- Row 2: name + category/interest -->
            <div class="min-w-0">
              <div class="text-sm font-mono font-bold text-gray-100 truncate">{{ item.name }}</div>
              <div class="text-[10px] font-mono text-gray-500 mt-0.5">
                {{ item.category }}<span v-if="item.interestRatePct"> · <span class="text-red-400">{{ item.interestRatePct }}% {{ t('finances.interestRate') }}</span></span>
              </div>
            </div>

            <!-- Row 3: amount + due date + actions -->
            <div class="flex items-end justify-between gap-2 pt-2.5 border-t border-terminal-border/40">
              <div>
                <div class="text-xl font-mono font-black text-gray-100 leading-none sw-private">
                  {{ fmt(item.amount, item.currency) }} <span class="text-[10px] font-normal text-gray-500">{{ displayCurrency }}</span>
                </div>
                <div v-if="item.currency !== displayCurrency" class="text-[10px] font-mono text-gray-600 mt-0.5 sw-private">{{ formatNumber(item.amount) }} {{ item.currency }}</div>
                <div v-if="effectiveDueDate(item)" class="text-[10px] font-mono text-gray-500 mt-1">scadent {{ effectiveDueDate(item) }}</div>
              </div>
              <div class="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  @click="financesStore.openEditExpenseModal(item)"
                  class="text-terminal-accent text-xs px-2.5 py-1.5 rounded-lg bg-terminal-accent/10 hover:bg-terminal-accent/20 border border-terminal-accent/20 transition-colors touch-manipulation"
                  title="Editează"
                ><Pencil :size="13" /></button>
                <button
                  type="button"
                  @click="openDeleteConfirm(item)"
                  class="text-gray-500 hover:text-red-400 text-xs px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 transition-colors touch-manipulation"
                  title="Șterge"
                ><X :size="13" /></button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── VARIABLE: category buckets ── -->
      <div v-if="activeExpenseTab === 'variable'" class="space-y-4">

        <div v-if="aggregatedByCategory.length === 0" class="py-12 text-center text-xs font-mono text-gray-500 bg-terminal-surface border border-terminal-border rounded-2xl">
          {{ t('finances.noVariableForMonth', { month: financesStore.selectedMonth }) }}
        </div>

        <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <button
            v-for="bucket in aggregatedByCategory"
            :key="bucket.type"
            type="button"
            class="text-left rounded-2xl p-4 space-y-2.5 border transition-all duration-200 card-hover shadow-md"
            :class="categoryDetail?.type === bucket.type
              ? 'bg-terminal-accent/10 border-terminal-accent/50 ring-1 ring-terminal-accent/20'
              : 'bg-terminal-surface border-terminal-border hover:border-terminal-accent/40 hover:bg-terminal-surface-light/30'"
            @click="categoryDetail?.type === bucket.type ? closeCategoryDetail() : openCategoryDetail(bucket)"
          >
            <div class="flex items-center justify-between">
              <span class="text-2xl">{{ bucket.emoji }}</span>
              <span class="text-[10px] font-mono font-bold text-gray-400 px-2 py-0.5 rounded bg-terminal-bg/80 border border-white/10">
                {{ bucket.expenses.length }} {{ bucket.expenses.length === 1 ? 'bon' : 'bonuri' }}
              </span>
            </div>
            <div>
              <div class="text-xs font-mono font-bold uppercase text-gray-300 tracking-wider">{{ bucket.label }}</div>
              <div class="text-xl font-mono font-black text-gray-100 tracking-tight mt-0.5 sw-private">
                {{ formatNumber(bucket.total) }}
                <span class="text-[10px] font-normal text-gray-500">{{ displayCurrency }}</span>
              </div>
            </div>
            <div class="text-[10px] font-mono font-bold uppercase tracking-wider" :class="categoryDetail?.type === bucket.type ? 'text-terminal-accent' : 'text-gray-600'">
              {{ categoryDetail?.type === bucket.type ? t('finances.hideDetails') : t('finances.showDetails') }}
            </div>
          </button>
        </div>

        <!-- Expandable expense panel -->
        <Transition name="fade">
          <div v-if="categoryDetail" class="bg-terminal-surface border border-terminal-accent/30 rounded-2xl overflow-hidden shadow-xl">
            <!-- Panel header -->
            <div class="flex items-center justify-between px-5 py-3.5 border-b border-terminal-border bg-terminal-bg/40">
              <div class="flex items-center gap-3">
                <span class="text-xl">{{ categoryDetail.emoji }}</span>
                <div>
                  <div class="text-sm font-mono font-bold text-gray-100 uppercase tracking-wider">{{ categoryDetail.label }}</div>
                  <div class="text-[10px] font-mono text-gray-500">{{ categoryDetail.expenses.length }} bonuri · {{ financesStore.selectedMonth }}</div>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-base font-mono font-black text-terminal-accent sw-private">{{ formatNumber(categoryDetail.total) }} {{ displayCurrency }}</span>
                <button type="button" class="text-gray-500 hover:text-gray-200 p-1.5 rounded hover:bg-terminal-surface transition-colors flex items-center" @click="closeCategoryDetail"><X :size="14" /></button>
              </div>
            </div>

            <!-- Expense rows in panel -->
            <div class="divide-y divide-terminal-border/40 max-h-[460px] overflow-y-auto">
              <div v-for="exp in categoryDetail.expenses" :key="exp.id">
                <button type="button" class="w-full flex items-center gap-3 px-5 py-3 hover:bg-terminal-bg/50 transition-colors text-left group" @click="toggleExpense(exp.id)">
                  <span class="text-[10px] font-mono text-gray-600 transition-transform inline-block flex-shrink-0" :class="{ 'rotate-90': expandedExpenseId === exp.id }">▶</span>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-mono font-bold text-gray-100 truncate">{{ exp.name }}</div>
                    <div class="text-[10px] font-mono text-gray-500 mt-0.5">
                      {{ formatShortDate(exp.createdAt) }}
                      <span v-if="exp.lineItems?.length" class="ml-2 text-terminal-accent/70">· {{ exp.lineItems.length }} articole</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 flex-shrink-0">
                    <span class="text-sm font-mono font-bold text-gray-100 sw-private">{{ fmt(exp.amount, exp.currency) }} <span class="text-[10px] font-normal text-gray-500">{{ displayCurrency }}</span></span>
                    <button type="button" class="sm:opacity-0 sm:group-hover:opacity-100 text-terminal-accent hover:text-terminal-accent/70 p-1.5 rounded transition-all touch-manipulation flex items-center" @click.stop="financesStore.openEditExpenseModal(exp)"><Pencil :size="13" /></button>
                    <button type="button" class="sm:opacity-0 sm:group-hover:opacity-100 text-gray-600 hover:text-red-400 p-1.5 rounded transition-all touch-manipulation flex items-center" @click.stop="openDeleteConfirm(exp)"><X :size="13" /></button>
                  </div>
                </button>

                <!-- Line items sub-panel -->
                <div v-if="expandedExpenseId === exp.id" class="border-t border-terminal-border/40 bg-terminal-bg/30 px-5 py-3">
                  <div v-if="exp.lineItems && exp.lineItems.length > 0" class="rounded-xl overflow-hidden border border-terminal-border/40">
                    <table class="w-full text-left">
                      <thead>
                        <tr class="text-[10px] font-mono uppercase text-gray-500 bg-terminal-surface/60">
                          <th class="py-2 px-3">Articol</th>
                          <th class="py-2 px-2 text-right">Qty</th>
                          <th class="py-2 px-2 text-right">Preț/buc</th>
                          <th class="py-2 px-3 text-right">Sumă</th>
                        </tr>
                      </thead>
                      <tbody class="font-mono text-xs">
                        <tr v-for="(li, idx) in exp.lineItems" :key="idx" class="border-t border-terminal-border/30">
                          <td class="py-2 px-3 text-gray-300 font-sans">{{ li.name }}</td>
                          <td class="py-2 px-2 text-right text-gray-500">{{ li.qty }}</td>
                          <td class="py-2 px-2 text-right text-gray-500">{{ li.unitPrice }}</td>
                          <td class="py-2 px-3 text-right font-bold text-gray-200">{{ fmt(li.amount, exp.currency) }} {{ displayCurrency }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div v-else class="text-[11px] font-mono text-gray-600 italic">{{ t('finances.manualEntry') }}</div>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════════════════
         TAB: AVERE
    ════════════════════════════════════════════════════════════════════════════ -->
    <div v-if="data && activeTab === 'avere'" class="space-y-8">

      <!-- ── Alocări luna curentă ── -->
      <div class="space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="min-w-0">
            <h2 class="text-sm sm:text-base font-mono font-bold text-gray-100 uppercase tracking-wide flex items-center gap-2">
              <span class="text-emerald-400">🏦</span>
              <span class="hidden sm:inline">{{ t('finances.section3Title') }}</span>
              <span class="sm:hidden">Alocare capital</span>
            </h2>
            <p class="text-[11px] font-mono text-gray-500 mt-0.5">Luna {{ financesStore.selectedMonth }} · alocări per-lună</p>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <button
              v-if="availableBrokers.length > 0"
              type="button"
              @click="openCommissionForm"
              class="self-start sm:self-auto px-3.5 py-2 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 rounded-xl text-xs font-mono font-bold text-rose-400 uppercase transition-colors"
              title="Deduce comisioane generice din capitalul brokerului"
            >
              − Comisioane
            </button>
            <button type="button" @click="toggleAddingWealth()" class="self-start sm:self-auto px-3.5 py-2 bg-terminal-accent/10 border border-terminal-accent/30 hover:bg-terminal-accent/20 rounded-xl text-xs font-mono font-bold text-terminal-accent uppercase transition-colors">
              <span v-if="isAddingWealth" class="flex items-center gap-1"><X :size="13" /> {{ t('finances.close') }}</span>
              <span v-else>{{ t('finances.addWealthBtn') }}</span>
            </button>
          </div>
        </div>

        <!-- Snapshot suggestion -->
        <div
          v-if="data.wealthAllocations.length === 0 && snapshotPreview?.available"
          class="border border-dashed border-gray-600/50 rounded-2xl p-4"
        >
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <span class="text-2xl opacity-50">📸</span>
              <div>
                <div class="text-sm font-mono font-bold text-gray-400">{{ snapshotPreview.priorMonth }} · {{ snapshotPreview.count }} alocări · {{ snapshotPreview.total }} RON</div>
                <div class="text-[10px] font-mono text-gray-600">{{ t('finances.snapshotSuggestion', { month: financesStore.selectedMonth }) }}</div>
              </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <button type="button" @click="handleApplySnapshot" :disabled="applySnapshotMutation.isPending.value"
                class="px-3 py-1.5 rounded-xl bg-terminal-surface border border-gray-600/60 hover:border-terminal-accent/60 hover:text-terminal-accent text-gray-300 text-xs font-mono font-bold uppercase transition-colors">
                {{ applySnapshotMutation.isPending.value ? t('finances.applyingSnapshot') : t('finances.applySnapshot') }}
              </button>
              <button type="button" @click="toggleAddingWealth()" class="px-3 py-1.5 text-gray-500 text-xs font-mono hover:text-gray-300 transition-colors">{{ t('finances.addManually') }}</button>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-if="data.wealthAllocations.length === 0 && !snapshotPreview?.available" class="py-10 text-center text-xs font-mono text-gray-500 bg-terminal-surface border border-terminal-border rounded-2xl">
          {{ t('finances.noAllocationsForMonth', { month: financesStore.selectedMonth }) }}
        </div>

        <!-- Allocation cards -->
        <div v-if="data.wealthAllocations.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="alloc in data.wealthAllocations"
            :key="alloc.id"
            class="bg-terminal-surface border border-terminal-border hover:border-terminal-accent/40 rounded-2xl p-4 space-y-3 group transition-colors"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="w-8 h-8 rounded-xl bg-terminal-bg border border-white/10 flex items-center justify-center text-base flex-shrink-0">
                  {{ alloc.institutionType === 'BANK' ? '🏦' : '📈' }}
                </span>
                <div class="min-w-0">
                  <div class="text-sm font-mono font-bold text-gray-100 truncate">{{ alloc.institution }}</div>
                  <div class="text-[10px] font-mono text-gray-500 uppercase">{{ t('enums.' + alloc.type, alloc.type) }}</div>
                </div>
              </div>
              <div class="flex items-center gap-1 flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button type="button" @click="startEditWealth(alloc)" class="p-1.5 rounded text-terminal-accent border border-terminal-accent/30 hover:bg-terminal-accent/10 transition-colors flex items-center touch-manipulation"><Pencil :size="12" /></button>
                <button type="button" @click="handleDeleteWealth(alloc.id)" class="p-1.5 rounded text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors flex items-center touch-manipulation"><X :size="12" /></button>
              </div>
            </div>

            <div class="border-t border-white/10 pt-3 flex items-end justify-between gap-2">
              <div class="min-w-0">
                <div class="text-xs font-mono text-gray-300 truncate">{{ alloc.name }}</div>
                <span v-if="alloc.interestRatePct" class="text-[10px] font-mono text-emerald-400 font-bold">{{ alloc.interestRatePct }}% {{ t('finances.interestRate') }}</span>
              </div>
              <div class="text-right flex-shrink-0">
                <div class="text-base font-mono font-black text-gray-100 sw-private">{{ fmt(alloc.amount, alloc.currency) }} <span class="text-xs font-normal text-gray-500">{{ displayCurrency }}</span></div>
                <div v-if="alloc.currency !== displayCurrency" class="text-[10px] font-mono text-gray-600 sw-private">{{ formatNumber(alloc.amount) }} {{ alloc.currency }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Patrimoniu Real ── -->
      <div class="space-y-4">
        <div class="flex items-center gap-2">
          <span class="text-lg">💎</span>
          <h2 class="text-sm font-mono font-bold text-gray-100 uppercase tracking-wide">{{ t('finances.wealthRealTitle') }}</h2>
          <span v-if="isPatrimoniuPreviewMode" class="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-gray-700/40 text-gray-400 border border-gray-600/40">preview {{ snapshotPreview?.priorMonth }}</span>
        </div>

        <div class="bg-terminal-bg border border-terminal-border rounded-2xl overflow-hidden" :class="isPatrimoniuPreviewMode ? 'opacity-60' : ''">
          <!-- Total bar: real deposited + (± portfolio unrealized P&L) -->
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 sm:px-5 py-3.5 border-b border-terminal-border bg-terminal-surface/50 gap-1">
            <span class="text-[11px] sm:text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">{{ t('finances.totalPatrimoniu') }}</span>
            <div class="flex flex-col items-end gap-0.5">
              <div class="flex items-baseline gap-2 flex-wrap justify-end">
                <span class="text-2xl sm:text-3xl font-mono font-black sw-private leading-none" :class="isPatrimoniuPreviewMode ? 'text-gray-500' : 'text-terminal-up'">
                  {{ formatNumber(totalPatrimoniu) }}
                  <span class="text-sm font-bold text-gray-400">{{ displayCurrency }}</span>
                </span>
                <span v-if="todayPnlTotal !== 0 && !isPatrimoniuPreviewMode" class="text-sm font-mono font-bold sw-private"
                  :class="todayPnlTotal >= 0 ? 'text-terminal-up' : 'text-terminal-down'">
                  ({{ todayPnlTotal >= 0 ? '+' : '−' }}{{ formatNumber(Math.abs(todayPnlTotal)) }} {{ displayCurrency }})
                </span>
              </div>
              <div v-if="todayPnlTotal !== 0 && !isPatrimoniuPreviewMode"
                class="text-[10px] font-mono sw-private text-gray-500">
                capital alocat · {{ formatNumber(totalDeposits) }} {{ displayCurrency }}
              </div>
            </div>
          </div>

          <!-- Preview notice -->
          <div v-if="isPatrimoniuPreviewMode" class="px-5 py-3 border-b border-terminal-border bg-terminal-bg/60 flex items-center justify-between gap-3">
            <span class="text-[11px] font-mono text-gray-500">{{ t('finances.previewNotice', { priorMonth: snapshotPreview?.priorMonth, month: financesStore.selectedMonth }) }}</span>
            <button type="button" @click="handleApplySnapshot" :disabled="applySnapshotMutation.isPending.value"
              class="flex-shrink-0 px-3 py-1.5 rounded-lg bg-terminal-surface border border-gray-600/60 hover:border-terminal-accent/60 hover:text-terminal-accent text-gray-300 text-[11px] font-mono font-bold uppercase transition-colors">
              <span v-if="applySnapshotMutation.isPending.value">Copiez…</span>
              <span v-else class="flex items-center gap-1"><Check :size="12" /> Preia snapshot</span>
            </button>
          </div>

          <div class="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
            <!-- Depozite & Alocări -->
            <div class="space-y-3">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-base">🏦</span>
                <span class="text-xs sm:text-[13px] font-mono font-bold uppercase tracking-wider" :class="isPatrimoniuPreviewMode ? 'text-gray-500' : 'text-emerald-400'">{{ t('finances.depositsAndAllocations') }}</span>
                <span class="ml-auto text-base font-mono font-black sw-private" :class="isPatrimoniuPreviewMode ? 'text-gray-500' : 'text-emerald-400'">
                  {{ formatNumber(totalDeposits) }} <span class="text-[11px] font-bold text-gray-400">{{ displayCurrency }}</span>
                </span>
              </div>

              <div class="space-y-3">
                <div
                  v-for="group in institutionGroups"
                  :key="group.key"
                  class="p-4 rounded-2xl font-mono space-y-3 shadow-sm"
                  :class="group.institutionType === 'BROKER' ? 'bg-blue-950/25 border border-blue-500/40' : 'bg-emerald-950/25 border border-emerald-500/40'"
                >
                  <!-- Institution header -->
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-2 min-w-0 flex-1">
                      <span class="text-[11px] px-2 py-0.5 rounded font-bold uppercase tracking-wider flex-shrink-0"
                        :class="group.institutionType === 'BROKER' ? 'bg-blue-500/25 text-blue-300 border border-blue-400/50' : 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/50'">
                        {{ group.institutionType }}
                      </span>
                      <div class="min-w-0 flex flex-col">
                        <span class="font-bold text-white text-base leading-tight truncate">{{ group.institution }}</span>
                        <span v-if="group.accountName" class="text-[11px] text-gray-300 leading-tight truncate">{{ group.accountName }}</span>
                      </div>
                    </div>
                    <span v-if="group.interestRatePct" class="text-xs font-bold flex-shrink-0"
                      :class="group.institutionType === 'BROKER' ? 'text-blue-300' : 'text-emerald-300'">{{ group.interestRatePct }}%</span>
                  </div>

                  <!-- Type label + total deposited (right-aligned, large) -->
                  <div class="flex items-end justify-between pt-2 border-t gap-3"
                    :class="group.institutionType === 'BROKER' ? 'border-blue-400/25' : 'border-emerald-400/25'">
                    <div class="space-y-1 min-w-0">
                      <span class="text-[10px] text-gray-300 uppercase font-bold tracking-wider block">{{ t('enums.' + group.type, group.type) }}</span>
                      <span v-if="group.monthDelta > 0" class="text-[11px] font-bold flex items-center gap-1"
                        :class="group.institutionType === 'BROKER' ? 'text-blue-300' : 'text-emerald-300'">
                        + {{ formatNumber(group.monthDelta) }} {{ group.currency }} luna asta
                      </span>
                    </div>
                    <div class="flex flex-col items-end min-w-0">
                      <span class="font-black text-xl sm:text-2xl sw-private leading-none"
                        :class="group.institutionType === 'BROKER' ? 'text-blue-200' : 'text-emerald-200'">
                        {{ formatNumber(group.totalAmount) }}
                        <span class="text-[11px] font-bold text-gray-200 align-baseline">{{ group.currency }}</span>
                      </span>
                      <span v-if="group.currency !== displayCurrency" class="mt-1 text-[10px] font-mono text-gray-400 sw-private">
                        ≈ {{ formatNumber(convertToDisplay(group.totalAmount, group.currency)) }} {{ displayCurrency }}
                      </span>
                    </div>
                  </div>

                  <!-- Broker P&L footer: shows only when positions exist for this (broker, currency) -->
                  <div v-if="group.institutionType === 'BROKER' && group.hasPositions"
                    class="pt-2 border-t border-blue-400/25 flex items-center justify-between gap-2 text-xs">
                    <span class="text-gray-300 uppercase font-bold tracking-wider text-[10px]">P&amp;L pozitii (aprox.)</span>
                    <span class="font-black text-sm sw-private"
                      :class="group.positionsPnl >= 0 ? 'text-emerald-300' : 'text-rose-300'">
                      {{ group.positionsPnl >= 0 ? '+' : '−' }}{{ formatNumber(Math.abs(group.positionsPnl)) }} {{ group.currency }}
                    </span>
                  </div>
                </div>
                <div v-if="institutionGroups.length === 0" class="text-xs font-mono text-gray-400 italic px-2 py-4 text-center">
                  {{ t('finances.noAllocationsAdded') }}
                </div>
              </div>
            </div>

            <!-- Portofoliu Acțiuni -->
            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <span class="text-sm">📈</span>
                <span class="text-[11px] font-mono font-bold uppercase tracking-wider text-purple-400">{{ t('finances.stockPortfolio') }}</span>
                <span class="text-[9px] font-mono text-gray-600 uppercase">la {{ financesStore.selectedMonth }}</span>
                <span class="ml-auto text-sm font-mono font-bold text-purple-400 sw-private">{{ formatNumber(totalPortfolioValue) }} <span class="text-xs font-normal text-gray-500">{{ displayCurrency }}</span></span>
              </div>

              <div v-if="holdingsAsOfMonth.length > 0" class="space-y-1.5">
                <div
                  v-for="h in holdingsAsOfMonth.slice(0, 10)"
                  :key="h.symbol"
                  class="flex items-center justify-between px-3 py-2 bg-purple-950/10 border border-purple-500/15 rounded-xl text-xs font-mono"
                >
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="font-bold text-gray-200 w-16 truncate">{{ h.symbol }}</span>
                    <span class="text-gray-600 hidden sm:inline">{{ Math.trunc(parseFloat(String(h.shares)) || 0) }} buc</span>
                  </div>
                  <span class="font-bold text-purple-300 flex-shrink-0 sw-private">
                    {{ fmt(h.marketValue, h.currency) }} {{ displayCurrency }}
                    <span v-if="h.currency !== displayCurrency" class="text-[10px] font-normal text-gray-500">({{ formatNumber(h.marketValue) }} {{ h.currency }})</span>
                  </span>
                </div>
                <div v-if="holdingsAsOfMonth.length > 10" class="text-[10px] font-mono text-gray-600 text-center pt-1">
                  + {{ holdingsAsOfMonth.length - 10 }} mai mult — vezi în Portofoliu
                </div>
              </div>
              <div v-else class="text-[11px] font-mono text-gray-600 italic px-2 py-3 text-center">
                {{ t('finances.noOpenPositions', { month: financesStore.selectedMonth }) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════════════════
         TAB: SIMULARE
    ════════════════════════════════════════════════════════════════════════════ -->
    <div v-if="activeTab === 'simulare'">
      <SimulateFutureSection />
    </div>

    <!-- ─── WEALTH ADD MODAL ──────────────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="isAddingWealth" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" @click.self="isAddingWealth = false">
        <div class="w-full max-w-xl bg-terminal-surface border border-terminal-accent/40 rounded-3xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <div class="text-sm font-mono font-bold text-terminal-accent uppercase tracking-wide">{{ t('finances.addWealthBtn') }} · {{ financesStore.selectedMonth }}</div>
              <div class="text-[11px] font-mono text-gray-500 mt-0.5">{{ t('finances.wealthModalSubtitle') }}</div>
            </div>
            <button type="button" @click="isAddingWealth = false" class="text-gray-500 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center"><X :size="16" /></button>
          </div>

          <FormField label="CONT / PORTOFOLIU">
            <select v-model="wealthAccountKey" @change="onWealthAccountKeyChange" class="w-full bg-terminal-bg border border-terminal-border rounded-xl px-3 py-2 text-xs font-mono text-gray-200">
              <option value="__new__" class="font-bold text-terminal-accent">{{ t('finances.createNewAccount') }}</option>
              <optgroup v-if="groupedExistingAccounts.BANK.length > 0" label="🏦 Bănci & Depozite">
                <option v-for="acc in groupedExistingAccounts.BANK" :key="acc.key" :value="acc.key">{{ acc.institution }} · {{ acc.representativeName }} ({{ acc.currency }} · {{ t('enums.' + acc.type, acc.type) }})</option>
              </optgroup>
              <optgroup v-if="groupedExistingAccounts.BROKER.length > 0" label="💼 Brokeri & Investiții">
                <option v-for="acc in groupedExistingAccounts.BROKER" :key="acc.key" :value="acc.key">{{ acc.institution }} · {{ acc.representativeName }} ({{ acc.currency }} · {{ t('enums.' + acc.type, acc.type) }})</option>
              </optgroup>
            </select>
          </FormField>

          <div v-if="wealthAccountKey !== '__new__'" class="flex items-center justify-between p-3 rounded-xl bg-terminal-accent/10 border border-terminal-accent/30 text-xs font-mono">
            <div class="flex items-center gap-2">
              <span>{{ wealthInstType === 'BANK' ? '🏦' : '💼' }}</span>
              <span class="font-bold text-terminal-accent">{{ wealthInst }}</span>
              <span class="text-gray-400">·</span>
              <span class="text-gray-200">{{ wealthName }}</span>
            </div>
            <span class="px-2 py-0.5 rounded bg-terminal-bg border border-terminal-border text-[10px] text-gray-400 uppercase">{{ wealthCurrency }} · {{ t('enums.' + wealthType, wealthType) }}</span>
          </div>

          <div v-if="wealthAccountKey === '__new__'" class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-terminal-border/50">
            <FormField label="VALUTĂ">
              <select v-model="wealthCurrency" class="w-full bg-terminal-bg border border-terminal-border rounded-xl px-3 py-2 text-xs font-mono text-gray-200">
                <option v-for="c in availableCurrencies" :key="c" :value="c">{{ c }}</option>
              </select>
            </FormField>
            <FormField label="TIP">
              <select v-model="wealthInstType" @change="onWealthInstTypeChange" class="w-full bg-terminal-bg border border-terminal-border rounded-xl px-3 py-2 text-xs font-mono text-gray-200">
                <option value="BANK">{{ t('enums.BANK') }}</option>
                <option value="BROKER">{{ t('enums.BROKER') }}</option>
              </select>
            </FormField>
            <FormField label="INSTITUȚIE">
              <select v-model="wealthInst" class="w-full bg-terminal-bg border border-terminal-border rounded-xl px-3 py-2 text-xs font-mono text-gray-200">
                <option v-for="inst in availableInstitutions" :key="inst" :value="inst">{{ inst }}</option>
              </select>
            </FormField>
            <FormField label="DESTINAȚIE">
              <select v-model="wealthType" class="w-full bg-terminal-bg border border-terminal-border rounded-xl px-3 py-2 text-xs font-mono text-gray-200">
                <option value="BANK_DEPOSIT">{{ t('enums.BANK_DEPOSIT') }}</option>
                <option value="BROKER_CASH">{{ t('enums.BROKER_CASH') }}</option>
                <option value="DCA_TARGET">{{ t('enums.DCA_TARGET') }}</option>
              </select>
            </FormField>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <FormField :label="fxConvertEnabled ? `SUMĂ (${fxSourceCurrency})` : `SUMĂ (${wealthCurrency})`" required>
              <AppInput v-model="wealthAmount" type="number" step="0.01" placeholder="0.00" monospace />
              <div v-if="fxConvertedPreview" class="mt-1 text-[10px] font-mono text-blue-400">
                ≈ {{ formatNumber(fxConvertedPreview.amount) }} {{ fxConvertedPreview.currency }}
              </div>
            </FormField>
            <FormField label="DOBÂNDĂ %">
              <AppInput v-model="wealthInterest" type="number" step="0.01" placeholder="opțional" monospace />
            </FormField>
            <div class="col-span-2">
              <FormField :label="wealthAccountKey === '__new__' ? 'NUME CONT' : 'DESCRIERE'">
                <AppInput v-if="wealthAccountKey === '__new__'" v-model="wealthName" placeholder="ex: Cont Economii" monospace />
                <AppInput v-else v-model="wealthNotes" placeholder="ex: Alocare lunară" monospace />
              </FormField>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-3 pt-2 border-t border-terminal-border/30">
            <label class="flex items-center gap-2 cursor-pointer text-[11px] font-mono text-gray-300 select-none">
              <input type="checkbox" v-model="fxConvertEnabled" @change="fxSourceCurrency = displayCurrency" class="accent-blue-500" />
              <span>Conversie live valutară</span>
            </label>
            <div v-if="fxConvertEnabled" class="flex items-center gap-2">
              <span class="text-[10px] font-mono text-gray-500 uppercase">introdu în:</span>
              <select v-model="fxSourceCurrency" class="bg-terminal-bg border border-terminal-border rounded-lg px-2 py-1 text-[11px] font-mono text-gray-200">
                <option v-for="c in availableCurrencies" :key="c" :value="c">{{ c }}</option>
              </select>
              <span class="text-[10px] font-mono text-gray-500">→ {{ wealthCurrency }} la cursul zilei</span>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2 border-t border-terminal-border/50">
            <AppButton variant="secondary" @click="isAddingWealth = false">{{ t('finances.cancel') }}</AppButton>
            <AppButton variant="primary" @click="handleAddWealth">
              {{ wealthAccountKey === '__new__' ? '+ Creează & alocă' : '+ Adaugă' }}
            </AppButton>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ─── MODALS ─────────────────────────────────────────────────────────────── -->
    <ExpenseAddModal />
    <GeminiReceiptModal />
    <ExpenseDetailModal />

    <!-- Extra Income Modal -->
    <Teleport to="body">
      <div v-if="isAddingExtraIncome" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" @click.self="isAddingExtraIncome = false">
        <div class="bg-terminal-surface border border-amber-500/40 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
          <div class="flex items-center justify-between border-b border-terminal-border pb-3">
            <div>
              <h3 class="text-sm font-mono font-bold uppercase text-amber-400 tracking-wider">+ Venit ocazional · {{ financesStore.selectedMonth }}</h3>
              <p class="text-[10px] font-mono text-gray-500 mt-0.5">Cadouri, vânzări one-off, bonusuri, refund-uri</p>
            </div>
            <button type="button" class="text-gray-500 hover:text-gray-200 p-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center" @click="isAddingExtraIncome = false"><X :size="14" /></button>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="col-span-2">
              <FormField label="DESCRIERE" required>
                <AppInput v-model="extraIncomeName" placeholder="ex: Vânzare iPhone vechi" monospace />
              </FormField>
            </div>
            <FormField :label="`SUMĂ (${extraIncomeCurrency})`" required>
              <AppInput v-model="extraIncomeAmount" type="number" step="0.01" placeholder="0.00" monospace />
            </FormField>
            <FormField label="VALUTĂ">
              <select v-model="extraIncomeCurrency" class="w-full bg-terminal-bg border border-terminal-border rounded-xl px-3 py-2 text-xs font-mono text-gray-200">
                <option v-for="c in availableCurrencies" :key="c" :value="c">{{ c }}</option>
              </select>
            </FormField>
            <div class="col-span-2">
              <FormField label="NOTIȚE (opțional)">
                <AppInput v-model="extraIncomeNotes" placeholder="ex: Cash, primit pe 12 nov" monospace />
              </FormField>
            </div>
          </div>
          <div class="flex justify-end gap-2 pt-2 border-t border-terminal-border/50">
            <AppButton variant="secondary" @click="isAddingExtraIncome = false">{{ t('finances.cancel') }}</AppButton>
            <AppButton variant="primary" @click="handleAddExtraIncome">+ Adaugă venit</AppButton>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Generic Commissions Modal -->
    <Teleport to="body">
      <div v-if="isAddingCommission" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" @click.self="isAddingCommission = false">
        <div class="bg-terminal-surface border border-rose-500/40 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
          <div class="flex items-center justify-between border-b border-terminal-border pb-3">
            <div>
              <h3 class="text-sm font-mono font-bold uppercase text-rose-400 tracking-wider">− Comisioane Generice</h3>
              <p class="text-[10px] font-mono text-gray-500 mt-0.5">Deduce comisioane neinregistrate din capitalul brokerului</p>
            </div>
            <button type="button" class="text-gray-500 hover:text-gray-200 p-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center" @click="isAddingCommission = false"><X :size="14" /></button>
          </div>
          <div class="space-y-3">
            <FormField label="BROKER">
              <select v-model="commissionBroker" class="w-full bg-terminal-bg border border-terminal-border rounded-xl px-3 py-2 text-xs font-mono text-gray-200">
                <option v-for="b in availableBrokers" :key="b" :value="b">{{ b }}</option>
              </select>
            </FormField>
            <div class="grid grid-cols-2 gap-3">
              <FormField label="SUMĂ COMISIOANE">
                <AppInput v-model="commissionAmount" type="number" step="0.01" placeholder="0.00" monospace />
              </FormField>
              <FormField label="VALUTĂ">
                <select v-model="commissionCurrency" class="w-full bg-terminal-bg border border-terminal-border rounded-xl px-3 py-2 text-xs font-mono text-gray-200">
                  <option v-for="c in availableCurrencies" :key="c" :value="c">{{ c }}</option>
                </select>
              </FormField>
            </div>
          </div>
          <div class="flex justify-end gap-2 pt-2 border-t border-terminal-border/50">
            <AppButton variant="secondary" @click="isAddingCommission = false">{{ t('finances.cancel') }}</AppButton>
            <AppButton variant="primary" @click="handleAddCommission" class="!bg-rose-600 hover:!bg-rose-500 !border-rose-500">− Deduce comisioane</AppButton>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Wealth Edit Modal -->
    <Teleport to="body">
      <div v-if="editingWealth" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" @click.self="cancelEditWealth">
        <div class="bg-terminal-surface border border-terminal-accent/40 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
          <div class="flex items-center justify-between border-b border-terminal-border pb-3">
            <h3 class="text-sm font-mono font-bold uppercase text-terminal-accent tracking-wider flex items-center gap-2"><Pencil :size="14" /> {{ t('finances.editWealthTitle') }}</h3>
            <button type="button" class="text-gray-500 hover:text-gray-200 p-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center" @click="cancelEditWealth"><X :size="14" /></button>
          </div>
          <div class="text-[10px] font-mono text-gray-600 uppercase">{{ editingWealth.institutionType }} · {{ editingWealth.type }} · {{ editingWealth.month || financesStore.selectedMonth }}</div>
          <FormField label="INSTITUȚIE">
            <AppInput v-model="editInst" />
          </FormField>
          <FormField :label="t('finances.nameLabel')">
            <AppInput v-model="editName" />
          </FormField>
          <div class="grid grid-cols-2 gap-3">
            <FormField :label="t('finances.amountLabel')">
              <AppInput v-model="editAmount" type="number" step="0.01" monospace />
            </FormField>
            <FormField :label="t('finances.interestLabel')">
              <AppInput v-model="editInterest" type="number" step="0.01" monospace />
            </FormField>
          </div>
          <div class="flex justify-end gap-2 pt-2 border-t border-terminal-border">
            <AppButton variant="secondary" @click="cancelEditWealth">{{ t('finances.cancel') }}</AppButton>
            <AppButton variant="primary" @click="saveEditWealth">{{ t('finances.saveExpense') }}</AppButton>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── DELETE CONFIRM PANEL ─────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="deleteConfirm"
          class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          @click.self="cancelDelete"
        >
          <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enter-to-class="opacity-100 translate-y-0 sm:scale-100"
          >
            <div v-if="deleteConfirm" class="w-full sm:max-w-md bg-terminal-bg border border-red-500/30 rounded-3xl shadow-2xl overflow-hidden">

              <!-- Header -->
              <div class="flex items-center gap-3 px-6 py-4 border-b border-red-500/20 bg-red-500/5">
                <div class="w-8 h-8 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                  <Trash2 :size="15" class="text-red-400" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-mono font-bold text-gray-100">Șterge cheltuiala</div>
                  <div class="text-[11px] font-mono text-gray-400 truncate mt-0.5">{{ deleteConfirm.item.name }}</div>
                </div>
                <button type="button" @click="cancelDelete" class="text-gray-500 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center">
                  <X :size="14" />
                </button>
              </div>

              <!-- Body -->
              <div class="px-6 py-5 space-y-5">

                <!-- Simple confirmation for non-recurring -->
                <div v-if="!deleteConfirm.item.isRecurring" class="text-sm font-mono text-gray-300">
                  Ești sigur că vrei să ștergi <span class="text-gray-100 font-bold">{{ deleteConfirm.item.name }}</span>? Acțiunea nu poate fi anulată.
                </div>

                <!-- Scope selection for recurring -->
                <div v-else class="space-y-3">
                  <div class="text-sm font-mono text-gray-300">
                    <span class="text-gray-100 font-bold">{{ deleteConfirm.item.name }}</span> este o cheltuială recurentă. Alege ce să ștergi:
                  </div>
                  <div class="space-y-2">
                    <label
                      class="flex items-center gap-3 cursor-pointer p-3 rounded-xl border transition-colors"
                      :class="deleteScope === 'ONLY_THIS_MONTH' ? 'bg-red-500/10 border-red-500/40' : 'border-terminal-border hover:bg-white/5'"
                    >
                      <input type="radio" v-model="deleteScope" value="ONLY_THIS_MONTH" class="text-red-400 focus:ring-0 flex-shrink-0" />
                      <div>
                        <div class="text-xs font-mono font-bold text-gray-200">Doar luna curentă ({{ financesStore.selectedMonth }})</div>
                        <div class="text-[10px] font-mono text-gray-500 mt-0.5">Celelalte luni rămân neafectate</div>
                      </div>
                    </label>
                    <label
                      class="flex items-center gap-3 cursor-pointer p-3 rounded-xl border transition-colors"
                      :class="deleteScope === 'THIS_AND_FUTURE' ? 'bg-red-500/10 border-red-500/40' : 'border-terminal-border hover:bg-white/5'"
                    >
                      <input type="radio" v-model="deleteScope" value="THIS_AND_FUTURE" class="text-red-400 focus:ring-0 flex-shrink-0" />
                      <div>
                        <div class="text-xs font-mono font-bold text-gray-200">Luna curentă + lunile viitoare</div>
                        <div class="text-[10px] font-mono text-gray-500 mt-0.5">Lunile trecute rămân neafectate</div>
                      </div>
                    </label>
                    <label
                      class="flex items-center gap-3 cursor-pointer p-3 rounded-xl border transition-colors"
                      :class="deleteScope === 'ALL' ? 'bg-red-500/10 border-red-500/40' : 'border-terminal-border hover:bg-white/5'"
                    >
                      <input type="radio" v-model="deleteScope" value="ALL" class="text-red-400 focus:ring-0 flex-shrink-0" />
                      <div>
                        <div class="text-xs font-mono font-bold text-gray-200">Toate lunile</div>
                        <div class="text-[10px] font-mono text-gray-500 mt-0.5">Șterge complet cheltuiala recurentă</div>
                      </div>
                    </label>
                  </div>
                </div>

              </div>

              <!-- Footer -->
              <div class="flex items-center justify-end gap-2 px-6 py-4 border-t border-terminal-border bg-terminal-surface/50">
                <button
                  type="button"
                  @click="cancelDelete"
                  class="px-4 py-2 rounded-xl text-sm font-mono font-bold text-gray-300 bg-terminal-surface border border-terminal-border hover:border-white/30 transition-colors"
                >
                  Anulează
                </button>
                <button
                  type="button"
                  @click="confirmDelete"
                  :disabled="deleteExpenseMutation.isPending.value"
                  class="px-4 py-2 rounded-xl text-sm font-mono font-bold text-red-300 bg-red-500/10 border border-red-500/40 hover:bg-red-500/20 hover:border-red-500/60 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <span v-if="deleteExpenseMutation.isPending.value" class="inline-block w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  <Trash2 v-else :size="14" />
                  {{ deleteExpenseMutation.isPending.value ? 'Se șterge…' : 'Șterge' }}
                </button>
              </div>

            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>
