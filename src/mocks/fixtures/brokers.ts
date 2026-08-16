import type { BrokerDto, BrokerFeeEstimate } from '../../shared/api/types';

export const mockBrokers: BrokerDto[] = [
  {
    name: 'TradeVille',
    code: 'TRADEVILLE',
    description: 'Romanian broker (BVB specialist) — 0.43% base commission'
  },
  {
    name: 'XTB Romania',
    code: 'XTB',
    description: '0% commission up to 100k EUR/month, 0.5% FX fee on non-EUR'
  },
  {
    name: 'Interactive Brokers (IBKR)',
    code: 'IBKR',
    description: 'Tiered international pricing — lowest FX spread'
  }
];

export function getMockBrokerFeeEstimate(
  broker: string,
  symbol: string,
  shares: string,
  price: string,
  currency: string
): BrokerFeeEstimate {
  const sharesNum = parseFloat(shares) || 1;
  const priceNum = parseFloat(price) || 10;
  const val = sharesNum * priceNum;

  // Exercise fixture requirement: estimated: false for a special symbol or broker
  if (broker === 'IBKR' && symbol === 'TLV.RO') {
    return {
      fee: '0.00',
      baseFee: '0.00',
      fxConversionFee: '0.00',
      currency: currency,
      estimated: false, // Background Gemini lookup queued
      fetchedAt: new Date().toISOString()
    };
  }

  let baseFee = 0;
  let fxFee = 0;

  if (broker === 'TRADEVILLE') {
    baseFee = Math.max(1.9, val * 0.0043);
    if (currency !== 'RON') fxFee = val * 0.005;
  } else if (broker === 'XTB') {
    baseFee = 0;
    if (currency !== 'EUR' && currency !== 'RON') fxFee = val * 0.005;
  } else {
    // IBKR
    baseFee = Math.max(1.25, val * 0.0015);
    if (currency !== 'USD') fxFee = 2.0; // Flat FX
  }

  const total = baseFee + fxFee;

  return {
    fee: total.toFixed(2),
    baseFee: baseFee.toFixed(2),
    fxConversionFee: fxFee.toFixed(2),
    currency: currency,
    estimated: true,
    fetchedAt: new Date().toISOString()
  };
}
