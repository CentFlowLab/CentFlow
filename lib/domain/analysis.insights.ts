import type { AssetsData } from '@/lib/domain/assets.types';
import type { DashboardData } from '@/lib/domain';
import type { AnalysisInsight, AnalysisTrends } from '@/lib/domain/analysis.types';
import type { Transaction } from '@/lib/domain/transaction.types';
import { isTransactionOccurred } from '@/lib/domain/transaction-date.utils';
import { WARRANTY_CRITICAL_DAYS } from '@/lib/domain/warranty.utils';
import { daysUntil, formatCurrency, formatPercent } from '@/lib/utils/format';

type InsightInput = {
  dashboard: DashboardData;
  transactions: Transaction[];
  assets: AssetsData;
  trends: AnalysisTrends;
};

function parseDate(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

function isWithinLastDays(date: string, days: number, offsetDays = 0, asOf = new Date()): boolean {
  const target = parseDate(date);
  const end = new Date(asOf);
  end.setHours(23, 59, 59, 999);
  end.setDate(end.getDate() - offsetDays);

  const start = new Date(end);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  return target >= start && target <= end && isTransactionOccurred(date, asOf);
}

function sumExpensesByCategory(transactions: Transaction[], days: number, offsetDays = 0) {
  const totals = new Map<string, { label: string; amount: number }>();

  for (const tx of transactions) {
    if (tx.type !== 'expense' || !isWithinLastDays(tx.date, days, offsetDays)) continue;
    const current = totals.get(tx.category) ?? { label: tx.categoryLabel, amount: 0 };
    current.amount += tx.amount;
    totals.set(tx.category, current);
  }

  return totals;
}

export function generateAnalysisInsights(input: InsightInput): AnalysisInsight[] {
  const { dashboard, transactions, assets, trends } = input;
  const insights: AnalysisInsight[] = [];

  const change = dashboard.netWorthChangePercent;
  if (Math.abs(change) >= 0.5) {
    insights.push({
      id: 'net-worth-change',
      type: change >= 0 ? 'achievement' : 'warning',
      title: change >= 0 ? 'Património em alta' : 'Património em queda',
      description:
        change >= 0
          ? `O teu património cresceu ${formatPercent(change, 1, true)} desde o mês passado.`
          : `O teu património desceu ${formatPercent(Math.abs(change), 1, false)} desde o mês passado.`,
    });
  }

  const topCategory = trends.spendingByCategory[0];
  if (topCategory) {
    insights.push({
      id: 'top-spending-category',
      type: 'info',
      title: 'Maior gasto do período',
      description: `O teu maior gasto foi em ${topCategory.label} (${formatCurrency(topCategory.amount)} nos últimos ${trends.periodDays} dias).`,
    });
  }

  const currentWindow = sumExpensesByCategory(transactions, trends.periodDays, 0);
  const previousWindow = sumExpensesByCategory(transactions, trends.periodDays, trends.periodDays);

  for (const [category, current] of currentWindow.entries()) {
    const previous = previousWindow.get(category);
    if (!previous || previous.amount <= 0) continue;

    const deltaPercent = ((current.amount - previous.amount) / previous.amount) * 100;
    if (Math.abs(deltaPercent) < 12) continue;

    insights.push({
      id: `category-delta-${category}`,
      type: deltaPercent > 0 ? 'warning' : 'opportunity',
      title:
        deltaPercent > 0
          ? `Gastaste mais em ${current.label}`
          : `Gastaste menos em ${current.label}`,
      description:
        deltaPercent > 0
          ? `Gastaste ${formatPercent(deltaPercent, 0, false)} mais em ${current.label} este mês comparado com o período anterior.`
          : `Reduziste ${formatPercent(Math.abs(deltaPercent), 0, false)} em ${current.label} face ao período anterior.`,
    });
    break;
  }

  const expiringWarranties = assets.warranties.filter((warranty) => {
    const days = daysUntil(warranty.expiresAt);
    return days >= 0 && days <= WARRANTY_CRITICAL_DAYS;
  });

  if (expiringWarranties.length > 0) {
    insights.push({
      id: 'warranties-expiring',
      type: 'warning',
      title:
        expiringWarranties.length === 1
          ? '1 garantia a expirar em breve'
          : `${expiringWarranties.length} garantias a expirar em breve`,
      description: `Tens ${expiringWarranties.length} garantia${expiringWarranties.length === 1 ? '' : 's'} a expirar nos próximos ${WARRANTY_CRITICAL_DAYS} dias.`,
      actionLabel: 'Ver garantias',
    });
  }

  const featuredGoal = assets.goals
    .map((goal) => ({
      goal,
      percent: goal.target > 0 ? (goal.current / goal.target) * 100 : 0,
    }))
    .sort((a, b) => b.percent - a.percent)[0];

  if (featuredGoal && featuredGoal.percent >= 75) {
    insights.push({
      id: 'goal-progress',
      type: 'achievement',
      title: 'Objectivo quase concluído',
      description: `${featuredGoal.goal.name} está a ${formatPercent(featuredGoal.percent, 0, false)} — faltam ${formatCurrency(Math.max(0, featuredGoal.goal.target - featuredGoal.goal.current))}.`,
      actionLabel: 'Ver objetivos',
    });
  }

  if (trends.totalIncome > 0 && trends.netCashflow < 0) {
    insights.push({
      id: 'negative-cashflow',
      type: 'warning',
      title: 'Gastos acima das receitas',
      description: `Nos últimos ${trends.periodDays} dias gastaste ${formatCurrency(Math.abs(trends.netCashflow))} mais do que recebeste.`,
    });
  }

  return insights.slice(0, 5);
}
