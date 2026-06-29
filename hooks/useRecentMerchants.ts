import { useMemo } from 'react';

import { useTransactions } from '@/hooks/queries/useTransactions';

const MAX_RECENT = 8;

/** Comerciantes distintos dos movimentos, ordenados por data (mais recente primeiro). */
export function useRecentMerchants(): string[] {
  const { data: transactions = [] } = useTransactions('all');

  return useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const tx of transactions) {
      const merchant = tx.merchant?.trim();
      if (!merchant) continue;

      const key = merchant.toLowerCase();
      if (seen.has(key)) continue;

      seen.add(key);
      result.push(merchant);
      if (result.length >= MAX_RECENT) break;
    }

    return result;
  }, [transactions]);
}
