import * as XLSX from 'xlsx';
import type { SimulationResult, SimulationInstrumentConfig } from '../../../shared/api/types';

function fmt(val: string | number | undefined | null): number {
  if (val == null || val === '') return 0;
  return parseFloat(String(val)) || 0;
}

export function exportSimulationToExcel(
  result: SimulationResult,
  instruments: SimulationInstrumentConfig[],
  baseCurrency: string,
  presetName: string
): void {
  const wb = XLSX.utils.book_new();

  // ── Yearly sheet ──────────────────────────────────────────────────────────
  const instHeaders = instruments.map(i => `${i.name} (${i.currency})`);
  const yearlyHeader = [
    'Year', 'Income', 'Expenses', 'To Deposit', 'To Stocks',
    'Deposit Interest', 'Stock Value', 'Dividende An', 'Net Worth',
    ...instHeaders
  ];

  const yearlyData = result.rows.map(row => {
    const instCols = instruments.map(inst => {
      const snap = row.perInstrument?.find(p => p.instrumentId === inst.id);
      return snap ? fmt(snap.balance) : '';
    });
    const dividendeAn = row.perStock?.reduce((acc, s) => acc + fmt(s.dividends), 0) ?? 0;
    return [
      row.month,
      fmt(row.income),
      fmt(row.expenses),
      fmt(row.toDeposit),
      fmt(row.toStocks),
      fmt(row.depositInterest),
      fmt(row.stockValue),
      dividendeAn > 0 ? dividendeAn : '',
      fmt(row.netWorth),
      ...instCols
    ];
  });

  const wsYearly = XLSX.utils.aoa_to_sheet([yearlyHeader, ...yearlyData]);
  wsYearly['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, ...instruments.map(() => ({ wch: 20 }))];
  XLSX.utils.book_append_sheet(wb, wsYearly, 'Yearly');

  // ── Monthly sheet ─────────────────────────────────────────────────────────
  const monthlyHeader = [
    'Month', 'Income', 'Expenses', 'To Deposit', 'To Stocks',
    'Deposit Interest', 'Deposit Balance', 'Stock Value', 'Dividende Lună', 'Net Worth',
    ...instHeaders
  ];

  const monthlyRows = result.monthlyRows ?? [];
  const monthlyData = monthlyRows.map((row, idx) => {
    const instCols = instruments.map(inst => {
      const snap = row.perInstrument?.find(p => p.instrumentId === inst.id);
      return snap ? fmt(snap.balance) : '';
    });
    const curDiv = row.perStock?.reduce((acc, s) => acc + fmt(s.dividends), 0) ?? 0;
    const prevDiv = idx > 0 ? (monthlyRows[idx - 1]?.perStock?.reduce((acc, s) => acc + fmt(s.dividends), 0) ?? 0) : 0;
    const monthlyDiv = curDiv - prevDiv;
    return [
      row.month,
      fmt(row.income),
      fmt(row.expenses),
      fmt(row.toDeposit),
      fmt(row.toStocks),
      fmt(row.depositInterest),
      fmt(row.depositBalance),
      fmt(row.stockValue),
      monthlyDiv > 0.005 ? monthlyDiv : '',
      fmt(row.netWorth),
      ...instCols
    ];
  });

  const wsMonthly = XLSX.utils.aoa_to_sheet([monthlyHeader, ...monthlyData]);
  wsMonthly['!cols'] = [{ wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, ...instruments.map(() => ({ wch: 20 }))];
  XLSX.utils.book_append_sheet(wb, wsMonthly, 'Monthly');

  // ── Summary sheet ─────────────────────────────────────────────────────────
  const summaryData: (string | number)[][] = [['Key', 'Value (RON)']];
  const s = result.summary;
  const summaryRows: [string, string][] = [
    ['Final Net Worth', s.finalNetWorth ?? ''],
    ['Total Invested', s.totalInvested ?? ''],
    ['Total Deposit Interest', s.totalDepositInterest ?? s.totalInterest ?? ''],
    ['Total Bond Coupons', s.totalBondCoupons ?? ''],
    ['Total Stock Capital Gains', s.totalStockCapitalGains ?? ''],
  ];
  for (const [k, v] of summaryRows) summaryData.push([k, fmt(v)]);

  try {
    const nwc: Record<string, string> = JSON.parse(s.netWorthByCurrencyJson ?? '{}');
    for (const [cur, val] of Object.entries(nwc)) summaryData.push([`Net Worth ${cur}`, fmt(val)]);
  } catch { /* ignore */ }

  try {
    const perStock: Array<{ symbol: string; shares: number; invested: number; dividends: number; value: number; market: string }> =
      JSON.parse(s.perStockSummaryJson ?? '[]');
    if (perStock.length > 0) {
      summaryData.push(['', '']);
      summaryData.push(['Symbol', 'Market', 'Shares', 'Invested', 'Dividends', 'Value']);
      for (const x of perStock) summaryData.push([x.symbol, x.market, x.shares, x.invested, x.dividends, x.value]);
    }
  } catch { /* ignore */ }

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  const safeName = presetName.replace(/[^\w\s-]/g, '').trim() || 'simulation';
  XLSX.writeFile(wb, `${safeName}-${baseCurrency}.xlsx`);
}
