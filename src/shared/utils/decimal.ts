import DecimalLib from 'decimal.js-light';
import type { Decimal } from '../api/types';

export function parseDecimal(value: Decimal | number | null | undefined, defaultVal = '0'): DecimalLib {
  if (value === null || value === undefined || value === '') {
    return new DecimalLib(defaultVal);
  }
  try {
    return new DecimalLib(value);
  } catch {
    return new DecimalLib(defaultVal);
  }
}

export function toDecimalString(val: DecimalLib | Decimal | number, places?: number): Decimal {
  const d = val instanceof DecimalLib ? val : parseDecimal(val);
  if (places !== undefined) {
    return d.toFixed(places);
  }
  return d.toString();
}

export function addDecimals(a: Decimal, b: Decimal, places = 2): Decimal {
  return parseDecimal(a).plus(parseDecimal(b)).toFixed(places);
}

export function subDecimals(a: Decimal, b: Decimal, places = 2): Decimal {
  return parseDecimal(a).minus(parseDecimal(b)).toFixed(places);
}

export function mulDecimals(a: Decimal, b: Decimal, places = 2): Decimal {
  return parseDecimal(a).times(parseDecimal(b)).toFixed(places);
}

export function divDecimals(a: Decimal, b: Decimal, places = 2): Decimal {
  const bd = parseDecimal(b);
  if (bd.isZero()) return places === 2 ? '0.00' : '0';
  return parseDecimal(a).dividedBy(bd).toFixed(places);
}

export function isPositiveDecimal(val: Decimal | null | undefined): boolean {
  if (!val) return false;
  return parseDecimal(val).greaterThan(0);
}

export function isNegativeDecimal(val: Decimal | null | undefined): boolean {
  if (!val) return false;
  return parseDecimal(val).lessThan(0);
}
