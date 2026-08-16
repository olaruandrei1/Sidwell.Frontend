import { parseDecimal } from './decimal';
import type { Decimal } from '../api/types';

export function cleanDecimal(
  value: Decimal | number | string | null | undefined,
  maxPlaces = 3
): string {
  if (value === null || value === undefined || value === '') return 'N/A';
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num)) return String(value);
  const fixed = num.toFixed(maxPlaces);
  return fixed.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
}

export function formatMoney(
  value: Decimal | null | undefined,
  currency: string | null | undefined = 'RON',
  places: number | null | undefined = 2,
  locale = 'en-US',
  showSign: boolean | null | undefined = false
): string {
  if (value === null || value === undefined || value === '') return 'N/A';
  const curr = currency || 'RON';
  const decPlaces = Math.min(places ?? 2, 3);
  const num = parseDecimal(value).toNumber();
  try {
    const formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: curr.toUpperCase(),
      minimumFractionDigits: decPlaces,
      maximumFractionDigits: decPlaces
    }).format(num);
    return num > 0 && showSign ? `+${formatted}` : formatted;
  } catch {
    const sign = showSign && num > 0 ? '+' : '';
    return `${sign}${num.toFixed(decPlaces)} ${curr}`;
  }
}

export function formatNumber(
  value: Decimal | number | null | undefined,
  places: number | null | undefined = 2,
  locale = 'en-US'
): string {
  if (value === null || value === undefined || value === '') return 'N/A';
  const decPlaces = Math.min(places ?? 2, 3);
  const num = typeof value === 'number' ? value : parseDecimal(value).toNumber();
  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decPlaces
    }).format(num);
  } catch {
    return cleanDecimal(num, decPlaces);
  }
}

export function formatPercent(
  value: Decimal | null | undefined,
  places: number | null | undefined = 2,
  showSign: boolean | null | undefined = true
): string {
  if (value === null || value === undefined || value === '') return 'N/A';
  const decPlaces = Math.min(places ?? 2, 3);
  const dec = parseDecimal(value);
  const num = dec.toNumber();
  const sign = showSign && num > 0 ? '+' : '';
  return `${sign}${num.toFixed(decPlaces)}%`;
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(isoStr: string | null | undefined): string {
  if (!isoStr) return 'N/A';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleString('ro-RO', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoStr;
  }
}
