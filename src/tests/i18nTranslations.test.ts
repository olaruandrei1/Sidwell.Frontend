import { describe, it, expect } from 'vitest';
import { ro } from '../i18n/locales/ro';
import { en } from '../i18n/locales/en';
import { de } from '../i18n/locales/de';
import { fr } from '../i18n/locales/fr';
import { da } from '../i18n/locales/da';

describe('i18n Multi-Language Support & Generic Enums', () => {
  const dictionaries = [
    { locale: 'ro', messages: ro },
    { locale: 'en', messages: en },
    { locale: 'de', messages: de },
    { locale: 'fr', messages: fr },
    { locale: 'da', messages: da }
  ];

  it('contains all 5 supported locales', () => {
    expect(dictionaries.length).toBe(5);
    const locales = dictionaries.map((d) => d.locale);
    expect(locales).toEqual(['ro', 'en', 'de', 'fr', 'da']);
  });

  dictionaries.forEach(({ locale, messages }) => {
    describe(`Locale: ${locale.toUpperCase()}`, () => {
      it('has complete navigation strings', () => {
        expect(messages.nav.dashboard).toBeDefined();
        expect(messages.nav.watchlist).toBeDefined();
        expect(messages.nav.alerts).toBeDefined();
        expect(messages.nav.settings).toBeDefined();
        expect(messages.nav.finances).toBeDefined();
      });

      it('has complete generic enum translations', () => {
        // Categories
        expect(messages.enums.LOAN).toBeDefined();
        expect(messages.enums.SUBSCRIPTION).toBeDefined();
        expect(messages.enums.UTILITY).toBeDefined();
        expect(messages.enums.FOOD).toBeDefined();
        expect(messages.enums.CIGARETTES).toBeDefined();
        expect(messages.enums.OTHER).toBeDefined();

        // Expense Statuses
        expect(messages.enums.UNPAID).toBeDefined();
        expect(messages.enums.PAID).toBeDefined();
        expect(messages.enums.PENDING).toBeDefined();

        // Allocation Types
        expect(messages.enums.DEPOSIT).toBeDefined();
        expect(messages.enums.BROKERAGE).toBeDefined();

        // Banks & Brokers
        expect(messages.enums.TRADEVILLE).toBeDefined();
        expect(messages.enums.XTB).toBeDefined();
        expect(messages.enums.IBKR).toBeDefined();
      });

      it('has complete finances module strings', () => {
        expect(messages.finances.title).toBeDefined();
        expect(messages.finances.subtitle).toBeDefined();
        expect(messages.finances.incomeSection).toBeDefined();
        expect(messages.finances.expensesSection).toBeDefined();
        expect(messages.finances.wealthSection).toBeDefined();
      });

      it('has complete settings module strings', () => {
        expect(messages.settings.title).toBeDefined();
        expect(messages.settings.subtitle).toBeDefined();
        expect(messages.settings.philosophy).toBeDefined();
        expect(messages.settings.currency).toBeDefined();
        expect(messages.settings.taxResidency).toBeDefined();
        expect(messages.settings.preferredBroker).toBeDefined();
        expect(messages.settings.projectionYears).toBeDefined();
      });

      it('has complete dashboard module strings', () => {
        expect(messages.dashboard.title).toBeDefined();
        expect(messages.dashboard.subtitle).toBeDefined();
        expect(messages.dashboard.netValue).toBeDefined();
        expect(messages.dashboard.topPositions).toBeDefined();
      });
    });
  });

  it('verifies Romanian (ro) specific financial labels', () => {
    expect(ro.enums.LOAN).toBe('Rată / Credit');
    expect(ro.enums.CIGARETTES).toBe('Țigări / Tutun');
    expect(ro.finances.title).toBe('Finanțe Personale & Alocare Portofoliu');
  });

  it('verifies English (en) specific financial labels', () => {
    expect(en.enums.LOAN).toBe('Loan / Installment');
    expect(en.enums.CIGARETTES).toBe('Cigarettes / Tobacco');
    expect(en.finances.title).toBe('Personal Finances & Wealth Allocation');
  });

  it('verifies German (de) specific financial labels', () => {
    expect(de.enums.LOAN).toBe('Kredit / Raten');
    expect(de.enums.CIGARETTES).toBe('Zigaretten / Tabak');
  });

  it('verifies French (fr) specific financial labels', () => {
    expect(fr.enums.LOAN).toBe('Prêt / Échéance');
    expect(fr.enums.CIGARETTES).toBe('Cigarettes / Tabac');
  });

  it('verifies Danish (da) specific financial labels', () => {
    expect(da.enums.LOAN).toBe('Lån / Afdrag');
    expect(da.enums.CIGARETTES).toBe('Cigaretter / Tobak');
  });
});
