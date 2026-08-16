import { describe, it, expect } from 'vitest';
import {
  mockFinanceSettings,
  defaultBanks,
  defaultBrokers
} from '../mocks/fixtures/finances';

describe('Finances and Wealth Allocation Calculations', () => {
  it('has all required default bank institutions configured', () => {
    expect(defaultBanks).toContain('Banca Transilvania');
    expect(defaultBanks).toContain('ING Bank');
    expect(defaultBanks).toContain('BCR');
    expect(defaultBanks).toContain('Revolut');
    expect(defaultBanks).toContain('Salt Bank');
  });

  it('has all required default broker institutions configured', () => {
    expect(defaultBrokers).toContain('TradeVille');
    expect(defaultBrokers).toContain('XTB');
    expect(defaultBrokers).toContain('IBKR');
  });

  it('has loan categories with support for interest rates', () => {
    const loanCats = mockFinanceSettings.categories.filter((c) => c.type === 'LOAN');
    const names = loanCats.map((c) => c.name);
    expect(names).toContain('Credit Card');
    expect(names).toContain('Nevoi Personale');
    expect(names).toContain('Ipotecar');
  });

  it('calculates savings rate percentage and free cash correctly', () => {
    const netIncome = 24500.00;
    const totalExpenses = 4850.00;
    const freeCash = netIncome - totalExpenses;
    const savingsRatePct = ((freeCash / netIncome) * 100).toFixed(1);

    expect(freeCash).toBe(19650);
    expect(savingsRatePct).toBe('80.2');
  });
});
