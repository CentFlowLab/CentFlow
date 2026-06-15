import { isRealDataOnlyVariant } from '@/lib/config/app-variant';
import { shouldUseMockData } from '@/lib/config/data-mode';
import type { PricesData } from '@/lib/data/prices.mocks';
import { mockPricesData } from '@/lib/data/prices.mocks';

const EMPTY_PRICES: PricesData = {
  personalInflationPercent: 0,
  basketAverageChange: 0,
  trackedProducts: 0,
  periodLabel: 'Sem dados ainda',
  changes: [],
  insights: [],
};

/**
 * Dados de preços — em Beta/produção devolve vazio até haver tracking real.
 * Em desenvolvimento com mock, usa dados de demonstração.
 */
export async function fetchPricesData(): Promise<PricesData> {
  if (!isRealDataOnlyVariant() && shouldUseMockData()) {
    await new Promise((resolve) => setTimeout(resolve, 280));
    return mockPricesData;
  }

  return EMPTY_PRICES;
}
