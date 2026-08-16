import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import DividendProjectionTable from '../shared/ui/organisms/DividendProjectionTable.vue';
import type { DividendProjectionDto, DividendInfoDto } from '../shared/api/types';

describe('DividendProjectionTable.vue', () => {
  it('renders 3-column net-of-tax projection scenarios and DRIP reinvest checkbox', () => {
    const mockProjection: DividendProjectionDto = {
      ticker: 'TLV.RO',
      currentShares: '500.000000',
      currentPrice: '29.00',
      dividendPerShare: '1.68',
      endYear: 2060,
      reinvest: true,
      scenarios: [
        {
          year: 2026,
          annualConservative: '840.00',
          annualModerate: '850.00',
          annualAggressive: '860.00',
          annualHistoric: '880.00',
          cumulativeConservative: '840.00',
          cumulativeModerate: '850.00',
          cumulativeAggressive: '860.00',
          cumulativeHistoric: '880.00'
        }
      ],
      assumptions: {
        taxCountry: 'RO',
        taxRatePct: '8.00',
        conservativeGrowthPct: '6.00',
        moderateGrowthPct: '8.00',
        historicCagrPct: '12.40',
        reinvestPrice: '29.00'
      }
    };

    const mockInfo: DividendInfoDto = {
      dividendYield: '5.80',
      forwardDividend: '1.68',
      exDividendDate: '2026-06-12',
      payFrequency: 'ANNUAL',
      historicalGrowthCagr: '12.40',
      status: 'CACHED'
    };

    const wrapper = mount(DividendProjectionTable, {
      props: {
        projection: mockProjection,
        dividendInfo: mockInfo
      }
    });

    expect(wrapper.text()).toContain('Conservative (6%)');
    expect(wrapper.text()).toContain('Moderate (8%)');
    expect(wrapper.text()).toContain('Historic CAGR');
    expect(wrapper.text()).toContain('840.00');
    expect(wrapper.text()).toContain('Reinvest dividends until 2060');
  });

  it('displays FETCHING DIVIDEND DATA badge when status is PENDING', () => {
    const mockInfo: DividendInfoDto = {
      dividendYield: null,
      forwardDividend: null,
      exDividendDate: null,
      payFrequency: null,
      historicalGrowthCagr: null,
      status: 'PENDING'
    };

    const wrapper = mount(DividendProjectionTable, {
      props: {
        projection: null,
        dividendInfo: mockInfo
      }
    });

    expect(wrapper.text()).toContain('FETCHING DIVIDEND DATA');
  });
});
