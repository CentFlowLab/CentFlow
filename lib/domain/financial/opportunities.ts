import type { FinancialMetrics } from './metrics';
import type { FinancialInsight, FinancialState } from './financial-state.types';
import type { FinancialSuggestion } from './suggestions';

import { isCardCredit } from '@/lib/credit/credit-type.utils';
import { formatMoney } from './money';
import { buildFinancialSuggestions } from './suggestions';

export type BuildOpportunitiesInput = Pick<
  FinancialState,
  | 'accounts'
  | 'credits'
  | 'creditCards'
  | 'availableThisMonth'
  | 'cashFlow'
  | 'metrics'
  | 'goalProgress'
  | 'subscriptions'
  | 'investmentSummary'
>;

/** Motor de oportunidades — insights acionáveis baseados em dados reais. */
export function buildFinancialOpportunities(input: BuildOpportunitiesInput): {
  insights: FinancialInsight[];
  suggestions: FinancialSuggestion[];
} {
  const insights: FinancialInsight[] = [];
  const { metrics, cashFlow, subscriptions, creditCards, goalProgress } = input;

  if (input.availableThisMonth < 0) {
    insights.push({
      id: 'opp-negative-budget',
      title: 'Orçamento negativo',
      description: `O disponível deste mês (${formatMoney(input.availableThisMonth)}) está abaixo de zero.`,
      severity: 'warning',
      dataUsed: [`Disponível: ${formatMoney(input.availableThisMonth)}`],
    });
  }

  if (metrics.subscriptionLoad >= 15) {
    insights.push({
      id: 'opp-subscription-load',
      title: 'Subscrições pesadas',
      description: `As despesas recorrentes representam ${metrics.subscriptionLoad.toFixed(0)}% do teu rendimento.`,
      severity: 'warning',
      dataUsed: [
        `${formatMoney(subscriptions.monthlyTotal)}/mês em subscrições`,
        `Rendimento: ${formatMoney(cashFlow.monthlyIncome)}`,
      ],
    });
  }

  for (const card of creditCards) {
    if (card.utilizationPercent != null && card.utilizationPercent >= 80) {
      insights.push({
        id: `opp-card-util-${card.credit.id}`,
        title: 'Cartão perto do limite',
        description: `"${card.credit.name}" já usa ${card.utilizationPercent.toFixed(0)}% do limite.`,
        severity: 'warning',
        dataUsed: [
          `Dívida: ${formatMoney(card.debt)}`,
          card.limit ? `Limite: ${formatMoney(card.limit)}` : '',
        ].filter(Boolean),
      });
    }
  }

  if (metrics.emergencyMonths >= 0 && metrics.emergencyMonths < 1) {
    insights.push({
      id: 'opp-emergency-fund',
      title: 'Fundo de emergência curto',
      description:
        metrics.emergencyMonths === 0
          ? 'O disponível não cobre um mês de despesas fixas (subscrições e prestações).'
          : `O disponível cobre cerca de ${metrics.emergencyMonths.toFixed(1)} meses de despesas fixas.`,
      severity: 'warning',
      dataUsed: [`Disponível: ${formatMoney(input.availableThisMonth)}`],
    });
  }

  if (metrics.expenseConcentration >= 40) {
    insights.push({
      id: 'opp-expense-concentration',
      title: 'Gastos concentrados',
      description: `Uma categoria representa ${metrics.expenseConcentration.toFixed(0)}% dos gastos do mês.`,
      severity: 'info',
    });
  }

  const belowTargetGoals = goalProgress.filter((g) => !g.isComplete && g.percent < 50);
  if (belowTargetGoals.length > 0 && cashFlow.monthlyIncome > 0) {
    insights.push({
      id: 'opp-goal-pace',
      title: 'Objetivos abaixo da meta',
      description: `${belowTargetGoals.length} objetivo(s) abaixo de 50% — revê o ritmo de poupança.`,
      severity: 'info',
    });
  }

  if (
    input.investmentSummary.totalBalance > 500 &&
    input.availableThisMonth > input.investmentSummary.totalBalance * 0.3
  ) {
    insights.push({
      id: 'opp-idle-cash',
      title: 'Dinheiro parado',
      description: 'Tens liquidez acima do necessário nas contas de gasto corrente.',
      severity: 'info',
      dataUsed: [
        `Disponível: ${formatMoney(input.availableThisMonth)}`,
        `Investido: ${formatMoney(input.investmentSummary.totalBalance)}`,
      ],
    });
  }

  const loanCredits = input.credits.filter((c) => !isCardCredit(c.creditType));
  const suggestions = buildFinancialSuggestions({
    accounts: input.accounts,
    credits: loanCredits,
    monthlyAvailable: input.availableThisMonth,
  });

  return { insights, suggestions };
}
