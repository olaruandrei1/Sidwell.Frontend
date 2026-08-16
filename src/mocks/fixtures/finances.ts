import type {
  FinanceCategoryDef,
  ExpenseItemDto,
  WealthAllocationDto,
  FinanceSettingsDto
} from '../../shared/api/types';

export const defaultFinanceCategories: FinanceCategoryDef[] = [
  // Rate (Loans)
  { id: 'cat-loan-cc', name: 'Credit Card', type: 'LOAN', isDefault: true },
  { id: 'cat-loan-np', name: 'Nevoi Personale', type: 'LOAN', isDefault: true },
  { id: 'cat-loan-ipo', name: 'Ipotecar', type: 'LOAN', isDefault: true },

  // Abonamente (Subscriptions)
  { id: 'cat-sub-claude', name: 'Anthropic Claude Pro', type: 'SUBSCRIPTION', isDefault: true },
  { id: 'cat-sub-esx', name: 'ESX / Fitness Pass', type: 'SUBSCRIPTION', isDefault: true },
  { id: 'cat-sub-gpt', name: 'ChatGPT Plus', type: 'SUBSCRIPTION', isDefault: true },
  { id: 'cat-sub-media', name: 'Netflix / Spotify / YouTube', type: 'SUBSCRIPTION', isDefault: true },
  { id: 'cat-sub-cloud', name: 'Apple iCloud / Google One', type: 'SUBSCRIPTION', isDefault: true },

  // Utilități (Utilities)
  { id: 'cat-util-engie-el', name: 'Engie - Electricitate', type: 'UTILITY', isDefault: true },
  { id: 'cat-util-engie-gas', name: 'Engie - Gaze naturale', type: 'UTILITY', isDefault: true },
  { id: 'cat-util-hidro', name: 'Hidroelectrica - Energie', type: 'UTILITY', isDefault: true },
  { id: 'cat-util-water', name: 'Apa Nova / Salubritate', type: 'UTILITY', isDefault: true },
  { id: 'cat-util-net', name: 'Digi / Orange Telecom', type: 'UTILITY', isDefault: true },

  // Mâncare (Food)
  { id: 'cat-food-market', name: 'Mâncare (Supermarket / Mega / Lidl)', type: 'FOOD', isDefault: true },
  { id: 'cat-food-dine', name: 'Restaurant / Delivery (Glovo / Tazz)', type: 'FOOD', isDefault: true },

  // Țigări (Cigarettes)
  { id: 'cat-cig', name: 'Cigarettes (Țigări / Tutun)', type: 'CIGARETTES', isDefault: true },

  // Altele (Other)
  { id: 'cat-other-misc', name: 'Altele (Cheltuieli neprevăzute / Diverse)', type: 'OTHER', isDefault: true }
];

export const defaultBanks: string[] = [
  'Banca Transilvania',
  'ING Bank',
  'BCR',
  'Revolut',
  'Salt Bank'
];

export const defaultBrokers: string[] = [
  'TradeVille',
  'XTB',
  'IBKR'
];

export const mockFinanceSettings: FinanceSettingsDto = {
  monthlyIncome: {
    amount: '24500.00',
    currency: 'RON'
  },
  categories: [...defaultFinanceCategories],
  banks: [...defaultBanks],
  brokers: [...defaultBrokers]
};

export const mockExpenses: ExpenseItemDto[] = [
  // Rate (with interest rate %)
  {
    id: 'exp-101',
    name: 'Credit Ipotecar Apartament',
    category: 'Ipotecar',
    amount: '2850.00',
    currency: 'RON',
    type: 'LOAN',
    status: 'PAID',
    dueDate: '2026-10-10',
    interestRatePct: '5.89',
    createdAt: '2026-10-01T08:00:00Z'
  },
  {
    id: 'exp-102',
    name: 'Rată Nevoi Personale',
    category: 'Nevoi Personale',
    amount: '640.00',
    currency: 'RON',
    type: 'LOAN',
    status: 'PAID',
    dueDate: '2026-10-15',
    interestRatePct: '8.90',
    createdAt: '2026-10-02T10:00:00Z'
  },

  // Abonamente
  {
    id: 'exp-201',
    name: 'Anthropic Claude Pro Subscription',
    category: 'Anthropic Claude Pro',
    amount: '105.00',
    currency: 'RON',
    type: 'SUBSCRIPTION',
    status: 'PAID',
    dueDate: '2026-10-05',
    createdAt: '2026-10-01T12:00:00Z'
  },
  {
    id: 'exp-202',
    name: 'ESX Fitness Pass ALL-IN',
    category: 'ESX / Fitness Pass',
    amount: '190.00',
    currency: 'RON',
    type: 'SUBSCRIPTION',
    status: 'PAID',
    dueDate: '2026-10-07',
    createdAt: '2026-10-01T14:00:00Z'
  },
  {
    id: 'exp-203',
    name: 'iCloud 2TB & Google One',
    category: 'Apple iCloud / Google One',
    amount: '55.00',
    currency: 'RON',
    type: 'SUBSCRIPTION',
    status: 'PAID',
    dueDate: '2026-10-12',
    createdAt: '2026-10-01T16:00:00Z'
  },

  // Utilități
  {
    id: 'exp-301',
    name: 'Engie - Factură Gaze naturale',
    category: 'Engie - Gaze naturale',
    amount: '240.50',
    currency: 'RON',
    type: 'UTILITY',
    status: 'PAID',
    dueDate: '2026-10-18',
    createdAt: '2026-10-05T09:00:00Z'
  },
  {
    id: 'exp-302',
    name: 'Engie - Energie Electrică',
    category: 'Engie - Electricitate',
    amount: '185.00',
    currency: 'RON',
    type: 'UTILITY',
    status: 'DUE',
    dueDate: '2026-10-25',
    createdAt: '2026-10-08T11:00:00Z'
  },
  {
    id: 'exp-303',
    name: 'Digi - Pachet Fibră & Mobil Pro',
    category: 'Digi / Orange Telecom',
    amount: '85.00',
    currency: 'RON',
    type: 'UTILITY',
    status: 'PAID',
    dueDate: '2026-10-10',
    createdAt: '2026-10-03T10:00:00Z'
  },

  // Mâncare & Țigări (Variable expenses / Receipts)
  {
    id: 'exp-401',
    name: 'Mega Image - Bon Cumpărături Săptămânale',
    category: 'Mâncare (Supermarket / Mega / Lidl)',
    amount: '480.00',
    currency: 'RON',
    type: 'FOOD',
    status: 'PAID',
    createdAt: '2026-10-11T19:30:00Z'
  },
  {
    id: 'exp-402',
    name: 'OMV - Tutun & Cumpărături',
    category: 'Cigarettes (Țigări / Tutun)',
    amount: '160.00',
    currency: 'RON',
    type: 'CIGARETTES',
    status: 'PAID',
    createdAt: '2026-10-14T21:15:00Z'
  }
];

export const mockWealthAllocations: WealthAllocationDto[] = [
  {
    id: 'wealth-1',
    name: 'Depozit la Termen 12 Luni (BT)',
    institution: 'Banca Transilvania',
    institutionType: 'BANK',
    type: 'BANK_DEPOSIT',
    amount: '25000.00',
    currency: 'RON',
    interestRatePct: '6.25',
    notes: 'Scadență martie 2027 — fond de siguranță'
  },
  {
    id: 'wealth-2',
    name: 'Cont de Economii Salt Bank (Dobândă Zilnică)',
    institution: 'Salt Bank',
    institutionType: 'BANK',
    type: 'BANK_DEPOSIT',
    amount: '8500.00',
    currency: 'RON',
    interestRatePct: '3.00',
    notes: 'Acces instant pentru urgențe'
  },
  {
    id: 'wealth-3',
    name: 'TradeVille - Cash Disponibil Neinvestit',
    institution: 'TradeVille',
    institutionType: 'BROKER',
    type: 'BROKER_CASH',
    amount: '4200.00',
    currency: 'RON',
    notes: 'Pregătit pentru achiziții BVB (TLV, H2O)'
  },
  {
    id: 'wealth-4',
    name: 'IBKR - USD Idle Cash Buffer',
    institution: 'IBKR',
    institutionType: 'BROKER',
    type: 'BROKER_CASH',
    amount: '1500.00',
    currency: 'USD',
    notes: 'În așteptarea oportunităților S&P 500 / Tech'
  },
  {
    id: 'wealth-5',
    name: 'Alocare Lunară Recurentă — BVB & Global',
    institution: 'TradeVille',
    institutionType: 'BROKER',
    type: 'DCA_TARGET',
    amount: '5000.00',
    currency: 'RON',
    notes: 'Investiție DCA din venitul lunar net'
  }
];
