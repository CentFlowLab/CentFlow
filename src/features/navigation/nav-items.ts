import type { IconName } from '@/ui/components';

/** Nome de cada ecrã dentro de src/app/(tabs)/. */
export type TabRouteName =
  | 'index'
  | 'transactions'
  | 'budgets'
  | 'subscriptions'
  | 'wealth'
  | 'vehicles'
  | 'documents'
  | 'reports'
  | 'settings'
  | 'more';

export type NavKey =
  | 'dashboard'
  | 'transactions'
  | 'budgets'
  | 'subscriptions'
  | 'wealth'
  | 'vehicles'
  | 'documents'
  | 'reports'
  | 'settings';

/** Áreas com ecrã próprio ainda por implementar (têm descrição em `modules.*`). */
export type PlannedModule = Exclude<NavKey, 'dashboard' | 'settings'>;

export function isPlannedModule(key: NavKey): key is PlannedModule {
  return key !== 'dashboard' && key !== 'settings';
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
    icon: 'grid-outline',
    activeIcon: 'grid',
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
