import { http, HttpResponse } from 'msw';
import {
  mockTickerSummaries,
  getMockTickerDetail,
  getMockDividendProjection,
  mockDividends
} from './fixtures/tickers';
import { mockPortfolio, mockTransactions, mockWatchlist, mockHoldings } from './fixtures/portfolio';
import { mockBrokers, getMockBrokerFeeEstimate } from './fixtures/brokers';
import {
  mockSettings,
  mockDividendTaxRates,
  mockNotifications,
  mockScreenerPresets
} from './fixtures/settings';
import {
  mockFinanceSettings,
  mockExpenses,
  mockWealthAllocations
} from './fixtures/finances';
import type {
  UserDto,
  SettingsDto,
  WatchlistRow,
  ScreenerResultRow,
  ExpenseItemDto,
  WealthAllocationDto,
  FinanceSettingsDto,
  MonthlyFinanceSummaryDto,
  FinanceCategoryType,
  SimulationResult,
  SimulationConfig,
  SavedSimulation,
  TickerVerdictDto,
  AlgoMetadataDto
} from '../shared/api/types';

const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '');

let inMemorySettings = { ...mockSettings };
let inMemoryWatchlist = [...mockWatchlist];
let inMemoryTransactions = [...mockTransactions];
let inMemoryNotifications = [...mockNotifications];

let inMemoryFinanceSettings: FinanceSettingsDto = { ...mockFinanceSettings };
let inMemoryExpenses: ExpenseItemDto[] = [...mockExpenses];
let inMemoryWealthAllocations: WealthAllocationDto[] = [...mockWealthAllocations];

function computeFinanceSummary(month: string): MonthlyFinanceSummaryDto {
  const netIncome = parseFloat(inMemoryFinanceSettings.monthlyIncome.amount) || 24500;
  let totalLoansSubs = 0;
  let totalUtil = 0;
  let totalVar = 0;

  for (const exp of inMemoryExpenses) {
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
  for (const w of inMemoryWealthAllocations) {
    totalAlloc += parseFloat(w.amount) || 0;
  }

  const freeCash = Math.max(0, netIncome - totalExp);
  const savingsRate = netIncome > 0 ? Math.min(100, Math.max(0, ((netIncome - totalExp) / netIncome) * 100)) : 0;

  return {
    month,
    netIncome: netIncome.toFixed(2),
    currency: inMemoryFinanceSettings.monthlyIncome.currency,
    netIncomeInRon: null,
    exchangeRate: null,
    totalLoansAndSubs: totalLoansSubs.toFixed(2),
    totalUtilities: totalUtil.toFixed(2),
    totalVariableExpenses: totalVar.toFixed(2),
    totalExpenses: totalExp.toFixed(2),
    totalAllocatedWealth: totalAlloc.toFixed(2),
    freeCash: freeCash.toFixed(2),
    savingsRatePct: savingsRate.toFixed(1)
  };
}

export const handlers = [
  // Auth
  http.post(`${baseUrl}/auth/session`, async () => {
    const user: UserDto = {
      id: 'usr-1',
      email: 'alex.sidwell@example.com',
      displayName: 'Alex Sidwell'
    };
    return HttpResponse.json({
      token: 'mock-jwt-session-token-123456',
      user
    });
  }),

  http.post(`${baseUrl}/auth/logout`, async () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${baseUrl}/auth/passkey/register/options`, async () => {
    return HttpResponse.json({
      challenge: 'bW9jay1jaGFsbGVuZ2U',
      rp: { name: 'Sidwell', id: 'localhost' },
      user: { id: 'dXNyLWRldi0xMDE', name: 'alex.sidwell@example.com', displayName: 'Alex Sidwell (Dev)' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
      timeout: 60000,
      attestation: 'none',
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'preferred', residentKey: 'preferred', requireResidentKey: false },
    });
  }),

  http.post(`${baseUrl}/auth/passkey/register`, async () => {
    return HttpResponse.json({ ok: true });
  }),

  http.get(`${baseUrl}/auth/passkey/login/options`, async () => {
    return HttpResponse.json({
      challenge: 'bW9jay1sb2dpbi1jaGFsbGVuZ2U',
      timeout: 60000,
      rpId: 'localhost',
      userVerification: 'preferred',
    });
  }),

  http.post(`${baseUrl}/auth/passkey/login`, async () => {
    return HttpResponse.json({
      token: 'mock-jwt-token-passkey',
      user: { id: 'usr-dev-101', email: 'alex.sidwell@example.com', displayName: 'Alex Sidwell (Dev)' },
    });
  }),

  // Tickers & research
  http.get(`${baseUrl}/tickers/search`, ({ request }) => {
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const results = mockTickerSummaries.filter(
      (t) => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)
    );
    return HttpResponse.json(results);
  }),

  http.get(`${baseUrl}/tickers/:symbol`, ({ params }) => {
    const symbol = String(params.symbol);
    const detail = getMockTickerDetail(symbol);
    return HttpResponse.json(detail);
  }),

  http.put(`${baseUrl}/tickers/:symbol/note`, async () => {
    return HttpResponse.json({ ok: true });
  }),

  http.get(`${baseUrl}/tickers/:symbol/dividends`, ({ params }) => {
    const symbol = String(params.symbol);
    const div = mockDividends[symbol] || {
      dividendYield: null,
      forwardDividend: null,
      exDividendDate: null,
      payFrequency: null,
      historicalGrowthCagr: null,
      status: 'PENDING'
    };
    return HttpResponse.json(div);
  }),

  http.post(`${baseUrl}/tickers/:symbol/dividends/projection`, async ({ params, request }) => {
    const symbol = String(params.symbol);
    const body = (await request.json().catch(() => ({}))) as { endYear?: number; reinvest?: boolean };
    const proj = getMockDividendProjection(symbol, body.endYear || 2060, body.reinvest ?? true);
    return HttpResponse.json(proj);
  }),

  http.get(`${baseUrl}/tickers/:symbol/transactions`, ({ params }) => {
    const symbol = String(params.symbol);
    const list = inMemoryTransactions.filter((t) => t.symbol === symbol);
    return HttpResponse.json(list);
  }),

  // Portfolio
  http.get(`${baseUrl}/portfolio`, () => {
    return HttpResponse.json(mockPortfolio);
  }),

  http.post(`${baseUrl}/transactions`, async ({ request }) => {
    const input = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const symbol = String(input.symbol || 'TLV.RO');
    const newTx = {
      id: `tx-${Date.now()}`,
      symbol,
      side: (input.side as 'BUY' | 'SELL') || 'BUY',
      shares: String(input.shares || '10.000000'),
      price: String(input.price || '25.000000'),
      priceAuto: Boolean(input.priceAuto),
      fee: String(input.fee || '10.00'),
      executedAt: String(input.executedAt || new Date().toISOString().split('T')[0]),
      fxRateAtExecution: String(input.fxRateAtExecution || '1.000000'),
      createdAt: new Date().toISOString(),
      broker: String(input.broker || 'TradeVille')
    };
    inMemoryTransactions.push(newTx);

    const h = mockHoldings.find((h) => h.ticker.symbol === symbol) || mockHoldings[0]!;
    return HttpResponse.json(h);
  }),

  http.put(`${baseUrl}/transactions/:id`, () => {
    return HttpResponse.json(mockHoldings[0]);
  }),

  http.delete(`${baseUrl}/transactions/:id`, ({ params }) => {
    const id = String(params.id);
    inMemoryTransactions = inMemoryTransactions.filter((t) => t.id !== id);
    return HttpResponse.json(mockHoldings[0]);
  }),

  // Watchlist
  http.get(`${baseUrl}/watchlist`, () => {
    return HttpResponse.json(inMemoryWatchlist);
  }),

  http.post(`${baseUrl}/watchlist`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { symbol?: string };
    const symbol = body.symbol || 'TLV.RO';
    const summary = mockTickerSummaries.find((t) => t.symbol === symbol) || mockTickerSummaries[0]!;
    const row: WatchlistRow = {
      ticker: summary,
      price: '100.00',
      dayChangePct: '1.20',
      composite: null,
      status: 'syncing'
    };
    inMemoryWatchlist.push(row);
    return HttpResponse.json(row);
  }),

  http.delete(`${baseUrl}/watchlist/:symbol`, ({ params }) => {
    const symbol = String(params.symbol);
    inMemoryWatchlist = inMemoryWatchlist.filter((w) => w.ticker.symbol !== symbol);
    return new HttpResponse(null, { status: 204 });
  }),

  // Brokers
  http.get(`${baseUrl}/brokers`, () => {
    return HttpResponse.json(mockBrokers);
  }),

  http.post(`${baseUrl}/brokers/:broker/estimate-fee`, async ({ params, request }) => {
    const broker = String(params.broker);
    const body = (await request.json().catch(() => ({}))) as {
      symbol?: string;
      shares?: string;
      price?: string;
      currency?: string;
    };
    const est = getMockBrokerFeeEstimate(
      broker,
      body.symbol || 'TLV.RO',
      body.shares || '100',
      body.price || '25',
      body.currency || 'RON'
    );
    return HttpResponse.json(est);
  }),

  // Settings
  http.get(`${baseUrl}/settings`, () => {
    return HttpResponse.json(inMemorySettings);
  }),

  http.put(`${baseUrl}/settings`, async ({ request }) => {
    const partial = (await request.json().catch(() => ({}))) as Partial<SettingsDto>;
    inMemorySettings = { ...inMemorySettings, ...partial };
    return HttpResponse.json(inMemorySettings);
  }),

  http.get(`${baseUrl}/settings/dividend-tax-rates`, () => {
    return HttpResponse.json(mockDividendTaxRates);
  }),

  http.post(`${baseUrl}/settings/dividend-tax-rates/refresh`, () => {
    return new HttpResponse(null, { status: 202 });
  }),

  // Jobs
  http.post(`${baseUrl}/jobs/:id/retry`, () => {
    return HttpResponse.json({ ok: true, message: 'Job retry queued successfully.' });
  }),

  // Notifications
  http.get(`${baseUrl}/notifications`, () => {
    return HttpResponse.json(inMemoryNotifications);
  }),

  http.post(`${baseUrl}/notifications/:id/read`, ({ params }) => {
    const id = String(params.id);
    inMemoryNotifications = inMemoryNotifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    return new HttpResponse(null, { status: 204 });
  }),

  // Screener
  http.post(`${baseUrl}/screener`, () => {
    const rows: ScreenerResultRow[] = mockTickerSummaries.map((t) => ({
      ticker: t,
      composite: null,
      metrics: {
        dividendYield: t.symbol === 'H2O.RO' ? '8.40' : t.symbol === 'TLV.RO' ? '5.80' : '0.65',
        peTrailing: t.symbol === 'TLV.RO' ? '8.20' : '18.50',
        piotroski: '8.00'
      }
    }));
    return HttpResponse.json(rows);
  }),

  http.get(`${baseUrl}/screener/presets`, () => {
    return HttpResponse.json(mockScreenerPresets);
  }),

  // ==========================================
  // Tracking Finances & Wealth Allocation
  // ==========================================
  http.get(`${baseUrl}/finances/settings`, () => {
    return HttpResponse.json(inMemoryFinanceSettings);
  }),

  http.put(`${baseUrl}/finances/settings`, async ({ request }) => {
    const updated = (await request.json()) as FinanceSettingsDto;
    inMemoryFinanceSettings = {
      ...inMemoryFinanceSettings,
      ...updated
    };
    return HttpResponse.json(inMemoryFinanceSettings);
  }),

  http.get(`${baseUrl}/finances/monthly`, ({ request }) => {
    const url = new URL(request.url);
    const month = url.searchParams.get('month') || '2026-10';
    const summary = computeFinanceSummary(month);
    return HttpResponse.json({
      summary,
      expenses: inMemoryExpenses,
      wealthAllocations: inMemoryWealthAllocations,
      settings: inMemoryFinanceSettings
    });
  }),

  http.post(`${baseUrl}/finances/expenses`, async ({ request }) => {
    const body = (await request.json()) as Partial<ExpenseItemDto>;
    const newExpense: ExpenseItemDto = {
      id: `exp-${Date.now()}`,
      name: body.name || 'Cheltuială Nouă',
      category: body.category || 'Altele',
      amount: body.amount || '0.00',
      currency: body.currency || 'RON',
      type: body.type || 'OTHER',
      status: body.status || 'PAID',
      ...(body.dueDate ? { dueDate: body.dueDate } : {}),
      ...(body.interestRatePct ? { interestRatePct: body.interestRatePct } : {}),
      createdAt: new Date().toISOString()
    };
    inMemoryExpenses = [newExpense, ...inMemoryExpenses];
    return HttpResponse.json(newExpense, { status: 201 });
  }),

  http.put(`${baseUrl}/finances/expenses/:id/status`, async ({ params, request }) => {
    const id = String(params.id);
    const body = (await request.json()) as { status: 'PAID' | 'DUE' | 'PENDING' };
    let updatedItem: ExpenseItemDto | null = null;
    inMemoryExpenses = inMemoryExpenses.map((e) => {
      if (e.id === id) {
        updatedItem = { ...e, status: body.status };
        return updatedItem;
      }
      return e;
    });
    if (!updatedItem) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(updatedItem);
  }),

  http.delete(`${baseUrl}/finances/expenses/:id`, ({ params }) => {
    const id = String(params.id);
    inMemoryExpenses = inMemoryExpenses.filter((e) => e.id !== id);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${baseUrl}/finances/wealth-allocations`, async ({ request }) => {
    const body = (await request.json()) as Partial<WealthAllocationDto>;
    const newAlloc: WealthAllocationDto = {
      id: `wealth-${Date.now()}`,
      name: body.name || 'Alocare Nouă',
      institution: body.institution || 'Banca Transilvania',
      institutionType: body.institutionType || 'BANK',
      type: body.type || 'BANK_DEPOSIT',
      amount: body.amount || '0.00',
      currency: body.currency || 'RON',
      ...(body.interestRatePct ? { interestRatePct: body.interestRatePct } : {}),
      ...(body.notes ? { notes: body.notes } : {})
    };
    inMemoryWealthAllocations = [newAlloc, ...inMemoryWealthAllocations];
    return HttpResponse.json(newAlloc, { status: 201 });
  }),

  http.delete(`${baseUrl}/finances/wealth-allocations/:id`, ({ params }) => {
    const id = String(params.id);
    inMemoryWealthAllocations = inMemoryWealthAllocations.filter((a) => a.id !== id);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${baseUrl}/finances/receipt-scan`, async () => {
    // Simulator Gemini Vision AI OCR
    const simulatedReceipts = [
      {
        name: 'Mega Image - Cumpărături Alimente & Casă',
        category: 'Mâncare (Supermarket / Mega / Lidl)',
        amount: '342.50',
        currency: 'RON',
        type: 'FOOD' as FinanceCategoryType,
        status: 'PAID' as const
      },
      {
        name: 'OMV Petrom - Tutun & Apă',
        category: 'Cigarettes (Țigări / Tutun)',
        amount: '165.00',
        currency: 'RON',
        type: 'CIGARETTES' as FinanceCategoryType,
        status: 'PAID' as const
      },
      {
        name: 'Engie Romania - Factură Gaze Naturale',
        category: 'Engie - Gaze naturale',
        amount: '290.00',
        currency: 'RON',
        type: 'UTILITY' as FinanceCategoryType,
        status: 'PAID' as const
      }
    ];
    const pick = simulatedReceipts[Math.floor(Math.random() * simulatedReceipts.length)] || simulatedReceipts[0]!;
    const created: ExpenseItemDto = {
      id: `exp-gemini-${Date.now()}`,
      name: `[Gemini Vision AI] ${pick.name}`,
      category: pick.category,
      amount: pick.amount,
      currency: pick.currency,
      type: pick.type,
      status: pick.status,
      createdAt: new Date().toISOString()
    };
    inMemoryExpenses = [created, ...inMemoryExpenses];
    return HttpResponse.json(created, { status: 201 });
  }),

  http.get(`${baseUrl}/finances/simulations`, async () => {
    return HttpResponse.json([
      {
        id: 'sim-1',
        name: 'My Plan 2026',
        horizonYear: 2036,
        baseCurrency: 'RON',
        config: {
          horizonYear: 2036,
          baseCurrency: 'RON',
          startingDeposit: '25000.00',
          depositAnnualRatePct: '6.50',
          stockScenario: 'MODERATE',
          allocationRules: [],
          stockRules: [],
          plannedExpenses: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]);
  }),

  http.post(`${baseUrl}/finances/simulations/run`, async ({ request }) => {
    const body = (await request.json()) as { config: SimulationConfig };
    const horizon = Number(body?.config?.horizonYear) || 2036;
    const startYear = new Date().getFullYear();
    const rows = [];
    const monthlyRows = [];

    let currentDeposit = parseFloat(String(body?.config?.startingDeposit || '25000')) || 25000;
    let currentStock = 0;

    for (let yr = startYear; yr <= horizon; yr++) {
      currentDeposit += 12000;
      currentStock = (currentStock + 18000) * 1.08;
      const netWorth = (currentDeposit + currentStock).toFixed(2);

      const perStock = [
        {
          symbol: 'VWCE.DE',
          invested: (currentStock * 0.7 * 0.75).toFixed(2),
          dividends: (currentStock * 0.7 * 0.02).toFixed(2),
          value: (currentStock * 0.7).toFixed(2),
          shares: '400'
        },
        {
          symbol: 'SXR8.DE',
          invested: (currentStock * 0.3 * 0.75).toFixed(2),
          dividends: (currentStock * 0.3 * 0.015).toFixed(2),
          value: (currentStock * 0.3).toFixed(2),
          shares: '150'
        }
      ];

      rows.push({
        month: `${yr}-12`,
        income: '294000.00',
        expenses: '144000.00',
        toDeposit: '12000.00',
        toStocks: '18000.00',
        depositInterest: '650.00',
        depositBalance: currentDeposit.toFixed(2),
        stockValue: currentStock.toFixed(2),
        netWorth,
        perStock
      });

      monthlyRows.push({
        month: `${yr}-06`,
        income: '24500.00',
        expenses: '12000.00',
        toDeposit: '1000.00',
        toStocks: '1500.00',
        depositInterest: '54.16',
        depositBalance: currentDeposit.toFixed(2),
        stockValue: currentStock.toFixed(2),
        netWorth,
        perStock,
        perInstrument: [
          {
            instrumentId: 'inst-1',
            name: 'Depozit CEC RON',
            type: 'DEPOSIT',
            currency: 'RON',
            balance: (currentDeposit * 0.7).toFixed(2),
            interestEarned: '350.00',
            balanceInBaseCurrency: (currentDeposit * 0.7).toFixed(2)
          },
          {
            instrumentId: 'inst-2',
            name: 'FIDELIS EUR 5Y',
            type: 'BOND',
            currency: 'EUR',
            balance: (currentDeposit * 0.3 / 5).toFixed(2),
            interestEarned: '145.00',
            balanceInBaseCurrency: (currentDeposit * 0.3).toFixed(2)
          }
        ]
      });
      monthlyRows.push({
        month: `${yr}-12`,
        income: '24500.00',
        expenses: '12000.00',
        toDeposit: '1000.00',
        toStocks: '1500.00',
        depositInterest: '54.16',
        depositBalance: currentDeposit.toFixed(2),
        stockValue: currentStock.toFixed(2),
        netWorth,
        perStock
      });
    }

    const result: SimulationResult = {
      rows,
      summary: {
        finalNetWorth: (currentDeposit + currentStock).toFixed(2),
        totalInvested: '300000.00',
        totalInterest: '45000.00',
        split: '25% / 75%'
      },
      assumptions: {
        note: 'Deterministic 8% p.a. stock return & 6.5% deposit rate.',
        unpricedSymbols: null
      },
      monthlyRows
    };

    return HttpResponse.json(result);
  }),

  http.post(`${baseUrl}/stocks/:symbol/verdict`, async () => {
    const verdict: TickerVerdictDto = {
      verdict: 'buy',
      summary: 'Solid balance sheet, strong cash flows, and attractive margin of safety relative to valuation models.',
      riskWorthIt: true,
      probabilisticWin: 78,
      coloring: 'green',
      reentry: null
    };
    return HttpResponse.json(verdict);
  }),

  http.get(`${baseUrl}/algorithms/metadata`, async () => {
    const metadata: Record<string, AlgoMetadataDto> = {
      'Graham Number': {
        formula: '√(22.5 × EPS × BVPS)',
        definition: 'Benjamin Graham conservative fair value bound for defensive investors.',
        how: 'Calculated by multiplying trailing 12M EPS and Book Value Per Share by 22.5 and taking the square root.'
      },
      'Piotroski F-Score': {
        formula: '∑(9 binary accounting signals: ROA, CFO, ΔROA, Accrual, ΔLeverage, ΔLiquidity, EQ Offer, ΔMargin, ΔTurnover)',
        definition: '9-point accounting health score designed to identify winners and avoid financial distress.',
        how: 'Evaluated across profitability, leverage/liquidity, and operating efficiency using consecutive SEC 10-K/10-Q filings.'
      },
      'Beneish M-Score': {
        formula: '-4.84 + 0.920(DSRI) + 0.528(GMI) + 0.404(AQI) + 0.892(SGI) + 0.115(DEPI) - 0.172(SGAI) + 4.679(TATA) - 0.327(LVGI)',
        definition: 'Mathematical model that detects whether a company has manipulated its reported earnings.',
        how: 'Compares 8 financial ratios between two consecutive years to detect accounting red flags.'
      }
    };
    return HttpResponse.json(metadata);
  })
];

