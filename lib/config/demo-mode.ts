import { isRealDataOnlyVariant } from '@/lib/config/app-variant';

import type { DataSource } from './data-mode';

/** Badge «Modo demonstração» — apenas em desenvolvimento com dados mock. */
export function shouldShowDemoBadge(dataSource: DataSource): boolean {
  if (isRealDataOnlyVariant()) return false;
  return dataSource === 'mock';
}
