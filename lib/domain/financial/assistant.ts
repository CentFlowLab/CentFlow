import type { CentFlowScoreResult } from './types';
import type { CentFlowScoreInput, DailyAssistantPlan, AssistantInsight } from './types';
import { calculateCentFlowScore } from './centflow-score';

type AssistantInput = CentFlowScoreInput & {
  firstName: string;
  subscriptionCount: number;
};

function buildSavingsTip(input: AssistantInput, score: CentFlowScoreResult): string | undefined {
  if (input.monthlySubscriptionCost >= 40 && input.monthlyIncome > 0) {
    const pct = Math.round((input.monthlySubscriptionCost / input.monthlyIncome) * 100);
    if (pct >= 8) {
      return `Podes poupar cerca de ${Math.round(input.monthlySubscriptionCost * 0.25)}€/mês revendo subscrições.`;
    }
  }
  if (score.breakdown.savings < 12 && input.monthlyExpenses > 0) {
    return 'Tenta reduzir 5% das despesas fixas este mês.';
  }
  return undefined;
}

export function buildDailyAssistantPlan(input: AssistantInput): DailyAssistantPlan {
  const score = calculateCentFlowScore(input);
  const insights: AssistantInsight[] = [];

  if (input.subscriptionsRenewingSoon > 0) {
    insights.push({
      id: 'renewals',
      emoji: '⚠️',
      title: `${input.subscriptionsRenewingSoon} subscrição${input.subscriptionsRenewingSoon > 1 ? 'ões' : ''} a renovar`,
      description: 'Revê custos recorrentes antes da próxima cobrança.',
      priority: 'high',
      actionId: 'review_subscriptions',
      actionLabel: 'Ver subscrições',
    });
  }

  if (input.featuredGoalGap != null && input.featuredGoalGap > 0) {
    insights.push({
      id: 'goal-gap',
      emoji: '🎯',
      title: `Faltam ${Math.round(input.featuredGoalGap)}€ para o teu objetivo`,
      description: 'Um pequeno movimento hoje aproxima-te da meta.',
      priority: 'medium',
      actionId: 'create_goal',
      actionLabel: 'Ver objetivo',
    });
  }

  if (score.breakdown.subscriptions < 12 && input.subscriptionCount > 0) {
    insights.push({
      id: 'subs-load',
      emoji: '💡',
      title: 'Subscrições a pesar no orçamento',
      description: 'Identifica 1–2 serviços que podes cancelar ou downgrade.',
      priority: 'medium',
      actionId: 'review_subscriptions',
      actionLabel: 'Optimizar',
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: 'daily-action',
      emoji: '📸',
      title: 'Digitaliza a próxima compra',
      description: 'OCR cria movimento e pode guardar garantia automaticamente.',
      priority: 'low',
      actionId: 'scan_receipt',
      actionLabel: 'Digitalizar talão',
    });
  }

  return {
    greeting: `Bom dia ${input.firstName} 👋`,
    insights: insights.slice(0, 3),
    savingsTip: buildSavingsTip(input, score),
  };
}
