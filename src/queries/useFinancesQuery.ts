import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { unref, computed, type MaybeRef } from 'vue';
import { api } from '../shared/api/client';
import type {
  FinanceSettingsDto,
  ExpenseItemDto,
  ExpenseLineItemDto,
  WealthAllocationDto,
  MonthlyFinanceSummaryDto,
} from '../shared/api/types';
import { mockFinanceSettings, mockExpenses, mockWealthAllocations } from '../mocks/fixtures/finances';
import { mockHoldings } from '../mocks/fixtures/portfolio';

// Use MSW mocks when VITE_USE_MOCKS=true (or in dev without explicit flag)
const useMocks = import.meta.env.VITE_USE_MOCKS === 'true';

export interface HoldingAsOfDto {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  shares: string;
  avgCost: string;
  marketValue: string;
  broker: string;
}

export interface ExtraIncomeDto {
  id: string;
  month: string;
  name: string;
  amount: string;
  currency: string;
  notes?: string | null;
  createdAt: string;
}

export interface PortfolioPnlEntryDto {
  currency: string;
  pnlAmount: string;
}

export interface MonthlyFinancesResponse {
  summary: MonthlyFinanceSummaryDto;
  expenses: ExpenseItemDto[];
  wealthAllocations: WealthAllocationDto[];
  settings: FinanceSettingsDto;
  cumulativeWealth?: WealthAllocationDto[];
  holdingsAsOfMonth?: HoldingAsOfDto[];
  extraIncomes?: ExtraIncomeDto[];
  todayPortfolioPnl?: PortfolioPnlEntryDto[];
}

function getCurrentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function computeMockSummary(month: string): MonthlyFinanceSummaryDto {
  const netIncome = 24500.0;
  let totalLoansSubs = 0;
  let totalUtil = 0;
  let totalVar = 0;

  for (const exp of mockExpenses) {
    const val = parseFloat(exp.amount) || 0;
    if (exp.type === 'LOAN' || exp.type === 'SUBSCRIPTION') {
      totalLoansSubs += val;
    } else if (exp.type === 'UTILITY') {
      totalUtil += val;
    } else {
      totalVar += val;
    }
  }

  const totalExp = totalLoansSubs + totalUtil + totalVar;
  let totalAlloc = 0;
  for (const w of mockWealthAllocations) {
    totalAlloc += parseFloat(w.amount) || 0;
  }

  const freeCash = Math.max(0, netIncome - totalExp);
  const savingsRate =
    netIncome > 0 ? Math.min(100, Math.max(0, ((netIncome - totalExp) / netIncome) * 100)) : 0;

  return {
    month,
    netIncome: netIncome.toFixed(2),
    currency: 'RON',
    netIncomeInRon: null,
    exchangeRate: null,
    totalLoansAndSubs: totalLoansSubs.toFixed(2),
    totalUtilities: totalUtil.toFixed(2),
    totalVariableExpenses: totalVar.toFixed(2),
    totalExpenses: totalExp.toFixed(2),
    totalAllocatedWealth: totalAlloc.toFixed(2),
    freeCash: freeCash.toFixed(2),
    savingsRatePct: savingsRate.toFixed(1),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Finance Settings
// ─────────────────────────────────────────────────────────────────────────────

export function useFinanceSettingsQuery() {
  return useQuery({
    queryKey: ['finances', 'settings'],
    queryFn: (): Promise<FinanceSettingsDto> => api.get('/finances/settings'),
    initialData: useMocks ? mockFinanceSettings : undefined,
    staleTime: 30_000,
  });
}

export function useUpdateFinanceSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updated: FinanceSettingsDto): Promise<FinanceSettingsDto> =>
      api.put('/finances/settings', updated),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances'] });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Monthly Finances
// ─────────────────────────────────────────────────────────────────────────────

export function useFinancesQuery(monthRef: MaybeRef<string>) {
  return useQuery({
    queryKey: computed(() => ['finances', 'monthly', unref(monthRef) || getCurrentYearMonth()]),
    queryFn: async (): Promise<MonthlyFinancesResponse> => {
      const month = unref(monthRef) || getCurrentYearMonth();
      if (useMocks) {
        return {
          summary: computeMockSummary(month),
          expenses: mockExpenses,
          wealthAllocations: mockWealthAllocations,
          settings: mockFinanceSettings,
          holdingsAsOfMonth: mockHoldings.map((h): HoldingAsOfDto => ({
            symbol: h.ticker.symbol,
            name: h.ticker.name,
            exchange: h.ticker.exchange ?? '',
            currency: h.currency,
            shares: h.shares,
            avgCost: h.avgCost,
            marketValue: h.marketValue,
            broker: h.broker,
          })),
        };
      }
      return api.get('/finances/monthly', { params: { month } });
    },
    staleTime: 5_000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Expense CRUD
// ─────────────────────────────────────────────────────────────────────────────

export interface PaymentSourceEntry {
  institution?: string;
  institutionType?: 'BANK' | 'BROKER';
  currency?: string;
  type?: 'BANK_DEPOSIT' | 'BROKER_CASH' | 'DCA_TARGET';
  positionSymbol?: string;
  amount: string;
}

export interface AddExpensePayload {
  name: string;
  category: string;
  type: ExpenseItemDto['type'];
  amount: string;
  currency: string;
  status: ExpenseItemDto['status'];
  month?: string;
  isRecurring?: boolean;
  dueDate?: string;
  interestRatePct?: string;
  lineItems?: ExpenseLineItemDto[] | null;
  paymentSources?: PaymentSourceEntry[];
  recurringEditScope?: 'ALL' | 'ONLY_THIS_MONTH' | 'THIS_AND_FUTURE';
}

export function useExpenseByIdQuery(idRef: MaybeRef<string | null>) {
  return useQuery({
    queryKey: computed(() => ['finances', 'expense', unref(idRef)]),
    queryFn: async (): Promise<ExpenseItemDto> => {
      const id = unref(idRef);
      if (useMocks) {
        await new Promise((r) => setTimeout(r, 200));
        const fallback: ExpenseItemDto = {
          id: '',
          name: 'Unknown',
          category: 'OTHER',
          type: 'OTHER',
          amount: '0.00',
          currency: 'RON',
          status: 'PAID',
          createdAt: new Date().toISOString(),
        };
        const found = mockExpenses.find((e) => e.id === id) || mockExpenses[0] || fallback;
        const isReceipt = found.type === 'FOOD' || found.type === 'VARIABLE';
        const result: ExpenseItemDto = {
          ...found,
          lineItems: isReceipt
            ? [
                { name: 'Lapte 1.5L', qty: 2, unitPrice: '9.50', amount: '19.00' },
                { name: 'Pâine feliată', qty: 1, unitPrice: '6.40', amount: '6.40' },
                { name: 'Cașcaval felii', qty: 1, unitPrice: '18.50', amount: '18.50' },
                { name: 'Cafea boabe 1kg', qty: 1, unitPrice: '143.53', amount: '143.53' },
              ]
            : null,
        };
        return result;
      }
      return api.get(`/finances/expenses/${encodeURIComponent(unref(idRef) || '')}`);
    },
    enabled: () => Boolean(unref(idRef)),
    staleTime: 10_000,
  });
}

export function useAddExpenseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (expense: AddExpensePayload): Promise<ExpenseItemDto> =>
      api.post('/finances/expenses', expense),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances'] });
    },
  });
}

export function useUpdateExpenseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AddExpensePayload }): Promise<ExpenseItemDto> =>
      api.put(`/finances/expenses/${encodeURIComponent(id)}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances'] });
    },
  });
}

export function useUpdateExpenseStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      month,
    }: {
      id: string;
      status: 'PAID' | 'DUE' | 'PENDING';
      month?: string;
    }): Promise<ExpenseItemDto> =>
      api.put(`/finances/expenses/${encodeURIComponent(id)}/status`, { status, month }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances'] });
    },
  });
}

export function useDeleteExpenseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, scope, month }: { id: string; scope?: string; month?: string }): Promise<void> => {
      const params = new URLSearchParams();
      if (scope) params.set('scope', scope);
      if (month) params.set('month', month);
      const qs = params.toString();
      return api.delete(`/finances/expenses/${encodeURIComponent(id)}${qs ? '?' + qs : ''}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances'] });
    },
  });
}

export interface ExpenseExportPayload {
  format: 'pdf' | 'xlsx';
  month?: string;
  startDate?: string;
  endDate?: string;
}

export function useExportExpensesMutation() {
  return useMutation({
    mutationFn: (payload: ExpenseExportPayload) => api.postBlob('/finances/expenses/export', payload),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Wealth Allocations
// ─────────────────────────────────────────────────────────────────────────────

export function useAddWealthAllocationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (alloc: Partial<WealthAllocationDto>): Promise<WealthAllocationDto> =>
      api.post('/finances/wealth-allocations', alloc),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances'] });
    },
  });
}

export function useUpdateWealthAllocationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<WealthAllocationDto> }): Promise<WealthAllocationDto> =>
      api.put(`/finances/wealth-allocations/${encodeURIComponent(id)}`, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances'] });
    },
  });
}

interface WealthSnapshotPreview {
  available: boolean;
  priorMonth?: string;
  count: number;
  total: string;
}

export function useWealthSnapshotPreviewQuery(month: MaybeRef<string>) {
  return useQuery({
    queryKey: computed(() => ['finances', 'wealthSnapshotPreview', unref(month) || getCurrentYearMonth()]),
    queryFn: (): Promise<WealthSnapshotPreview> =>
      api.get(`/finances/wealth-allocations/snapshot-preview?month=${encodeURIComponent(unref(month) || '')}`),
    staleTime: 5_000,
  });
}

export function useApplyWealthSnapshotMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (month: string): Promise<{ inserted: number }> =>
      api.post('/finances/wealth-allocations/snapshot', { month }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances'] });
    },
  });
}

export function useDeleteWealthAllocationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string): Promise<void> =>
      api.delete(`/finances/wealth-allocations/${encodeURIComponent(id)}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances'] });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Receipt Scan (AI Vision — multipart POST)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sends a receipt image to the backend for AI analysis.
 * Returns a PROPOSED, UNSAVED ExpenseItemDto (id: "", status: PENDING).
 * The caller must display a confirmation UI before calling useConfirmScannedExpenseMutation.
 */
export function useScanReceiptMutation() {
  return useMutation({
    mutationFn: async (imageFile: File): Promise<ExpenseItemDto> => {
      if (useMocks) {
        await new Promise((r) => setTimeout(r, 1200));
        return {
          id: '',
          name: 'Mega Image — supermarket',
          category: 'FOOD',
          type: 'FOOD',
          amount: '187.43',
          currency: 'RON',
          status: 'PENDING',
          month: getCurrentYearMonth(),
          isRecurring: false,
          createdAt: new Date().toISOString(),
          lineItems: [
            { name: 'Lapte 1.5L', qty: 2, unitPrice: '9.50', amount: '19.00' },
            { name: 'Pâine feliată', qty: 1, unitPrice: '6.40', amount: '6.40' },
            { name: 'Cașcaval felii', qty: 1, unitPrice: '18.50', amount: '18.50' },
            { name: 'Cafea boabe 1kg', qty: 1, unitPrice: '143.53', amount: '143.53' },
          ],
        };
      }

      const formData = new FormData();
      formData.append('image', imageFile);
      return api.postForm<ExpenseItemDto>('/finances/receipt-scan', formData);
    },
  });
}

/**
 * Persists a confirmed scanned expense.
 * Called after user reviews and approves the AI-proposed expense.
 */
export function useConfirmScannedExpenseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (expense: AddExpensePayload): Promise<ExpenseItemDto> =>
      api.post('/finances/expenses', expense),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances'] });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Extra Income (one-off / occasional income)
// ─────────────────────────────────────────────────────────────────────────────

export interface AddExtraIncomePayload {
  name: string;
  amount: string;
  currency: string;
  month?: string;
  notes?: string;
}

export function useAddExtraIncomeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddExtraIncomePayload): Promise<ExtraIncomeDto> =>
      api.post('/finances/extra-incomes', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances'] });
    },
  });
}

export function useDeleteExtraIncomeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string): Promise<void> =>
      api.delete(`/finances/extra-incomes/${encodeURIComponent(id)}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances'] });
    },
  });
}
