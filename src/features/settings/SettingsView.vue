<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { supportedLocales, setAppLocale, type LocaleCode } from '../../i18n';
import { useSettingsStore } from '../../stores/settings';
import { useAuthStore } from '../../stores/auth';
import { useThemeStore } from '../../stores/theme';
import { useToast } from '../../shared/composables/useToast';
import { api } from '../../shared/api/client';
import { cleanDecimal } from '../../shared/utils/format';
import PageHeader from '../../shared/ui/templates/PageHeader.vue';
import FormField from '../../shared/ui/molecules/FormField.vue';
import AppButton from '../../shared/ui/atoms/AppButton.vue';
import AppInput from '../../shared/ui/atoms/AppInput.vue';
import TagBadge from '../../shared/ui/atoms/TagBadge.vue';
import FinancesSettingsSection from './components/FinancesSettingsSection.vue';
import DataSourcesSection from './components/DataSourcesSection.vue';
import AdminUsersSection from './components/AdminUsersSection.vue';
import WebPushSection from './components/WebPushSection.vue';
import type { Philosophy, DividendTaxRateDto, ExchangeRateDto, BrokerCode } from '../../shared/api/types';

const { t, locale } = useI18n();

const currentLocale = computed(() => String(locale.value) as LocaleCode);
function onLocaleChange(event: Event) {
  const code = (event.target as HTMLSelectElement).value as LocaleCode;
  setAppLocale(code);
}

const settingsStore = useSettingsStore();
const authStore = useAuthStore();
const themeStore = useThemeStore();
const toast = useToast();

const taxRates = ref<DividendTaxRateDto[]>([]);
const refreshingTax = ref(false);

const exchangeRates = ref<ExchangeRateDto[]>([]);
const refreshingFx = ref(false);

const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States 🇺🇸',
  DE: 'Germany 🇩🇪',
  UK: 'United Kingdom 🇬🇧',
  GB: 'United Kingdom 🇬🇧',
  RO: 'Romania 🇷🇴',
  NL: 'Netherlands 🇳🇱',
  CH: 'Switzerland 🇨🇭',
  SE: 'Sweden 🇸🇪',
  AT: 'Austria 🇦🇹',
  ES: 'Spain 🇪🇸',
  FR: 'France 🇫🇷',
  IT: 'Italy 🇮🇹',
  CA: 'Canada 🇨🇦',
  JP: 'Japan 🇯🇵',
  AU: 'Australia 🇦🇺',
  CN: 'China 🇨🇳',
  BR: 'Brazil 🇧🇷',
  IE: 'Ireland 🇮🇪',
  DK: 'Denmark 🇩🇰',
  NO: 'Norway 🇳🇴',
  FI: 'Finland 🇫🇮',
  BE: 'Belgium 🇧🇪'
};

function getCountryName(code: string): string {
  return COUNTRY_NAMES[code.toUpperCase()] || code;
}

const philosophyOptions = computed(() => [
  { value: 'BALANCED' as Philosophy, label: t('enums.BALANCED'), desc: 'Equal weighting between value, quality, and dividend yield.' },
  { value: 'GROWTH' as Philosophy, label: t('enums.GROWTH'), desc: 'Prioritizes revenue growth and Piotroski quality scores.' },
  { value: 'DIVIDEND' as Philosophy, label: t('enums.DIVIDEND'), desc: 'Focuses on sustainable dividend yield, CAGR, and payout safety.' }
]);

const CURRENCY_NAMES: Record<string, string> = {
  EUR: 'Euro',
  USD: 'US Dollar',
  GBP: 'Liră Sterlină',
  SEK: 'Coroană Suedeză',
  DKK: 'Coroană Daneză',
  NOK: 'Coroană Norvegiană',
  CHF: 'Franc Elvețian',
};

function getCurrencyName(code: string): string {
  return CURRENCY_NAMES[code.toUpperCase()] || code;
}

const loadExchangeRates = async () => {
  try {
    const data = await api.get<ExchangeRateDto[]>('/settings/exchange-rates');
    exchangeRates.value = data;
  } catch (e) {
    console.error('Failed to load exchange rates:', e);
  }
};

const handleRefreshExchangeRates = async () => {
  refreshingFx.value = true;
  try {
    const data = await api.post<ExchangeRateDto[]>('/settings/exchange-rates/refresh');
    exchangeRates.value = data;
    toast.success('Cursuri Actualizate', 'Cursurile valutare au fost actualizate de la Frankfurter/ECB.');
  } catch (e: unknown) {
    toast.error('Refresh Failed', e instanceof Error ? e.message : 'Error refreshing exchange rates');
  } finally {
    refreshingFx.value = false;
  }
};

const loadTaxRates = async () => {
  try {
    const data = await api.get<DividendTaxRateDto[]>('/settings/dividend-tax-rates');
    taxRates.value = data;
  } catch (e) {
    console.error('Failed to load dividend tax rates:', e);
  }
};

const handleRefreshTaxRates = async () => {
  refreshingTax.value = true;
  try {
    await api.post('/settings/dividend-tax-rates/refresh');
    await loadTaxRates();
    toast.success('Tax Rates Refreshed', 'Dividend withholding tax schedule updated from government sources.');
  } catch (e: unknown) {
    toast.error('Refresh Failed', e instanceof Error ? e.message : 'Error refreshing tax rates');
  } finally {
    refreshingTax.value = false;
  }
};

const handleSaveSettings = async () => {
  try {
    await settingsStore.updateSettings({
      philosophy: settingsStore.philosophy,
      referenceCurrency: settingsStore.referenceCurrency,
      taxCountry: settingsStore.taxCountry,
      preferredBroker: settingsStore.preferredBroker,
      dividendProjectionEndYear: settingsStore.dividendProjectionEndYear,
      dividendReinvestDefault: settingsStore.dividendReinvestDefault
    });
    toast.success('Settings Saved', 'Your terminal preferences have been updated.');
  } catch (e: unknown) {
    toast.error('Save Failed', e instanceof Error ? e.message : 'Error saving settings');
  }
};

import { usePwaInstall } from '../../shared/composables/usePwaInstall';

const { isInstallable, isInstalled: pwaInstalled, install: triggerPwaInstall } = usePwaInstall();

async function handleInstallPwa() {
  if (isInstallable.value) {
    await triggerPwaInstall();
    if (pwaInstalled.value) {
      toast.success('Aplicație Instalată', 'Sidwell Terminal a fost adăugat pe desktop!');
    }
  } else if (pwaInstalled.value) {
    toast.info('PWA Desktop', 'Aplicația este deja instalată ca PWA pe acest dispozitiv.');
  } else {
    toast.info(
      'Instalare PWA Desktop',
      'Apasă pe pictograma de instalare (🖥️ / ⬇️) din dreapta barei URL din Chrome sau Edge, sau din meniul browserului („Install Sidwell Terminal”).'
    );
  }
}

onMounted(() => {
  loadTaxRates();
  loadExchangeRates();
});
</script>

<template>
  <div class="space-y-10 w-full max-w-none select-none font-sans pb-16">
    <PageHeader
      :title="t('settings.title')"
      :subtitle="t('settings.subtitle')"
    />

    <!-- ── Investment Philosophy ─────────────────────────────────────── -->
    <section class="space-y-4">
      <div class="flex items-center gap-3 border-b border-white/8 pb-3">
        <span class="text-xl">🧠</span>
        <h2 class="text-lg font-sans font-bold uppercase tracking-wide text-gray-100">
          {{ t('settings.philosophy') }}
        </h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          v-for="opt in philosophyOptions"
          :key="opt.value"
          type="button"
          @click="settingsStore.updatePhilosophy(opt.value)"
          class="text-left border rounded-2xl p-5 cursor-pointer transition-all duration-200 space-y-2.5 select-none shadow-md relative overflow-hidden"
          :class="settingsStore.philosophy === opt.value
            ? 'border-terminal-accent bg-terminal-accent/15 shadow-terminal-accent/20 ring-1 ring-terminal-accent/40'
            : 'border-white/10 sw-glass-card hover:border-terminal-accent/50 hover:bg-white/5'"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="font-sans font-bold text-lg text-white">{{ opt.label }}</span>
            <span
              v-if="settingsStore.philosophy === opt.value"
              class="shrink-0 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-terminal-accent/20 text-terminal-accent border border-terminal-accent/40 uppercase tracking-wider"
            >● ACTIV</span>
          </div>
          <p class="text-sm text-gray-400 leading-relaxed font-sans">{{ opt.desc }}</p>
        </button>
      </div>
    </section>

    <!-- ── Temă Vizuală ───────────────────────────────────────────────── -->
    <section class="space-y-4">
      <div class="flex items-center gap-3 border-b border-white/8 pb-3">
        <span class="text-xl">🎨</span>
        <h2 class="text-lg font-sans font-bold uppercase tracking-wide text-gray-100">
          Temă Interfață
        </h2>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          @click="themeStore.setMode('dark')"
          class="text-left border rounded-2xl p-5 cursor-pointer transition-all duration-200 space-y-2.5 shadow-md"
          :class="themeStore.mode === 'dark'
            ? 'border-sky-500 bg-sky-500/10 ring-1 ring-sky-500/30'
            : 'border-white/10 sw-glass-card hover:border-sky-500/50'"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="font-sans font-bold text-lg text-white">🌑 iOS 26 Dark</span>
            <span v-if="themeStore.mode === 'dark'" class="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 uppercase">ACTIV</span>
          </div>
          <p class="text-sm text-gray-400 leading-relaxed">Obsidian Aurora — fond pur negru, glass surfaces, accente iOS blue.</p>
        </button>

        <button
          type="button"
          @click="themeStore.setMode('light')"
          class="text-left border rounded-2xl p-5 cursor-pointer transition-all duration-200 space-y-2.5 shadow-md"
          :class="themeStore.mode === 'light'
            ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/30'
            : 'border-white/10 sw-glass-card hover:border-amber-500/50'"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="font-sans font-bold text-lg text-white">🌤 iOS 26 Light</span>
            <span v-if="themeStore.mode === 'light'" class="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">ACTIV</span>
          </div>
          <p class="text-sm text-gray-400 leading-relaxed">Frosted Pearl — fundal F2F2F7, sticlă albă frosted, accente #007AFF.</p>
        </button>
      </div>
    </section>

    <!-- ── Limbă / Language ───────────────────────────────────────────── -->
    <section class="space-y-4">
      <div class="flex items-center gap-3 border-b border-white/8 pb-3">
        <span class="text-xl">🌐</span>
        <h2 class="text-lg font-sans font-bold uppercase tracking-wide text-gray-100">
          {{ t('settings.language') }}
        </h2>
      </div>
      <div class="sw-glass-card border border-white/10 rounded-2xl overflow-hidden shadow-md">
        <div class="flex items-center justify-between px-5 py-4 gap-4">
          <div class="min-w-0">
            <div class="text-base font-sans font-semibold text-gray-200">{{ t('settings.language') }}</div>
            <div class="text-sm text-gray-500 mt-0.5 font-sans">{{ t('settings.languageDesc') }}</div>
          </div>
          <select
            :value="currentLocale"
            @change="onLocaleChange"
            class="min-w-[180px] bg-terminal-bg border border-white/15 rounded-xl px-3.5 py-2.5 text-base font-sans font-semibold text-gray-100 focus:outline-none focus:border-terminal-accent transition-colors cursor-pointer"
          >
            <option v-for="loc in supportedLocales" :key="loc.code" :value="loc.code">
              {{ loc.flag }} {{ loc.name }}
            </option>
          </select>
        </div>
      </div>
    </section>

    <!-- ── Preferințe Generale ────────────────────────────────────────── -->
    <section class="space-y-4">
      <div class="flex items-center gap-3 border-b border-white/8 pb-3">
        <span class="text-xl">⚙️</span>
        <h2 class="text-lg font-sans font-bold uppercase tracking-wide text-gray-100">
          Preferințe Generale
        </h2>
      </div>
      <div class="sw-glass-card border border-white/10 rounded-2xl overflow-hidden shadow-md divide-y divide-white/5">
        <!-- Currency -->
        <div class="flex items-center justify-between px-5 py-4 gap-4">
          <div class="min-w-0">
            <div class="text-base font-sans font-semibold text-gray-200">{{ t('settings.currency') }}</div>
            <div class="text-sm text-gray-500 mt-0.5 font-sans">Valuta de referință pentru portofoliu</div>
          </div>
          <select
            v-model="settingsStore.referenceCurrency"
            @change="handleSaveSettings"
            class="bg-terminal-bg border border-white/15 rounded-xl px-3 py-2.5 text-base font-mono font-bold text-gray-100 focus:outline-none focus:border-terminal-accent transition-colors shrink-0"
          >
            <option value="RON">RON</option>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
          </select>
        </div>

        <!-- Tax Residency -->
        <div class="flex items-center justify-between px-5 py-4 gap-4">
          <div class="min-w-0">
            <div class="text-base font-sans font-semibold text-gray-200">{{ t('settings.taxResidency') }}</div>
            <div class="text-sm text-gray-500 mt-0.5 font-sans">Afectează calculul impozitului pe dividende</div>
          </div>
          <select
            v-model="settingsStore.taxCountry"
            @change="handleSaveSettings"
            class="bg-terminal-bg border border-white/15 rounded-xl px-3 py-2.5 text-base font-mono font-bold text-gray-100 focus:outline-none focus:border-terminal-accent transition-colors shrink-0"
          >
            <option value="RO">🇷🇴 RO — 10%</option>
            <option value="US">🇺🇸 US — 15% W-8BEN</option>
            <option value="UK">🇬🇧 UK — 0%</option>
            <option value="DE">🇩🇪 DE — 26.4%</option>
            <option value="FR">🇫🇷 FR — 12.8%</option>
          </select>
        </div>

        <!-- Broker -->
        <div class="flex items-center justify-between px-5 py-4 gap-4">
          <div class="min-w-0">
            <div class="text-base font-sans font-semibold text-gray-200">{{ t('settings.preferredBroker') }}</div>
            <div class="text-sm text-gray-500 mt-0.5 font-sans">Brokerul preferat pentru tranzacții</div>
          </div>
          <select
            v-model="settingsStore.preferredBroker"
            @change="handleSaveSettings"
            class="bg-terminal-bg border border-white/15 rounded-xl px-3 py-2.5 text-base font-mono font-bold text-gray-100 focus:outline-none focus:border-terminal-accent transition-colors shrink-0"
          >
            <option value="TRADEVILLE">TradeVille</option>
            <option value="IBKR">IBKR</option>
            <option value="XTB">XTB</option>
            <option value="XTX">XTX</option>
          </select>
        </div>

        <!-- Projection Years -->
        <div class="flex items-center justify-between px-5 py-4 gap-4">
          <div class="min-w-0">
            <div class="text-base font-sans font-semibold text-gray-200">Proiecție Dividende</div>
            <div class="text-sm text-gray-500 mt-0.5 font-sans">Orizont de timp (ani)</div>
          </div>
          <div class="shrink-0 w-24">
            <AppInput
              type="number"
              :model-value="settingsStore.dividendProjectionEndYear - new Date().getFullYear()"
              @update:model-value="val => { settingsStore.dividendProjectionEndYear = new Date().getFullYear() + Number(val); handleSaveSettings(); }"
              monospace
            />
          </div>
        </div>
      </div>
    </section>

    <!-- ── Date de Piață ──────────────────────────────────────────────── -->
    <section class="space-y-4">
      <div class="flex items-center gap-3 border-b border-white/8 pb-3">
        <span class="text-xl">📊</span>
        <h2 class="text-lg font-sans font-bold uppercase tracking-wide text-gray-100">
          Date de Piață
        </h2>
      </div>

      <!-- Tax rates subsection -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-base font-sans font-semibold text-gray-200">{{ t('settings.taxRatesTitle') }}</div>
            <div class="text-sm text-gray-500 font-sans mt-0.5">{{ t('settings.taxRatesSubtitle') }}</div>
          </div>
          <AppButton variant="outline" size="sm" @click="handleRefreshTaxRates" :loading="refreshingTax">
            {{ t('settings.refreshTaxBtn') }}
          </AppButton>
        </div>
        <div class="border border-white/10 rounded-2xl overflow-x-auto sw-glass-card shadow-md">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-white/10 bg-white/3 text-gray-400 uppercase text-xs tracking-wider font-bold font-mono">
                <th class="px-4 py-3">Cod</th>
                <th class="px-4 py-3">Țară</th>
                <th class="px-4 py-3 text-right">WHT %</th>
                <th class="px-4 py-3 hidden sm:table-cell">Note</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5">
              <tr v-for="tax in taxRates" :key="tax.countryCode" class="hover:bg-white/4 transition-colors">
                <td class="px-4 py-3 font-mono font-bold text-base text-gray-100">{{ tax.countryCode }}</td>
                <td class="px-4 py-3 font-sans text-base text-gray-300">{{ getCountryName(tax.countryCode) }}</td>
                <td class="px-4 py-3 text-right font-mono font-bold text-lg text-emerald-400">{{ cleanDecimal(tax.ratePercent, 3) }}%</td>
                <td class="px-4 py-3 font-sans text-sm text-gray-500 hidden sm:table-cell">{{ tax.notes || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Exchange rates subsection -->
      <div class="space-y-2 pt-2">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-base font-sans font-semibold text-gray-200">Cursuri Valutare</div>
            <div class="text-sm text-gray-500 font-sans mt-0.5">Curs față de RON — sursă: Frankfurter / ECB</div>
          </div>
          <AppButton variant="outline" size="sm" @click="handleRefreshExchangeRates" :loading="refreshingFx">
            Refresh Cursuri
          </AppButton>
        </div>
        <div class="border border-white/10 rounded-2xl overflow-x-auto sw-glass-card shadow-md">
          <table v-if="exchangeRates.length > 0" class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-white/10 bg-white/3 text-gray-400 uppercase text-xs tracking-wider font-bold font-mono">
                <th class="px-4 py-3">Valută</th>
                <th class="px-4 py-3 hidden sm:table-cell">Denumire</th>
                <th class="px-4 py-3 text-right">1 → RON</th>
                <th class="px-4 py-3 hidden md:table-cell">Data</th>
                <th class="px-4 py-3 hidden md:table-cell">Sursă</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5">
              <tr v-for="rate in exchangeRates" :key="rate.currency" class="hover:bg-white/4 transition-colors">
                <td class="px-4 py-3 font-mono font-bold text-base text-gray-100">{{ rate.currency }}</td>
                <td class="px-4 py-3 font-sans text-base text-gray-300 hidden sm:table-cell">{{ getCurrencyName(rate.currency) }}</td>
                <td class="px-4 py-3 text-right font-mono font-bold text-lg text-terminal-accent">{{ cleanDecimal(rate.rateToRon, 4) }}</td>
                <td class="px-4 py-3 font-mono text-sm text-gray-500 hidden md:table-cell">{{ rate.rateDate }}</td>
                <td class="px-4 py-3 font-sans text-sm text-gray-500 hidden md:table-cell">{{ rate.source }}</td>
              </tr>
            </tbody>
          </table>
          <div v-else class="px-4 py-8 text-center text-base font-mono text-gray-500">
            Niciun curs — apasă <span class="text-terminal-accent font-bold">Refresh Cursuri</span> pentru a aduce datele ECB.
          </div>
        </div>
      </div>
    </section>

    <!-- ── Surse Date Ticker ──────────────────────────────────────────── -->
    <DataSourcesSection />

    <!-- ── Finanțe Personale ─────────────────────────────────────────── -->
    <FinancesSettingsSection />

    <!-- ── Notificări Push ───────────────────────────────────────────── -->
    <WebPushSection />

    <!-- ── Admin ─────────────────────────────────────────────────────── -->
    <AdminUsersSection />

    <!-- ── Aplicație & Cont ──────────────────────────────────────────── -->
    <section class="space-y-4">
      <div class="flex items-center gap-3 border-b border-white/8 pb-3">
        <span class="text-lg">👤</span>
        <h2 class="text-base font-sans font-bold uppercase tracking-wide text-gray-100">
          Cont & Aplicație
        </h2>
      </div>
      <div class="sw-glass-card border border-white/10 rounded-2xl overflow-hidden shadow-md divide-y divide-white/5">
        <!-- PWA Install -->
        <div class="flex items-center justify-between px-5 py-4 gap-4">
          <div class="flex items-center gap-3 min-w-0">
            <span class="text-xl shrink-0">🖥️</span>
            <div class="min-w-0">
              <div class="text-sm font-sans font-semibold text-gray-200">Instalează Aplicația</div>
              <div class="text-xs text-gray-500 mt-0.5 font-sans">
                <span v-if="pwaInstalled" class="text-emerald-400">✓ Instalată pe acest dispozitiv</span>
                <span v-else>Adaugă Sidwell Terminal pe desktop ca PWA</span>
              </div>
            </div>
          </div>
          <AppButton variant="outline" size="sm" @click="handleInstallPwa" class="shrink-0">
            {{ pwaInstalled ? '✓ Instalat' : 'Instalează' }}
          </AppButton>
        </div>
        <!-- Sign Out -->
        <div class="flex items-center justify-between px-5 py-4 gap-4">
          <div class="flex items-center gap-3 min-w-0">
            <span class="text-xl shrink-0">🔐</span>
            <div class="min-w-0">
              <div class="text-sm font-sans font-semibold text-gray-200">{{ t('settings.loggedInAs') }}</div>
              <div class="text-sm font-mono font-bold text-terminal-accent mt-0.5 truncate">{{ authStore.user?.email || 'Alex Sidwell' }}</div>
            </div>
          </div>
          <AppButton variant="danger" size="sm" @click="authStore.logout" class="shrink-0">
            {{ t('settings.signOut') }}
          </AppButton>
        </div>
      </div>
    </section>
  </div>
</template>
