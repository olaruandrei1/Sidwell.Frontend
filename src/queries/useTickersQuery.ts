import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/vue-query';
import { type Ref, unref } from 'vue';
import { api } from '../shared/api/client';
import type {
  TickerDetail,
  DividendInfoDto,
  DividendProjectionDto,
  GrowthProjectionResultDto,
  MyProjectionDto,
  TransactionDto,
  PaginatedResult,
  NewsItem,
  TickerVerdictDto,
  TechnicalVerdictDto,
  AlgoMetadataDto
} from '../shared/api/types';

const VERDICT_INDICATOR_TYPES = 'sma20,sma50,rsi14,macd,adx14';

function mapTechnicalVerdict(raw: TechnicalVerdictDto): TickerVerdictDto {
  const magnitudeConviction = Math.round(50 + Math.abs(raw.rawScore) * 50);
  const agreementPct = Math.round(raw.agreementPct);

  const verdictByAction: Record<TechnicalVerdictDto['action'], TickerVerdictDto['verdict']> = {
    strong_buy: 'buy',
    buy: 'buy',
    hold: 'hold',
    caution: 'risky',
    avoid: 'avoid'
  };
  const coloringByAction: Record<TechnicalVerdictDto['action'], TickerVerdictDto['coloring']> = {
    strong_buy: 'green',
    buy: 'green',
    hold: 'yellow',
    caution: 'yellow',
    avoid: 'red'
  };
  const target = raw.reentry ? `$${raw.reentry.targetPrice.toFixed(2)}` : null;
  const days = raw.reentry?.estimatedDays;
  const sampleCount = raw.reentry?.sampleCount;

  const summaryByAction: Record<TechnicalVerdictDto['action'], string> = {
    strong_buy: `${magnitudeConviction}% conviction long: ${agreementPct}% of active signals point up strongly. Hold them — or open a long position (CFDs) if you're not in yet.`,
    buy: `${magnitudeConviction}% conviction long: ${agreementPct}% of active signals lean bullish. Reasonable to add on strength or hold.`,
    hold: `Signals are mixed — no clear edge either way (${magnitudeConviction}% conviction). Hold them boy: don't chase, don't dump.`,
    caution: target
      ? `${magnitudeConviction}% conviction short: ${agreementPct}% of signals lean bearish. Consider trimming and waiting to re-enter near ${target} (historical revert took ~${days} sessions across ${sampleCount} similar episodes).`
      : `${magnitudeConviction}% conviction short: ${agreementPct}% of signals lean bearish (${magnitudeConviction}% conviction). Consider trimming and waiting for a better entry.`,
    avoid: target
      ? `${magnitudeConviction}% conviction short: strong bearish agreement (${agreementPct}%). Sell and wait to re-enter near ${target} — or open a short (CFDs) if that's your play. Historical mean-revert: ~${days} sessions across ${sampleCount} episodes.`
      : `${magnitudeConviction}% conviction short: strong bearish agreement (${agreementPct}%). Sell and wait for a better entry — or open a short (CFDs) if that's your play.`
  };

  const reentry = raw.reentry
    ? {
        estimatedDays: raw.reentry.estimatedDays,
        sampleCount: raw.reentry.sampleCount,
        targetPrice: raw.reentry.targetPrice,
        estimatedDate: estimateCalendarDate(raw.reentry.estimatedDays)
      }
    : null;

  return {
    verdict: verdictByAction[raw.action],
    summary: summaryByAction[raw.action],
    riskWorthIt: raw.action !== 'hold' && magnitudeConviction >= 65 && agreementPct >= 60,
    probabilisticWin: magnitudeConviction,
    coloring: coloringByAction[raw.action],
    reentry
  };
}

function estimateCalendarDate(tradingDays: number): string {
  const calendarDays = Math.round(tradingDays * (7 / 5));
  const date = new Date();
  date.setDate(date.getDate() + calendarDays);
  return date.toISOString().slice(0, 10);
}

export function useTickerDetailQuery(symbol: Ref<string> | string) {
  return useQuery({
    queryKey: ['ticker', symbol],
    queryFn: () => api.get<TickerDetail>(`/tickers/${unref(symbol)}`),
    staleTime: 60 * 1000 // 1 minute
  });
}

export function useTickerDividendsQuery(symbol: Ref<string> | string) {
  return useQuery({
    queryKey: ['ticker-dividends', symbol],
    queryFn: () => api.get<DividendInfoDto>(`/tickers/${unref(symbol)}/dividends`),
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}

export function useTickerTransactionsQuery(symbol: Ref<string> | string) {
  return useQuery({
    queryKey: ['ticker-transactions', symbol],
    queryFn: () => api.get<TransactionDto[]>(`/tickers/${unref(symbol)}/transactions`),
    staleTime: 30 * 1000
  });
}

export function useDividendProjectionMutation(symbol: Ref<string> | string) {
  return useMutation({
    mutationFn: (params: { shares?: string; endYear?: number; reinvest?: boolean }) =>
      api.post<DividendProjectionDto>(`/tickers/${unref(symbol)}/dividends/projection`, {
        shares: params.shares || '500',
        endYear: params.endYear || 2060,
        reinvest: params.reinvest ?? true
      })
  });
}

export function useTickerNoteMutation(symbol: Ref<string> | string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (note: string) =>
      api.put<{ ok: boolean }>(`/tickers/${unref(symbol)}/note`, { body: note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticker', symbol] });
    }
  });
}

export function useTickerNewsPaginatedQuery(
  symbol: Ref<string> | string,
  page: Ref<number> | number = 1,
  pageSize: Ref<number> | number = 12
) {
  return useQuery({
    queryKey: ['ticker-news', symbol, page, pageSize],
    queryFn: () =>
      api.get<PaginatedResult<NewsItem>>(`/tickers/${unref(symbol)}/news`, {
        params: {
          page: unref(page),
          pageSize: unref(pageSize)
        }
      }),
    // Keep the previous page's data on screen while the next page loads so the
    // carousel doesn't unmount/reset to the start on every fetch.
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000
  });
}

export function useTickerVerdictQuery(symbol: Ref<string> | string) {
  return useQuery({
    queryKey: ['ticker-verdict-technical', symbol],
    queryFn: async () => {
      const raw = await api.get<TechnicalVerdictDto>(`/tickers/${unref(symbol)}/verdict`, {
        params: { types: VERDICT_INDICATOR_TYPES }
      });
      return mapTechnicalVerdict(raw);
    },
    staleTime: 5 * 60 * 1000,
    retry: 0
  });
}

export function useAlgorithmsMetadataQuery() {
  return useQuery({
    queryKey: ['algorithms-metadata'],
    queryFn: () => api.get<Record<string, AlgoMetadataDto>>('/tickers/algorithms/metadata'),
    staleTime: 60 * 60 * 1000
  });
}

export function useGrowthProjectionQuery(symbol: Ref<string> | string, targetShares: Ref<string> | string) {
  return useQuery({
    queryKey: ['ticker-growth-projection', symbol, targetShares],
    queryFn: () =>
      api.get<GrowthProjectionResultDto>(`/tickers/${unref(symbol)}/growth-projection`, {
        params: { targetShares: unref(targetShares) }
      }),
    staleTime: 5 * 60 * 1000
  });
}

export function useMyProjectionQuery(symbol: Ref<string> | string) {
  return useQuery({
    queryKey: ['ticker-my-projection', symbol],
    queryFn: () => api.get<MyProjectionDto>(`/tickers/${unref(symbol)}/my-projection`),
    staleTime: 60 * 1000
  });
}

export function useSyncTriggerMutation(symbol: Ref<string> | string) {
  return useMutation({
    mutationFn: () => api.post<{ queued: boolean; symbol: string }>(`/tickers/${unref(symbol)}/sync`, {})
  });
}
