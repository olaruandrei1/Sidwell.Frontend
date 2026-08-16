import type { PortfolioDto, HoldingDto, TransactionDto, WatchlistRow } from '../../shared/api/types';
import { mockTickerSummaries, mockCompositeScores } from './tickers';

export const mockHoldings: HoldingDto[] = [
  {
    ticker: mockTickerSummaries[0]!,
    shares: '500.000000',
    avgCost: '25.000000',
    currency: 'RON',
    marketValue: '14500.00',
    unrealizedPnl: '2000.00',
    realizedPnl: '450.00',
    targetShares: '600.000000',
    broker: 'TradeVille'
  },
  {
    ticker: mockTickerSummaries[1]!,
    shares: '150.000000',
    avgCost: '118.000000',
    currency: 'RON',
    marketValue: '18750.00',
    unrealizedPnl: '1050.00',
    realizedPnl: '0.00',
    targetShares: '200.000000',
    broker: 'TradeVille'
  },
  {
    ticker: mockTickerSummaries[2]!,
    shares: '10.000000',
    avgCost: '185.000000',
    currency: 'USD',
    marketValue: '2150.00',
    unrealizedPnl: '300.00',
    realizedPnl: '120.00',
    targetShares: '15.000000',
    broker: 'IBKR'
  }
];

export const mockPortfolio: PortfolioDto = {
  referenceCurrency: 'RON',
  totalValue: '43250.00',
  dayPnl: '640.50',
  unrealizedPnl: '3350.00',
  realizedPnl: '570.00',
  byCurrency: [
    { currency: 'RON', value: '33250.00' },
    { currency: 'USD', value: '10000.00' }
  ],
  holdings: mockHoldings
};

export const mockTransactions: TransactionDto[] = [
  {
    id: 'tx-1',
    symbol: 'TLV.RO',
    side: 'BUY',
    shares: '500.000000',
    price: '25.000000',
    priceAuto: false,
    fee: '15.50',
    executedAt: '2025-11-10',
    fxRateAtExecution: '1.000000',
    createdAt: '2025-11-10T10:00:00Z',
    broker: 'TradeVille'
  },
  {
    id: 'tx-2',
    symbol: 'H2O.RO',
    side: 'BUY',
    shares: '150.000000',
    price: '118.000000',
    priceAuto: false,
    fee: '28.00',
    executedAt: '2026-02-15',
    fxRateAtExecution: '1.000000',
    createdAt: '2026-02-15T11:20:00Z',
    broker: 'TradeVille'
  },
  {
    id: 'tx-3',
    symbol: 'AAPL',
    side: 'BUY',
    shares: '10.000000',
    price: '185.000000',
    priceAuto: false,
    fee: '2.50',
    executedAt: '2026-04-01',
    fxRateAtExecution: '4.650000',
    createdAt: '2026-04-01T15:30:00Z',
    broker: 'IBKR'
  }
];

export const mockWatchlist: WatchlistRow[] = [
  {
    ticker: mockTickerSummaries[0]!,
    price: '29.00',
    dayChangePct: '1.40',
    composite: mockCompositeScores['TLV.RO'] || null,
    status: 'ready'
  },
  {
    ticker: mockTickerSummaries[1]!,
    price: '125.00',
    dayChangePct: '2.10',
    composite: mockCompositeScores['H2O.RO'] || null,
    status: 'ready'
  },
  {
    ticker: mockTickerSummaries[2]!,
    price: '215.00',
    dayChangePct: '-0.45',
    composite: mockCompositeScores['AAPL'] || null,
    status: 'syncing'
  },
  {
    ticker: mockTickerSummaries[3]!,
    price: '442.00',
    dayChangePct: '-1.80',
    composite: mockCompositeScores['MSFT'] || null,
    status: 'ready'
  },
  {
    ticker: mockTickerSummaries[4]!,
    price: null,
    dayChangePct: null,
    composite: null,
    status: 'no-data'
  }
];
