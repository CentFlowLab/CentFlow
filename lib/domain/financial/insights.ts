import type { FinancialPeriod } from './dates';
import type { CategoryTotal } from './domain-types';
import { roundMoney } from './money';
import { groupTransactionsByCategory } from './transactions';

export type InsightSeverity = 'positive' | 'neutral' | 'warning' | 'critical';

export type AnalysisInsight = {
  title: string;
  message: string;
  severity: InsightSeverity;
  actionLabel?: string;
  metric?: string;
  reason?: string;
};

export function buildCategoryOverspendInsight(input: {
  category: CategoryTotal;
  currentTotal: number;
  averageTotal: number;
  periodLabel: string;
  dailyRecovery?: number;
}): AnalysisInsight | null {
  if (input.averageTotal <= 0 || input.currentTotal <= input.averageTotal) return null;

  const overshootPercent = roundMoney(
    ((input.currentTotal - input.averageTotal) / input.averageTotal) * 100,
  );

  const recoveryHint =
    input.dailyRecovery && input.dailyRecovery > 0
      ? ` Se reduzires ${input.dailyRecovery.toFixed(0)}€/dia até ao fim do mês, recuperas o orçamento.`
      : '';

  return {
    title: `${input.category.label} acima da média`,
    message: `${input.category.label} está ${overshootPercent}% acima da tua média ${input.periodLabel}.${recoveryHint}`,
    severity: overshootPercent >= 30 ? 'warning' : 'neutral',
    metric: `${roundMoney(input.currentTotal)}€`,
    reason: `Média habitual: ${roundMoney(input.averageTotal)}€`,
  };
}

export function compareCategoryPeriods(
  transactions: Parameters<typeof groupTransactionsByCategory>[0],
  current: FinancialPeriod,
  previous: FinancialPeriod,
): Array<{ category: CategoryTotal; delta: number; deltaPercent: number | null }> {
  const currentMap = new Map(
    groupTransactionsByCategory(transactions, current).map((item) => [item.key, item]),
  );
  const previousMap = new Map(
    groupTransactionsByCategory(transactions, previous).map((item) => [item.key, item]),
  );

  const keys = new Set([...currentMap.keys(), ...previousMap.keys()]);
  return [...keys].map((key) => {
    const currentItem = currentMap.get(key) ?? { key, label: key, amount: 0 };
    const previousAmount = previousMap.get(key)?.amount ?? 0;
    const delta = roundMoney(currentItem.amount - previousAmount);
    const deltaPercent =
      previousAmount > 0 ? roundMoney((delta / previousAmount) * 100) : null;
    return { category: currentItem, delta, deltaPercent };
  });
}
