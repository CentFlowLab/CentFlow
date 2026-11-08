import type { IconName } from '@/ui/components';

/** Nome de cada ecrã dentro de src/app/(tabs)/. */
export type TabRouteName =
  | 'index'
  | 'transactions'
  | 'accounts'
  | 'budgets'
  | 'subscriptions'
  | 'goals'
  | 'wealth'
  | 'vehicles'
  | 'documents'
  | 'reports'
  | 'categories'
  | 'settings'
  | 'more';

export type NavKey =
  | 'dashboard'
  | 'transactions'
  | 'accounts'
  | 'budgets'
  | 'subscriptions'
  | 'goals'
  | 'wealth'
  | 'vehicles'
  | 'documents'
  | 'reports'
  | 'categories'
  | 'settings';

/** Áreas com descrição curta em `modules.*` (mostrada no ecrã "Mais"). */
export type DescribedArea = Exclude<NavKey, 'dashboard' | 'settings'>;

export function hasAreaDescription(key: NavKey): key is DescribedArea {
  return key !== 'dashboard' && key !== 'settings';
}

const IMPLEMENTED: readonly NavKey[] = [
  'dashboard',
  'transactions',
  'accounts',
  'budgets',
  'subscriptions',
  'goals',
  'reports',
  'categories',
  'settings',
];

/** Áreas com ecrã próprio ainda por implementar. */
export type PlannedModule = Exclude<
  DescribedArea,
  'transactions' | 'accounts' | 'categories' | 'budgets' | 'subscriptions' | 'goals' | 'reports'
>;

export function isPlannedModule(key: NavKey): key is PlannedModule {
  return !IMPLEMENTED.includes(key);
}

export type NavGroup = 'overview' | 'planning' | 'assets' | 'system';

export type NavItem = Readonly<{
  key: NavKey;
  route: Exclude<TabRouteName, 'more'>;
  href: string;
  icon: IconName;
  activeIcon: IconName;
  group: NavGroup;
  /** Aparece diretamente na barra inferior em telemóveis; os restantes ficam em "Mais". */
  mobilePrimary: boolean;
}>;

export const NAV_ITEMS: readonly NavItem[] = [
  {
    key: 'dashboard',
    route: 'index',
    href: '/',
    icon: 'home-outline',
    activeIcon: 'home',
    group: 'overview',
    mobilePrimary: true,
  },
  {
    key: 'transactions',
    route: 'transactions',
    href: '/transactions',
    icon: 'swap-vertical-outline',
    activeIcon: 'swap-vertical',
    group: 'overview',
    mobilePrimary: true,
  },
  {
    key: 'accounts',
    route: 'accounts',
    href: '/accounts',
    icon: 'wallet-outline',
    activeIcon: 'wallet',
    group: 'overview',
    mobilePrimary: false,
  },
  {
    key: 'budgets',
    route: 'budgets',
    href: '/budgets',
    icon: 'pie-chart-outline',
    activeIcon: 'pie-chart',
    group: 'planning',
    mobilePrimary: true,
  },
  {
    key: 'subscriptions',
    route: 'subscriptions',
    href: '/subscriptions',
    icon: 'repeat-outline',
    activeIcon: 'repeat',
    group: 'planning',
    mobilePrimary: false,
  },
  {
    key: 'goals',
    route: 'goals',
    href: '/goals',
    icon: 'flag-outline',
    activeIcon: 'flag',
    group: 'planning',
    mobilePrimary: false,
  },
  {
    key: 'reports',
    route: 'reports',
    href: '/reports',
    icon: 'bar-chart-outline',
    activeIcon: 'bar-chart',
    group: 'planning',
    mobilePrimary: false,
  },
  {
    key: 'wealth',
    route: 'wealth',
    href: '/wealth',
    icon: 'trending-up-outline',
    activeIcon: 'trending-up',
    group: 'assets',
    mobilePrimary: false,
  },
  {
    key: 'vehicles',
    route: 'vehicles',
    href: '/vehicles',
    icon: 'car-outline',
    activeIcon: 'car',
    group: 'assets',
    mobilePrimary: false,
  },
  {
    key: 'documents',
    route: 'documents',
    href: '/documents',
    icon: 'document-text-outline',
    activeIcon: 'document-text',
    group: 'assets',
    mobilePrimary: false,
  },
  {
    key: 'categories',
    route: 'categories',
    href: '/categories',
    icon: 'pricetags-outline',
    activeIcon: 'pricetags',
    group: 'system',
    mobilePrimary: false,
  },
  {
    key: 'settings',
    route: 'settings',
    href: '/settings',
    icon: 'settings-outline',
    activeIcon: 'settings',
    group: 'system',
    mobilePrimary: false,
  },
];

export const NEW_TRANSACTION_HREF = '/new-transaction';

export function getNavItem(key: NavKey): NavItem {
  const item = NAV_ITEMS.find((candidate) => candidate.key === key);
  if (!item) throw new Error(`Unknown nav item: ${key}`);
  return item;
}

export const MOBILE_PRIMARY_ITEMS = NAV_ITEMS.filter((item) => item.mobilePrimary);
export const MOBILE_SECONDARY_ITEMS = NAV_ITEMS.filter((item) => !item.mobilePrimary);

/** Na barra inferior, "Mais" fica ativo quando o ecrã atual não tem botão próprio. */
export function isMoreActive(activeRoute: string | undefined): boolean {
  if (!activeRoute) return false;
  return !MOBILE_PRIMARY_ITEMS.some((item) => item.route === activeRoute);
}
