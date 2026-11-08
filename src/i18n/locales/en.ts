import type { Translation } from './pt-PT';

const en: Translation = {
  app: {
    name: 'CentFlow',
    tagline: 'Your money, under control.',
  },
  common: {
    comingSoon: 'Coming soon',
    close: 'Close',
    retry: 'Try again',
  },
  nav: {
    mainNavigation: 'Main navigation',
    dashboard: 'Dashboard',
    transactions: 'Transactions',
    budgets: 'Budgets',
    subscriptions: 'Subscriptions',
    wealth: 'Net worth',
    vehicles: 'Vehicles',
    documents: 'Documents',
    reports: 'Reports',
    settings: 'Settings',
    more: 'More',
    newTransaction: 'New transaction',
    groups: {
      planning: 'Planning',
      assets: 'Assets and records',
    },
  },
  dashboard: {
    greeting: {
      morning: 'Good morning',
      afternoon: 'Good afternoon',
      evening: 'Good evening',
    },
    emptyTitle: 'Your dashboard is ready',
    emptyDescription:
      'Once you add accounts and transactions, your balance, income, expenses and savings will appear here, calculated from your own data.',
  },
  modules: {
    transactions: {
      description: 'Expenses, income and transfers between accounts, with search and filters.',
    },
    budgets: {
      description: 'Monthly limits per category and savings goals with progress tracking.',
    },
    subscriptions: {
      description: 'Recurring payments, upcoming dates and monthly and yearly cost.',
    },
    wealth: {
      description: 'Assets, liabilities, investments and how your net worth evolves.',
    },
    vehicles: {
      description: 'Fuel, maintenance, insurance and the real cost per kilometre.',
    },
    documents: {
      description: 'Invoices, receipts, contracts and warranties in a secure archive.',
    },
    reports: {
      description: 'Insights by period, category and trends over time.',
    },
  },
  more: {
    title: 'More',
    subtitle: 'Every area of CentFlow',
  },
  settings: {
    title: 'Settings',
    appearance: 'Appearance',
    theme: {
      system: 'System',
      light: 'Light',
      dark: 'Dark',
    },
    language: 'Language',
    languageSystem: 'Automatic',
    about: 'About',
    version: 'Version',
  },
  newTransaction: {
    title: 'New transaction',
    description: 'Quick entry for expenses, income and transfers will be available here.',
  },
  notFound: {
    title: 'Page not found',
    description: 'The address you opened does not exist or has been moved.',
    goHome: 'Back to home',
  },
  errors: {
    unexpectedTitle: 'Something went wrong',
    unexpectedDescription: 'An unexpected error occurred. Your data was not affected.',
  },
};

export default en;
