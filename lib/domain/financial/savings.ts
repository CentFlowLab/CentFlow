import type { FinancialPeriod } from './dates';
import type { SavingsRateResult } from './domain-types';
import { roundMoney } from './money';
import { getExpenseTotal, getIncomeTotal } from './transactions';

export function calculateSavingsRate(income: number, expenses: number): SavingsRateResult {
  const safeIncome = roundMoney(income);
  const safeExpenses = roundMoney(expenses);
  const net = roundMoney(safeIncome - safeExpenses);

  if (safeIncome <= 0) {
    return {
      rate: null,
      income: safeIncome,
      expenses: safeExpenses,
      net,
      status: safeExpenses > 0 ? 'deficit' : 'no_income',
    };
  }

  const rate = roundMoney((net / safeIncome) * 100);

  return {
    rate,
    income: safeIncome,
    expenses: safeExpenses,
    net,
    status: net > 0 ? 'healthy' : net === 0 ? 'break_even' : 'deficit',
  };
}

export function calculateMonthlySavingsRate(
  transactions: Parameters<typeof getIncomeTotal>[0],
  monthKey: string,
  asOf: Date = new Date(),
): SavingsRateResult {
  const period: FinancialPeriod = { kind: 'month', monthKey, asOf };
  return calculateSavingsRate(
    getIncomeTotal(transactions, period),
    getExpenseTotal(transactions, period),
  );
}

export function compareSavingsRate(
  current: SavingsRateResult,
  targetRate: number,
): {
  delta: number | null;
  meetsTarget: boolean;
  message: string;
} {
  if (current.rate === null) {
    return {
      delta: null,
      meetsTarget: false,
      message: 'Sem rendimento registado neste período para calcular taxa de poupança.',
    };
  }

  const delta = roundMoney(current.rate - targetRate);
  return {
    delta,
    meetsTarget: current.rate >= targetRate,
    message:
      delta >= 0
        ? `Taxa de poupança ${current.rate}% — acima do alvo de ${targetRate}%.`
        : `Taxa de poupança ${current.rate}% — faltam ${Math.abs(delta)} p.p. para o alvo de ${targetRate}%.`,
  };
}
