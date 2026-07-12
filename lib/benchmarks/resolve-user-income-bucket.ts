import type { Transaction } from '@/lib/domain/transaction.types';
import { getPreviousCompleteMonthKeys } from '@/lib/domain/financial/category-budgets';
import type { FinancialPeriod } from '@/lib/domain/financial/dates';
import { calculateMedian } from '@/lib/domain/financial/savings-margin';
import { getIncomeTotal } from '@/lib/domain/financial/transactions';

import { resolveIncomeBucketKey } from './income-buckets';

/** Estima faixa de rendimento a partir da mediana de receitas (últimos 3 meses completos). */
export function resolveUserIncomeBucketKey(
  transactions: Transaction[],
  asOf: Date = new Date(),
): string | null {
  const monthKeys = getPreviousCompleteMonthKeys(3, asOf);
  const incomes = monthKeys
    .map((monthKey) => {
      const period: FinancialPeriod = { kind: 'month', monthKey, asOf };
      return getIncomeTotal(transactions, period);
    })
    .filter((value) => value > 0);

  if (incomes.length < 2) return null;

  const incomeMedian = calculateMedian(incomes);
  return resolveIncomeBucketKey(incomeMedian);
}
