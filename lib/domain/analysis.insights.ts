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

function periodPhrase(days: number): string {
  return `nos últimos ${days} dias`;
}

export function generateAnalysisInsights(input: InsightInput): AnalysisInsight[] {
  const { dashboard, transactions, assets, trends } = input;
  const insights: AnalysisInsight[] = [];
  const period = periodPhrase(trends.periodDays);

  const change = dashboard.netWorthChangePercent;
  if (Math.abs(change) >= 0.5) {
    insights.push({
      id: 'net-worth-change',
      type: change >= 0 ? 'achievement' : 'warning',
      title: change >= 0 ? 'Património em alta' : 'Património em queda',
      description:
        change >= 0
          ? `O teu património cresceu ${formatPercent(change, 1, true)} este mês — mantém o ritmo.`
          : `O teu património desceu ${formatPercent(Math.abs(change), 1, false)} este mês — revê os gastos fixos.`,
    });
  }

  if (trends.totalIncome > 0) {
    const savingsRate = (trends.netCashflow / trends.totalIncome) * 100;
    if (savingsRate >= 5) {
      insights.push({
        id: 'savings-rate-positive',
        type: 'achievement',
        title: 'Taxa de poupança positiva',
        description: `Poupaste ${formatPercent(savingsRate, 0, false)} das receitas ${period}. Considera transferir para um objetivo.`,
        actionLabel: 'Ver objetivos',
        actionRoute: '/(tabs)/ativos?tab=objetivos',
      });
    } else if (trends.netCashflow < 0) {
      insights.push({
        id: 'savings-rate-negative',
        type: 'warning',
        title: 'A gastar mais do que recebes',
        description: `Gastaste ${formatCurrency(Math.abs(trends.netCashflow))} acima das receitas ${period}. Revê as categorias com maior peso.`,
        actionLabel: 'Ver análises',
        actionRoute: '/(tabs)/analises',
      });
    }
  }

  const topCategory = trends.spendingByCategory[0];
  if (topCategory) {
    insights.push({
      id: 'top-spending-category',
      type: 'info',
      title: 'Maior gasto do período',
      description: `${topCategory.label} lidera com ${formatCurrency(topCategory.amount)} ${period} — vale a pena rever se faz sentido para ti.`,
    });
  }

  const currentWindow = sumExpensesByCategory(transactions, trends.periodDays, 0);
  const previousWindow = sumExpensesByCategory(transactions, trends.periodDays, trends.periodDays);
  const categoryDeltas: AnalysisInsight[] = [];

  for (const [category, current] of currentWindow.entries()) {
    const previous = previousWindow.get(category);
    if (!previous || previous.amount <= 0) continue;

    const deltaPercent = ((current.amount - previous.amount) / previous.amount) * 100;
    if (Math.abs(deltaPercent) < 12) continue;

    categoryDeltas.push({
      id: `category-delta-${category}`,
      type: deltaPercent > 0 ? 'warning' : 'opportunity',
      title:
        deltaPercent > 0
          ? `${current.label} aumentou ${formatPercent(deltaPercent, 0, false)}`
          : `${current.label} diminuiu ${formatPercent(Math.abs(deltaPercent), 0, false)}`,
      description:
        deltaPercent > 0
          ? `Gastaste mais em ${current.label} ${period} face ao período anterior — identifica 1–2 compras evitáveis.`
          : `Reduziste gastos em ${current.label} — mantém este hábito no próximo período.`,
      actionLabel: deltaPercent > 0 ? 'Ver movimentos' : undefined,
      actionRoute: deltaPercent > 0 ? `/(tabs)/movimentos?category=${category}` : undefined,
    });
  }

  categoryDeltas
    .sort((a, b) => (a.type === 'warning' ? -1 : 1))
    .slice(0, 2)
    .forEach((item) => insights.push(item));

  const monthlySubs = assets.subscriptions.reduce((sum, sub) => sum + sub.amount, 0);
  if (monthlySubs > 0 && trends.totalIncome > 0) {
    const subsShare = (monthlySubs / trends.totalIncome) * 100;
    if (subsShare >= 8) {
      insights.push({
        id: 'recurring-weight',
        type: 'warning',
        title: 'Despesas recorrentes pesadas',
        description: `As tuas despesas recorrentes representam ${formatPercent(subsShare, 0, false)} das receitas ${period} — revê cancelamentos possíveis.`,
        actionLabel: 'Ver recorrentes',
        actionRoute: '/(tabs)/movimentos?view=subscricoes',
      });
    }
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
      description: `Tens ${expiringWarranties.length} garantia${expiringWarranties.length === 1 ? '' : 's'} a expirar nos próximos ${WARRANTY_CRITICAL_DAYS} dias — verifica se precisas de acção.`,
      actionLabel: 'Ver garantias',
      actionRoute: '/(tabs)/ativos?tab=garantias',
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
      title: 'Objetivo quase concluído',
      description: `${featuredGoal.goal.name} está a ${formatPercent(featuredGoal.percent, 0, false)} — faltam ${formatCurrency(Math.max(0, featuredGoal.goal.target - featuredGoal.goal.current))}.`,
      actionLabel: 'Ver objetivos',
      actionRoute: '/(tabs)/ativos?tab=objetivos',
    });
  }

  if (trends.totalIncome > 0 && trends.netCashflow < 0 && !insights.some((i) => i.id === 'savings-rate-negative')) {
    insights.push({
      id: 'negative-cashflow',
      type: 'warning',
      title: 'Gastos acima das receitas',
      description: `${period} gastaste ${formatCurrency(Math.abs(trends.netCashflow))} mais do que recebeste — ajusta o orçamento nas próximas semanas.`,
    });
  }

  return insights.slice(0, 5);
}
