import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/keys';
import { fetchPricesData } from '@/lib/api/services/prices.service';
import { useAuth } from '@/lib/auth';

export function usePricesData() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.prices,
    queryFn: fetchPricesData,
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });
}
