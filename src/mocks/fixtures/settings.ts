import type { SettingsDto, DividendTaxRateDto, NotificationDto, ScreenerPreset } from '../../shared/api/types';

export const mockSettings: SettingsDto = {
  philosophy: 'BALANCED',
  referenceCurrency: 'RON',
  taxCountry: 'RO',
  preferredBroker: 'TRADEVILLE',
  dividendProjectionEndYear: 2060,
  dividendReinvestDefault: true
};

export const mockDividendTaxRates: DividendTaxRateDto[] = [
  {
    countryCode: 'RO',
    ratePercent: '8.00',
    notes: 'Romanian dividend tax rate (since 2023)',
    sourceUrl: 'https://mfinante.gov.ro',
    fetchedAt: '2026-01-15T12:00:00Z'
  },
  {
    countryCode: 'US',
    ratePercent: '10.00',
    notes: '10% withholding tax with valid W-8BEN form',
    sourceUrl: 'https://irs.gov',
    fetchedAt: '2026-01-15T12:00:00Z'
  },
  {
    countryCode: 'DE',
    ratePercent: '26.38',
    notes: 'German Abgeltungsteuer + Solidaritätszuschlag',
    sourceUrl: 'https://bundesfinanzministerium.de',
    fetchedAt: '2026-01-15T12:00:00Z'
  },
  {
    countryCode: 'UK',
    ratePercent: '0.00',
    notes: 'No withholding tax on most UK dividends',
    sourceUrl: 'https://gov.uk',
    fetchedAt: '2026-01-15T12:00:00Z'
  }
];

export const mockNotifications: NotificationDto[] = [
  {
    id: 'notif-1',
    type: 'JOB_FAILED',
    title: 'Dividend Lookup Failed',
    body: 'Background lookup for AAPL dividend yield timed out.',
    isRead: false,
    createdAt: '2026-07-26T10:00:00Z'
  },
  {
    id: 'notif-2',
    type: 'ALERT',
    title: 'Price Drop Alert',
    body: 'TLV.RO dropped 1.5% below your 28.50 RON target.',
    isRead: false,
    createdAt: '2026-07-25T16:45:00Z'
  }
];

export const mockScreenerPresets: ScreenerPreset[] = [
  {
    id: 'preset-1',
    name: 'BVB High Dividend Yield',
    criteria: { minYield: '6.00', maxPe: '12.00', exchange: 'BVB' }
  },
  {
    id: 'preset-2',
    name: 'Safe Value (Piotroski ≥ 7, Safe Altman)',
    criteria: { minPiotroski: 7, altmanSafe: true }
  }
];
