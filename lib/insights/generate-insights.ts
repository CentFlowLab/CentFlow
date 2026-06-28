import { analyzeCredit } from '@/lib/credit/credit-analysis';
import { monthlySubscriptionTotal } from '@/lib/domain/financial/centflow-score';
import { formatCurrency } from '@/lib/utils/format';

import { computeMonthSpendingForecast } from './spending-forecast';
import {
  filterTransactionsInMonth,
  formatMonthLabelPt,
  monthKey,
  previousMonthKey,
  sumByType,
} from './month-utils';
import type { Insight, InsightInput } from './types';

const MIN_TRANSACTIONS = 3;

function categoryTotals(
  transactions: ReturnType<typeof filterTransactionsInMonth>,
): Map<string, { key: string; label: string; amount: number }> {
  const map = new Map<string, { key: string; label: string; amount: number }>();
  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    const current = map.get(tx.category) ?? {
      key: tx.category,
      label: tx.categoryLabel,
      amount: 0,
    };
    current.amount += tx.amount;
    map.set(tx.category, current);
  }
  return map;
}

function percentChange(prev: number, current: number): number {
  if (prev <= 0) return current > 0 ? 100 : 0;
  return ((current - prev) / prev) * 100;
}

function pickBalancedInsights(candidates: Insight[], max = 5): Insight[] {
  const sorted = [...candidates].sort((a, b) => b.priority - a.priority);
  const warnings = sorted.filter((i) => i.type === 'warning');
  const positives = sorted.filter((i) => i.type === 'positive');
  const others = sorted.filter((i) => i.type !== 'warning' && i.type !== 'positive');

  const picked: Insight[] = [];
  const used = new Set<string>();

  function take(list: Insight[]) {
    for (const item of list) {
      if (picked.length >= max) break;
      if (used.has(item.id)) continue;
      picked.push(item);
      used.add(item.id);
    }
  }

  take(warnings.slice(0, 2));
  take(positives.slice(0, 2));
  take([...others, ...warnings.slice(2), ...positives.slice(2), ...sorted]);

  if (picked.filter((i) => i.type === 'positive').length === 0 && positives[0]) {
    if (picked.length >= max) picked.pop();
    picked.unshift(positives[0]!);
  }

  return picked.slice(0, max);
}

export function generateInsights(input: InsightInput): Insight[] {
  const ref = input.referenceDate ?? new Date();
  const currentKey = monthKey(ref);
  const prevKey = previousMonthKey(currentKey);
  const monthTxs = filterTransactionsInMonth(input.transactions, currentKey, ref);
  const prevTxs = filterTransactionsInMonth(input.transactions, prevKey, ref);

  const candidates: Insight[] = [];

  if (monthTxs.length >= MIN_TRANSACTIONS) {
    const forecast = computeMonthSpendingForecast(
      input.transactions,
      input.monthlyIncome,
      input.monthlyBudget,
      ref,
    );

    if (
      forecast &&
      input.monthlyIncome > 0 &&
      forecast.projectedTotal > input.monthlyIncome
    ) {
      candidates.push({
        id: 'spending-pace',
        type: 'warning',
        icon: '⚠️',
        title: 'Ritmo de gasto elevado',
        body: `No ritmo actual vais gastar ${formatCurrency(forecast.projectedTotal)} até ao fim do mês.`,
        priority: 100,
        action: { label: 'Ver movimentos', route: '/(tabs)/movimentos' },
      });
    }

    const currentCats = categoryTotals(monthTxs);
    const prevCats = categoryTotals(prevTxs);

    for (const [key, current] of currentCats) {
      const prev = prevCats.get(key);
      if (!prev || prev.amount <= 0) continue;
      const change = percentChange(prev.amount, current.amount);
      const delta = current.amount - prev.amount;

      if (change > 15 && Math.abs(delta) > 50) {
        candidates.push({
          id: `cat-up-${key}`,
          type: 'warning',
          icon: '📈',
          title: `${current.label} em alta`,
          body: `Gastaste ${Math.round(change)}% mais em ${current.label} do que no mês passado.`,
          priority: 85,
          action: { label: 'Ver análises', route: '/(tabs)/analises' },
        });
      } else if (change < -15 && Math.abs(delta) > 50) {
        candidates.push({
          id: `cat-down-${key}`,
          type: 'positive',
          icon: '📉',
          title: `${current.label} em baixa`,
          body: `Gastaste ${Math.abs(Math.round(change))}% menos em ${current.label} do que no mês passado.`,
          priority: 70,
        });
      }
    }

    const expenses = monthTxs.filter((tx) => tx.type === 'expense');
    if (expenses.length > 0) {
      const biggest = [...expenses].sort((a, b) => b.amount - a.amount)[0]!;
      const label = biggest.description?.trim() || biggest.categoryLabel;
      candidates.push({
        id: 'biggest-expense',
        type: 'neutral',
        icon: 'ℹ️',
        title: 'Maior gasto do período',
        body: `O teu maior gasto foi ${label} — ${formatCurrency(biggest.amount)}.`,
        priority: 50,
      });
    }
  }

  const subMonthly = monthlySubscriptionTotal(input.subscriptions);
  if (input.subscriptions.length > 0 && subMonthly > 0) {
    candidates.push({
      id: 'subs-annual',
      type: 'tip',
      icon: '💡',
      title: 'Custo das subscrições',
      body: `As tuas subscrições custam ${formatCurrency(subMonthly)}/mês — ${formatCurrency(subMonthly * 12)}/ano.`,
      priority: 65,
      action: { label: 'Ver subscrições', route: '/(tabs)/movimentos?view=subscricoes' },
    });
  }

  for (const credit of input.credits ?? []) {
    const outstanding = credit.outstandingBalance ?? 0;
    if (outstanding <= 0) continue;
    const analysis = analyzeCredit({
      outstandingBalance: outstanding,
      originalAmount: credit.originalAmount,
      interestRateAnnual: credit.interestRateAnnual,
      indexRate: credit.indexRate,
      spread: credit.spread,
      termMonths: credit.termMonths,
      monthlyPayment: credit.monthlyPayment,
      nextPaymentAmount: credit.nextPaymentAmount,
    });
    const paidPrincipal = Math.max(
      0,
      (credit.originalAmount ?? outstanding) - outstanding,
    );
    const estimatedInterestPaid = Math.max(0, analysis.totalInterest * (paidPrincipal / Math.max(credit.originalAmount ?? 1, 1)));

    if (estimatedInterestPaid > 10) {
      candidates.push({
        id: `credit-interest-${credit.id}`,
        type: 'warning',
        icon: '⚠️',
        title: `Juros em ${credit.name}`,
        body: `Já pagaste aproximadamente ${formatCurrency(estimatedInterestPaid)} em juros neste crédito.`,
        priority: 90,
        action: { label: 'Ver créditos', route: '/(tabs)/precos' },
      });
      break;
    }
  }

  const primaryGoal = input.goals.find((g) => g.target > g.current) ?? input.goals[0];
  if (primaryGoal && monthTxs.length >= MIN_TRANSACTIONS && input.monthlyIncome > 0) {
    const gap = primaryGoal.target - primaryGoal.current;
    if (gap > 0) {
      const monthlySavings = input.monthlyIncome - input.monthlyExpenses;
      if (monthlySavings > 0) {
        const monthsToGoal = Math.ceil(gap / monthlySavings);
        const targetDate = new Date(ref);
        targetDate.setMonth(targetDate.getMonth() + monthsToGoal);
        const dateLabel = new Intl.DateTimeFormat('pt-PT', {
          month: 'long',
          year: 'numeric',
        }).format(targetDate);
        candidates.push({
          id: `goal-${primaryGoal.id}`,
          type: 'positive',
          icon: '🎯',
          title: 'Projeção do objetivo',
          body: `Se mantiveres o ritmo actual, atinges "${primaryGoal.name}" em ${dateLabel}.`,
          priority: 75,
          action: { label: 'Ver objetivos', route: '/(tabs)/ativos?tab=objetivos' },
        });
      }
    } else if (gap <= 0) {
      candidates.push({
        id: `goal-done-${primaryGoal.id}`,
        type: 'positive',
        icon: '🎯',
        title: 'Objetivo atingido',
        body: `Parabéns — "${primaryGoal.name}" está completo!`,
        priority: 78,
      });
    }
  }

  if (
    input.netWorthChangePercent != null &&
    input.netWorthChangePercent > 0 &&
    monthTxs.length >= MIN_TRANSACTIONS
  ) {
    const amountPart =
      input.netWorthChangeAmount != null
        ? ` (+${formatCurrency(input.netWorthChangeAmount)})`
        : '';
    candidates.push({
      id: 'networth-up',
      type: 'positive',
      icon: '✅',
      title: 'Património em crescimento',
      body: `O teu património aumentou ${input.netWorthChangePercent.toFixed(1).replace('.', ',')}% este mês${amountPart}.`,
      priority: 80,
    });
  }

  if (candidates.length === 0 && monthTxs.length < MIN_TRANSACTIONS) {
    return [];
  }

  return pickBalancedInsights(candidates, 5);
}

export { formatMonthLabelPt };
