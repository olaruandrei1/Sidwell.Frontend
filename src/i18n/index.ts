import { createI18n } from 'vue-i18n';
import { ro } from './locales/ro';
import { en } from './locales/en';
import { de } from './locales/de';
import { fr } from './locales/fr';
import { da } from './locales/da';

export type LocaleCode = 'ro' | 'en' | 'de' | 'fr' | 'da';

export interface SupportedLocale {
  code: LocaleCode;
  name: string;
  flag: string;
}

export const supportedLocales: SupportedLocale[] = [
  { code: 'ro', name: 'Română', flag: '🇷🇴' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'da', name: 'Dansk', flag: '🇩🇰' }
];

const savedLocale = (typeof window !== 'undefined' && localStorage.getItem('sidwell_locale')) as LocaleCode | null;
const defaultLocale: LocaleCode = savedLocale && ['ro', 'en', 'de', 'fr', 'da'].includes(savedLocale) ? savedLocale : 'ro';

export const i18n = createI18n({
  legacy: false,
  locale: defaultLocale,
  fallbackLocale: 'en',
  messages: {
    ro,
    en,
    de,
    fr,
    da
  }
});

export function setAppLocale(lang: LocaleCode) {
  if (['ro', 'en', 'de', 'fr', 'da'].includes(lang)) {
    (i18n.global.locale as { value: LocaleCode }).value = lang;
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidwell_locale', lang);
    }
  }
}
