import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/keys';
import { mockPricesData } from '@/lib/data/prices.mocks';

async function fetchPricesData() {
  await new Promise((resolve) => setTimeout(resolve, 280));
  return mockPricesData;
}

export function usePricesData() {
  return useQuery({
    queryKey: queryKeys.prices,
    queryFn: fetchPricesData,
  });
}
