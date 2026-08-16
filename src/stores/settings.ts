import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { api } from '../shared/api/client';
import type { Philosophy, BrokerCode, SettingsDto } from '../shared/api/types';

export const useSettingsStore = defineStore('settings', () => {
  const philosophy = ref<Philosophy>('BALANCED');
  const referenceCurrency = ref<string>('RON');
  const taxCountry = ref<string>('RO');
  const preferredBroker = ref<BrokerCode>('TRADEVILLE');
  const dividendProjectionEndYear = ref<number>(2060);
  const dividendReinvestDefault = ref<boolean>(true);
  const isLoaded = ref(false);

  const loadSettings = async () => {
    try {
      const data = await api.get<SettingsDto>('/settings');
      philosophy.value = data.philosophy;
      referenceCurrency.value = data.referenceCurrency;
      taxCountry.value = data.taxCountry;
      preferredBroker.value = data.preferredBroker;
      dividendProjectionEndYear.value = data.dividendProjectionEndYear;
      dividendReinvestDefault.value = data.dividendReinvestDefault;
      isLoaded.value = true;
    } catch (e) {
      console.warn('Could not load settings from server, using defaults:', e);
    }
  };

  const updatePhilosophy = async (newVal: Philosophy) => {
    philosophy.value = newVal;
    try {
      await api.put('/settings', { philosophy: newVal });
    } catch (e) {
      console.error('Failed to update philosophy:', e);
    }
  };

  const updateSettings = async (partial: Partial<SettingsDto>) => {
    if (partial.philosophy) philosophy.value = partial.philosophy;
    if (partial.referenceCurrency) referenceCurrency.value = partial.referenceCurrency;
    if (partial.taxCountry) taxCountry.value = partial.taxCountry;
    if (partial.preferredBroker) preferredBroker.value = partial.preferredBroker;
    if (partial.dividendProjectionEndYear) dividendProjectionEndYear.value = partial.dividendProjectionEndYear;
    if (partial.dividendReinvestDefault !== undefined) dividendReinvestDefault.value = partial.dividendReinvestDefault;

    try {
      await api.put('/settings', partial);
    } catch (e) {
      console.error('Failed to update settings:', e);
    }
  };

  return {
    philosophy,
    referenceCurrency,
    taxCountry,
    preferredBroker,
    dividendProjectionEndYear,
    dividendReinvestDefault,
    isLoaded,
    loadSettings,
    updatePhilosophy,
    updateSettings
  };
});
