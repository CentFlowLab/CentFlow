import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/keys';
import { fetchFinancialProfile } from '@/lib/api/services/financial-profile.service';
import { useAuth } from '@/lib/auth';
import type { FinancialProfileResult } from '@/lib/domain/financial-profile.types';

export function useFinancialProfile() {
  const { isAuthenticated } = useAuth();

  return useQuery<FinancialProfileResult>({
    queryKey: queryKeys.financialProfile,
    queryFn: fetchFinancialProfile,
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2,
  });
}
