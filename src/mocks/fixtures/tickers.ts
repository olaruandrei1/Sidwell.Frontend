import type {
  TickerDetail,
  TickerSummary,
  PriceBar,
  CompositeScore,
  AlgoScore,
  FundamentalPeriod,
  NewsItem,
  DividendInfoDto,
  KeyStatsDto,
  DividendProjectionDto
} from '../../shared/api/types';

function generateHistory(basePrice: number, days = 250): PriceBar[] {
  const bars: PriceBar[] = [];
  let price = basePrice;
  const now = new Date();
  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0] || '2026-01-01';
    const change = (Math.random() - 0.48) * 0.03 * price;
    const open = price;
    const close = Math.max(1, price + change);
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    bars.push({
      date: dateStr,
      open: open.toFixed(2),
      high: high.toFixed(2),
      low: low.toFixed(2),
      close: close.toFixed(2),
      volume: Math.floor(100000 + Math.random() * 900000)
    });
    price = close;
  }
  return bars;
}

export const mockTickerSummaries: TickerSummary[] = [
  { symbol: 'TLV.RO', name: 'Banca Transilvania S.A.', exchange: 'BVB', currency: 'RON' },
  { symbol: 'H2O.RO', name: 'SPEEH Hidroelectrica S.A.', exchange: 'BVB', currency: 'RON' },
  { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', currency: 'USD' },
  { symbol: 'SNN.RO', name: 'Societatea Nationala Nuclearelectrica S.A.', exchange: 'BVB', currency: 'RON' }
];

export const mockCompositeScores: Record<string, CompositeScore> = {
  'TLV.RO': {
    philosophy: 'BALANCED',
    score: '78.50',
    label: 'Strong Buy',
    color: '#34d399',
    overridden: false
  },
  'H2O.RO': {
    philosophy: 'BALANCED',
    score: '84.00',
    label: 'Strong Buy',
    color: '#34d399',
    overridden: false
  },
  'AAPL': {
    philosophy: 'BALANCED',
    score: '62.00',
    label: 'Buy',
    color: '#34d399',
    overridden: false
  },
  'MSFT': {
    philosophy: 'BALANCED',
    score: '-45.00',
    label: 'Avoid (Beneish Veto)',
    color: '#f87171',
    overridden: true
  }
};

export const mockAlgoScores: Record<string, AlgoScore[]> = {
  'TLV.RO': [
    { name: 'Piotroski F-Score', score: '8.00', applicable: true, details: { max: 9 } },
    { name: 'Altman Z-Score', score: '3.45', applicable: true, details: { zone: 'Safe' } },
    { name: 'Beneish M-Score', score: '-2.45', applicable: true, details: { manipulator: false } },
    { name: 'DCF Valuation', score: '34.20', applicable: true, details: { fairValue: '36.50' } }
  ],
  'H2O.RO': [
    { name: 'Piotroski F-Score', score: '9.00', applicable: true, details: { max: 9 } },
    { name: 'Altman Z-Score', score: '4.10', applicable: true, details: { zone: 'Safe' } },
    { name: 'Beneish M-Score', score: '-2.80', applicable: true, details: { manipulator: false } },
    { name: 'DCF Valuation', score: '135.00', applicable: true, details: { fairValue: '142.00' } }
  ],
  'AAPL': [
    { name: 'Piotroski F-Score', score: '7.00', applicable: true, details: { max: 9 } },
    { name: 'Altman Z-Score', score: '5.20', applicable: true, details: { zone: 'Safe' } },
    { name: 'Beneish M-Score', score: '-2.30', applicable: true, details: { manipulator: false } },
    { name: 'DCF Valuation', score: '220.00', applicable: true, details: { fairValue: '235.00' } }
  ],
  'MSFT': [
    { name: 'Piotroski F-Score', score: '6.00', applicable: true, details: { max: 9 } },
    { name: 'Altman Z-Score', score: '4.80', applicable: true, details: { zone: 'Safe' } },
    { name: 'Beneish M-Score', score: '-1.45', applicable: true, details: { manipulator: true, note: 'Earnings manipulation flag triggered' } },
    { name: 'DCF Valuation', score: null, applicable: false, details: null }
  ]
};

export const mockFundamentals: FundamentalPeriod[] = [
  {
    asOfDate: '2025-12-31',
    period: 'FY',
    revenue: '15400000000.00',
    netIncome: '3200000000.00',
    grossProfit: '8900000000.00',
    ebit: '4100000000.00',
    totalAssets: '180000000000.00',
    totalLiabilities: '162000000000.00',
    totalEquity: '18000000000.00',
    eps: '3.65',
    sharesOutstanding: 800000000
  }
];

export const mockNews: NewsItem[] = [
  {
    title: 'BVB records highest quarterly volume in 5 years led by TLV and H2O',
    url: 'https://bvb.ro/news/1',
    publishedAt: '2026-07-25T14:30:00Z',
    sentiment: '0.85',
    source: 'Ziarul Financiar'
  },
  {
    title: 'Analyst raises price target for Romanian banking sector',
    url: 'https://bvb.ro/news/2',
    publishedAt: '2026-07-24T10:15:00Z',
    sentiment: '0.62',
    source: 'Bloomberg'
  }
];

export const mockDividends: Record<string, DividendInfoDto> = {
  'TLV.RO': {
    dividendYield: '5.80',
    forwardDividend: '1.68',
    exDividendDate: '2026-06-12',
    payFrequency: 'ANNUAL',
    historicalGrowthCagr: '12.40',
    status: 'CACHED'
  },
  'H2O.RO': {
    dividendYield: '8.40',
    forwardDividend: '10.50',
    exDividendDate: '2026-06-25',
    payFrequency: 'ANNUAL',
    historicalGrowthCagr: '15.00',
    status: 'CACHED'
  },
  'AAPL': {
    dividendYield: '0.55',
    forwardDividend: '1.00',
    exDividendDate: '2026-05-10',
    payFrequency: 'QUARTERLY',
    historicalGrowthCagr: '6.50',
    status: 'PENDING' // Demonstrating PENDING background lookup
  },
  'MSFT': {
    dividendYield: '0.75',
    forwardDividend: '3.00',
    exDividendDate: '2026-05-15',
    payFrequency: 'QUARTERLY',
    historicalGrowthCagr: '10.20',
    status: 'CACHED'
  }
};

export const mockKeyStats: Record<string, KeyStatsDto> = {
  'TLV.RO': {
    fiftyTwoWeekLow: '23.40', fiftyTwoWeekHigh: '31.20', beta: '0.88', peTrailing: '8.20',
    marketCap: '23200000000.00', earningsDate: '2026-08-15', targetOneYear: '34.50',
    priceToBook: '1.10', roeTtm: '14.20', debtToEquity: '0.35', revenueGrowthTtmYoy: '8.50',
    evToEbitda: '6.20', analystBuy: 8, analystHold: 3, analystSell: 1, analystConsensus: 'Buy'
  },
  'H2O.RO': {
    fiftyTwoWeekLow: '112.00', fiftyTwoWeekHigh: '138.00', beta: '0.65', peTrailing: '10.50',
    marketCap: '56000000000.00', earningsDate: '2026-08-20', targetOneYear: '145.00',
    priceToBook: null, roeTtm: null, debtToEquity: null, revenueGrowthTtmYoy: null,
    evToEbitda: null, analystBuy: null, analystHold: null, analystSell: null, analystConsensus: null
  },
  'AAPL': {
    fiftyTwoWeekLow: '168.00', fiftyTwoWeekHigh: '237.00', beta: '1.25', peTrailing: '32.40',
    marketCap: '3400000000000.00', earningsDate: '2026-08-01', targetOneYear: '240.00',
    priceToBook: '47.20', roeTtm: '160.50', debtToEquity: '1.73', revenueGrowthTtmYoy: '4.87',
    evToEbitda: '25.10', analystBuy: 32, analystHold: 8, analystSell: 2, analystConsensus: 'Buy'
  },
  'MSFT': {
    fiftyTwoWeekLow: '380.00', fiftyTwoWeekHigh: '468.00', beta: '1.10', peTrailing: '36.10',
    marketCap: '3300000000000.00', earningsDate: '2026-07-30', targetOneYear: '490.00',
    priceToBook: '13.80', roeTtm: '38.50', debtToEquity: '0.89', revenueGrowthTtmYoy: '16.30',
    evToEbitda: '22.80', analystBuy: 40, analystHold: 5, analystSell: 0, analystConsensus: 'Buy'
  }
};

export function getMockTickerDetail(symbol: string): TickerDetail {
  const summary = mockTickerSummaries.find((t) => t.symbol === symbol) || {
    symbol,
    name: symbol,
    exchange: 'BVB',
    currency: 'RON'
  };
  const history = generateHistory(symbol === 'H2O.RO' ? 125 : symbol === 'TLV.RO' ? 28 : 215);
  const latest = history[history.length - 1] || null;

  return {
    ticker: { ...summary, secCik: symbol === 'AAPL' || symbol === 'MSFT' ? '0000320193' : null },
    price: { latest, history },
    composite: mockCompositeScores[symbol] || mockCompositeScores['TLV.RO'] || null,
    algorithms: mockAlgoScores[symbol] || [],
    fundamentals: mockFundamentals,
    news: mockNews,
    holding: symbol === 'TLV.RO' ? {
      ticker: summary,
      shares: '500.000000',
      avgCost: '25.000000',
      currency: 'RON',
      marketValue: '14500.00',
      unrealizedPnl: '2000.00',
      realizedPnl: '450.00',
      targetShares: '600.000000',
      broker: 'TradeVille'
    } : null,
    note: symbol === 'TLV.RO' ? 'Core BVB banking holding. Keep adding below 28 RON.' : null,
    watchlisted: symbol === 'TLV.RO' || symbol === 'H2O.RO',
    dividends: mockDividends[symbol] || null,
    keyStats: mockKeyStats[symbol] || null
  };
}

export function getMockDividendProjection(symbol: string, endYear = 2060, reinvest = true): DividendProjectionDto {
  const startYear = new Date().getFullYear();
  const scenarios = [];
  let conservative = 0;
  let moderate = 0;
  let historic = 0;

  for (let y = startYear; y <= endYear; y++) {
    const annualConservative = 120 * Math.pow(1.06, y - startYear);
    const annualModerate = 120 * Math.pow(1.08, y - startYear);
    const annualAggressive = 120 * Math.pow(1.10, y - startYear);
    const annualHistoric = 120 * Math.pow(1.12, y - startYear);
    conservative += annualConservative;
    moderate += annualModerate;
    historic += annualHistoric;
    scenarios.push({
      year: y,
      annualConservative: annualConservative.toFixed(2),
      annualModerate: annualModerate.toFixed(2),
      annualAggressive: annualAggressive.toFixed(2),
      annualHistoric: annualHistoric.toFixed(2),
      cumulativeConservative: conservative.toFixed(2),
      cumulativeModerate: moderate.toFixed(2),
      cumulativeAggressive: (conservative * 1.5).toFixed(2),
      cumulativeHistoric: historic.toFixed(2)
    });
  }

  return {
    ticker: symbol,
    currentShares: '500.000000',
    currentPrice: '29.00',
    dividendPerShare: '1.68',
    endYear,
    reinvest,
    scenarios,
    assumptions: {
      taxCountry: 'RO',
      taxRatePct: '8.00',
      conservativeGrowthPct: '6.00',
      moderateGrowthPct: '8.00',
      historicCagrPct: '12.40',
      reinvestPrice: '29.00'
    }
  };
}
