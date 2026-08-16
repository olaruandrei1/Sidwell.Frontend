import { describe, it, expect } from 'vitest';
import { addDecimals, subDecimals } from '../shared/utils/decimal';

describe('PortfolioTotals calculations', () => {
  it('safely adds multi-currency P&L decimal strings without floating point drift', () => {
    const val1 = '33250.00';
    const val2 = '10000.00';
    const sum = addDecimals(val1, val2);
    expect(sum).toBe('43250.00');
  });

  it('safely subtracts decimal strings for P&L variance', () => {
    const currentVal = '14500.00';
    const costBasis = '12500.00';
    const unrealized = subDecimals(currentVal, costBasis);
    expect(unrealized).toBe('2000.00');
  });
});
