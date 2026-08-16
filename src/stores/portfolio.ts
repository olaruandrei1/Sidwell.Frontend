import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { PortfolioDto, HoldingDto } from '../shared/api/types';

export const usePortfolioStore = defineStore('portfolio', () => {
  const selectedCurrency = ref<string>('ALL'); // 'ALL' or specific currency code 'RON', 'USD'
  const filterQuery = ref<string>('');
  const portfolioData = ref<PortfolioDto | null>(null);

  const setPortfolio = (data: PortfolioDto | null) => {
    portfolioData.value = data;
  };

  const filteredHoldings = computed<HoldingDto[]>(() => {
    if (!portfolioData.value) return [];
    let items = portfolioData.value.holdings;

    if (selectedCurrency.value !== 'ALL') {
      items = items.filter((h) => h.currency === selectedCurrency.value);
    }

    if (filterQuery.value.trim()) {
      const q = filterQuery.value.toLowerCase();
      items = items.filter(
        (h) =>
          h.ticker.symbol.toLowerCase().includes(q) ||
          h.ticker.name.toLowerCase().includes(q)
      );
    }

    return items;
  });

  const currenciesAvailable = computed(() => {
    if (!portfolioData.value) return ['RON', 'USD'];
    const set = new Set<string>();
    portfolioData.value.holdings.forEach((h) => set.add(h.currency));
    return ['ALL', ...Array.from(set)];
  });

  return {
    selectedCurrency,
    filterQuery,
    portfolioData,
    setPortfolio,
    filteredHoldings,
    currenciesAvailable
  };
});
