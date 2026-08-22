export type Decimal = string;
export type Philosophy = "BALANCED" | "MOMENTUM" | "MEAN_REVERSION" | "FUNDAMENTAL" | "GROWTH" | "DIVIDEND" | "VALUE";
export type BrokerCode = "TRADEVILLE" | "XTB" | "IBKR";

export interface PriceBar {
  date: string;
  open: Decimal;
  high: Decimal;
  low: Decimal;
  close: Decimal;
  volume: number;
}

export interface IndicatorPointDto {
  date: string;
  values: Record<string, number>;
}

export interface IndicatorSeriesDto {
  type: string;
  params: Record<string, number>;
  points: IndicatorPointDto[];
  trend: string | null;
  error: string | null;
}

export interface ReentryEstimateDto {
  estimatedDays: number;
  sampleCount: number;
  targetPrice: number;
  currentDeviationPct: number;
}

export interface TechnicalVerdictDto {
  rawScore: number;
  convictionPct: number;
  action: 'strong_buy' | 'buy' | 'hold' | 'caution' | 'avoid';
  agreementPct: number;
  reentry: ReentryEstimateDto | null;
}

export interface CompositeScore {
  philosophy: Philosophy;
  score: Decimal;
  label: string;
  color: string;
  overridden: boolean;
}

export interface AlgoScore {
  name: string;
  score: Decimal | null;
  applicable: boolean;
  details: Record<string, unknown> | null;
}

export interface AlgoMetadataDto {
  formula: string;
  definition: string;
  how: string;
}

export interface TickerVerdictReentry {
  estimatedDays: number;
  sampleCount: number;
  targetPrice: number;
  estimatedDate: string;
}

export interface TickerVerdictDto {
  verdict: "buy" | "hold" | "risky" | "avoid";
  summary: string;
  riskWorthIt: boolean;
  probabilisticWin: number | null;
  coloring: "green" | "yellow" | "red";
  reentry: TickerVerdictReentry | null;
}

export interface GatedAlgoDto {
  algoName: string;
  missingData: string;
}

export interface TickerSummary {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
}

export interface UserDto {
  id: string;
  email: string;
  displayName: string | null;
  isAdmin?: boolean;
}

export interface ApiError {
  status: number;
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
}

export interface FundamentalPeriod {
  asOfDate: string;
  period: "FY" | "Q1" | "Q2" | "Q3" | "Q4";
  revenue: Decimal | null;
  netIncome: Decimal | null;
  grossProfit: Decimal | null;
  ebit: Decimal | null;
  totalAssets: Decimal | null;
  totalLiabilities: Decimal | null;
  totalEquity: Decimal | null;
  eps: Decimal | null;
  sharesOutstanding: number | null;
}

export interface NewsItem {
  title: string;
  url: string;
  publishedAt: string;
  sentiment: Decimal | null;
  source: string;
}

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DividendInfoDto {
  dividendYield: Decimal | null;
  forwardDividend: Decimal | null;
  exDividendDate: string | null;
  payFrequency: "MONTHLY" | "QUARTERLY" | "SEMI_ANNUAL" | "ANNUAL" | "IRREGULAR" | null;
  historicalGrowthCagr: Decimal | null;
  status: "CACHED" | "STALE" | "PENDING";
}

export interface KeyStatsDto {
  fiftyTwoWeekLow: Decimal | null;
  fiftyTwoWeekHigh: Decimal | null;
  beta: Decimal | null;
  peTrailing: Decimal | null;
  marketCap: Decimal | null;
  earningsDate: string | null;
  targetOneYear: Decimal | null;
  priceToBook: Decimal | null;
  roeTtm: Decimal | null;
  debtToEquity: Decimal | null;
  revenueGrowthTtmYoy: Decimal | null;
  evToEbitda: Decimal | null;
  analystBuy: number | null;
  analystHold: number | null;
  analystSell: number | null;
  analystConsensus: string | null;
}

export interface GrowthScenarioDto {
  name: string;
  cagr: Decimal;
  rows: Array<{ year: number; value: Decimal; invested: Decimal }>;
}

export interface GrowthProjectionResultDto {
  symbol: string;
  targetShares: Decimal;
  scenarios: GrowthScenarioDto[];
}

export interface MyProjectionDto {
  shares: Decimal;
  avgCost: Decimal;
  currentValue: Decimal;
  rows: Array<{ year: number; value: Decimal; dividendsReceived: Decimal }>;
}

export interface DividendScenarioRow {
  year: number;
  annualConservative: Decimal;
  annualModerate: Decimal;
  annualAggressive: Decimal;
  annualHistoric: Decimal | null;
  cumulativeConservative: Decimal;
  cumulativeModerate: Decimal;
  cumulativeAggressive: Decimal;
  cumulativeHistoric: Decimal | null;
}

export interface DividendProjectionDto {
  ticker: string;
  currentShares: Decimal;
  currentPrice: Decimal;
  dividendPerShare: Decimal;
  endYear: number;
  reinvest: boolean;
  scenarios: DividendScenarioRow[];
  assumptions: Record<string, string | null> | null;
}

export interface TickerDetail {
  ticker: TickerSummary & { secCik: string | null };
  price: {
    latest: PriceBar | null;
    history: PriceBar[];
    /** Near-real-time quote while the market is open; null when unavailable — fall back to latest.close. */
    live: string | null;
  };
  composite: CompositeScore | null;
  algorithms: AlgoScore[];
  fundamentals: FundamentalPeriod[];
  news: NewsItem[];
  holding: HoldingDto | null;
  note: string | null;
  watchlisted: boolean;
  dividends: DividendInfoDto | null;
  keyStats: KeyStatsDto | null;
  gatedAlgos?: GatedAlgoDto[];
  /** @deprecated use gatedAlgos */
  gated?: GatedAlgoDto[];
}

export interface PortfolioDto {
  referenceCurrency: string;
  totalValue: Decimal;
  dayPnl: Decimal;
  unrealizedPnl: Decimal;
  realizedPnl: Decimal;
  byCurrency: {
    currency: string;
    value: Decimal;
  }[];
  holdings: HoldingDto[];
}

export interface HoldingDto {
  ticker: TickerSummary;
  shares: Decimal;
  avgCost: Decimal;
  currency: string;
  marketValue: Decimal;
  unrealizedPnl: Decimal;
  realizedPnl: Decimal;
  targetShares: Decimal | null;
  targetReached?: boolean;
  brokerCode?: BrokerCode | null;
  broker: string;
  accountName?: string | null;
  market?: string | null;
  status?: "ready" | "syncing" | "no-data";
}

export interface TransactionInput {
  symbol: string;
  side: "BUY" | "SELL";
  shares: Decimal;
  price: Decimal;
  priceAuto: boolean;
  fee: Decimal | null;
  executedAt: string;
  fxRateAtExecution: Decimal | null;
  targetShares?: Decimal | null;
  broker: string;
}

export interface TransactionDto extends TransactionInput {
  id: string;
  createdAt: string;
}

export interface TransactionResult {
  holding: HoldingDto | null;
  resolvedPrice: Decimal;
  priceSource: "MANUAL" | "AUTO" | "MANUAL_FALLBACK";
  priceDate: string | null;
}

export interface WatchlistRow {
  ticker: TickerSummary;
  price: Decimal | null;
  dayChangePct: Decimal | null;
  composite: CompositeScore | null;
  status: "ready" | "syncing" | "no-data";
}

export interface BrokerDto {
  name: string;
  code: BrokerCode;
  description: string;
}

export interface BrokerFeeEstimate {
  fee: Decimal;
  baseFee: Decimal;
  fxConversionFee: Decimal;
  currency: string | null;
  estimated: boolean;
  fetchedAt: string;
}

export interface SettingsDto {
  philosophy: Philosophy;
  referenceCurrency: string;
  taxCountry: string;
  preferredBroker: BrokerCode;
  dividendProjectionEndYear: number;
  dividendReinvestDefault: boolean;
}

export interface DividendTaxRateDto {
  countryCode: string;
  ratePercent: Decimal;
  notes: string | null;
  sourceUrl: string | null;
  fetchedAt: string;
}

export interface ExchangeRateDto {
  currency: string;
  rateDate: string;
  rateToRon: string;
  source: string;
}

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  body: string | null;
  isRead: boolean;
  createdAt: string;
}

// ==========================================
// Tracking Finances & Wealth Allocation Module
// ==========================================

// The 7 builtin codes remain, but users can add their own via Settings — so this is any string,
// not a closed union. Builtin codes still get translated labels (t('enums.' + code)); custom
// codes carry their own user-entered label (see FinanceCategoryTypeDef).
export type FinanceCategoryType = string;

export interface FinanceCategoryTypeDef {
  code: string;
  label: string;
}

export interface FinanceCategoryDef {
  id: string;
  name: string;
  type: FinanceCategoryType;
  isDefault?: boolean;
}

export interface ExpenseLineItemDto {
  name: string;
  qty: number;
  unitPrice: string;
  amount: string;
  category?: string;
  type?: FinanceCategoryType;
  receiptId?: string;
  receiptName?: string;
  receiptDate?: string;
}

export interface ExpenseItemDto {
  id: string;
  name: string;
  category: string;
  amount: string;
  currency: string;
  type: FinanceCategoryType;
  /** Backend CHECK constraint: only PAID | DUE | PENDING are valid. UNPAID is a UI-only label mapped to DUE. */
  status: 'PAID' | 'DUE' | 'PENDING';
  dueDate?: string;
  interestRatePct?: string; // e.g., "5.89" for loans
  /** YYYY-MM — the month this expense belongs to */
  month?: string;
  /** true = recurring every month (loans, subscriptions); false = one-off (utilities, food) */
  isRecurring?: boolean;
  lineItems?: ExpenseLineItemDto[] | null;
  createdAt: string;
}

export type WealthInstitutionType = 'BANK' | 'BROKER';

export interface WealthAllocationDto {
  id: string;
  name: string;
  institution: string; // BT, ING, BCR, Revolut, Salt Bank, TradeVille, XTB, IBKR
  institutionType: WealthInstitutionType;
  type: 'BANK_DEPOSIT' | 'BROKER_CASH' | 'DCA_TARGET';
  amount: string;
  currency: string;
  interestRatePct?: string;
  notes?: string;
  month?: string;
  subItems?: { name: string; amount: string }[];
}

export interface FinanceSettingsDto {
  monthlyIncome: {
    amount: string;
    currency: string;
  };
  categories: FinanceCategoryDef[];
  banks: string[];
  brokers: string[];
  categoryTypes: FinanceCategoryTypeDef[];
}

export interface BrokerNetInvestedDto {
  broker: string;
  currency: string;
  amount: string;
}

export interface MonthlyFinanceSummaryDto {
  month: string; // e.g. "2026-10"
  netIncome: string;
  currency: string;
  netIncomeInRon: string | null;
  exchangeRate: string | null;
  totalLoansAndSubs: string;
  totalUtilities: string;
  totalVariableExpenses: string;
  totalExpenses: string;
  totalAllocatedWealth: string;
  freeCash: string;
  savingsRatePct: string;
  totalExtraIncomes?: string;
  totalExtraIncomesInRon?: string | null;
  brokerNetInvested?: BrokerNetInvestedDto[];
}

// ── Simulate Future (net-worth planning engine). Money = string. Backend: Sidwell.Backend BFF.
// Endpoints: GET/POST /finances/simulations, PUT/DELETE /finances/simulations/{id},
// POST /finances/simulations/run { config } -> SimulationResultDto. See PLAN-SIMULATE-FUTURE.md.

export type SimulationConditionType = "UNTIL_DATE" | "UNTIL_DEPOSIT" | "UNTIL_STOCK_COUNT" | "ALWAYS" | "BETWEEN_DATES";

export interface SimulationCondition {
  type: SimulationConditionType;
  date?: string | null;   // UNTIL_DATE end / BETWEEN_DATES end — "YYYY-MM"
  amount?: Decimal | null; // UNTIL_DEPOSIT — active while depositBalance < amount
  count?: number | null;   // UNTIL_STOCK_COUNT — active while distinctStocksOwned < count
  startDate?: string | null; // BETWEEN_DATES start — "YYYY-MM"
}

export interface SimulationAllocationRule {
  condition: SimulationCondition;
  mode: "PERCENT" | "AMOUNT";
  depositPct?: Decimal | null;   // PERCENT (deposit + stocks <= 100; remainder = untracked cash)
  stocksPct?: Decimal | null;
  depositAmount?: Decimal | null; // AMOUNT (capped at surplus, deposit priority)
  stocksAmount?: Decimal | null;
  targetInstrumentId?: string | null;
}

export interface SimulationStockRule {
  symbol: string;
  weightPct?: Decimal | null;    // optional; if any active rule omits it, the active set splits equally
  condition: SimulationCondition;
}

export interface SimulationPlannedExpense {
  dateMonth: string;  // "YYYY-MM"
  amount: Decimal;
  label?: string | null;
}

export interface SimulationStartingHolding {
  symbol: string;
  shares: Decimal;
}

export type SimulationGroupMode = "WEIGHTED" | "SEQUENTIAL";

export type SimulationMemberConditionType = "stock_count" | "invested_amount" | "date" | "ALWAYS";

export interface SimulationGroupMember {
  symbol: string;
  weightPct?: number;
  condition: {
    type: SimulationMemberConditionType;
    value: string;
  };
}

export interface SimulationStockGroup {
  id?: string;
  name?: string;
  weightPct: number;
  mode: SimulationGroupMode;
  members: SimulationGroupMember[];
}

export interface SimulationStockBreakdown {
  symbol: string;
  invested: string;
  dividends: string;
  value: string;
  shares: string;
}

export interface SimulationInstrumentConfig {
  id: string;
  name: string;
  type: "DEPOSIT" | "BOND" | "FUND";
  currency: string;
  annualRatePct: string;
  startingBalance: string;
  bondUnitNominal?: string | null;
  maturityYears?: number | null;
  ticker?: string | null;
}

export interface SimulationInstrumentSnapshot {
  instrumentId: string;
  name: string;
  type: string;
  currency: string;
  balance: string;
  interestEarned: string;
  balanceInBaseCurrency: string;
  units?: string | null;
  nav?: string | null;
}

export interface SimulationMonthlyRow {
  month: string;
  income: string;
  expenses: string;
  toDeposit: string;
  toStocks: string;
  depositInterest: string;
  depositBalance: string;
  stockValue: string;
  netWorth: string;
  perStock: SimulationStockBreakdown[];
  perInstrument?: SimulationInstrumentSnapshot[] | null;
}

export interface SimulationConfig {
  startMonth?: string | null;
  horizonYear: number;
  baseCurrency: string;
  startingDeposit: Decimal;
  depositAnnualRatePct: Decimal;
  stockScenario: "CONSERVATIVE" | "MODERATE" | "HISTORICAL" | string;
  allocationRules: SimulationAllocationRule[];
  stockRules: SimulationStockRule[];
  plannedExpenses: SimulationPlannedExpense[];
  startingHoldings?: SimulationStartingHolding[] | null;
  coverShortfallFrom?: "DEPOSIT" | "NONE" | null;
  stockGroups?: SimulationStockGroup[] | null;
  reinvestDividends?: boolean;
  instruments?: SimulationInstrumentConfig[] | null;
}

export interface SimulationRow {
  month: string;
  income: Decimal;
  expenses: Decimal;
  toDeposit: Decimal;
  toStocks: Decimal;
  depositInterest?: Decimal;
  depositBalance: Decimal;
  stockValue: Decimal;
  netWorth: Decimal;
  perStock?: SimulationStockBreakdown[];
  perInstrument?: SimulationInstrumentSnapshot[] | null;
}

export interface SimulationResult {
  rows: SimulationRow[];
  summary: Record<string, string>;
  assumptions: Record<string, string | null>;
  monthlyRows?: SimulationMonthlyRow[];
}

export interface SavedSimulation {
  id: string;
  name: string;
  horizonYear: number;
  baseCurrency: string;
  config: SimulationConfig;
  createdAt: string;
  updatedAt: string;
}

export interface TickerNoteSectionDto {
  id: string;
  content: string;
}

export interface TickerNoteAttachmentDto {
  id: string;
  name: string;
  mimeType: string;
  dataBase64: string;
}

export interface TickerNoteDto {
  id: string;
  title: string;
  sections: TickerNoteSectionDto[];
  attachments: TickerNoteAttachmentDto[];
  createdAt: string;
  updatedAt: string;
}

