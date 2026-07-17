import type { CentFlowScoreResult } from './types';
import type { CentFlowScoreInput, DailyAssistantPlan, AssistantInsight } from './types';
import { calculateCentFlowScore } from './centflow-score';
import { pluralizeSubscricoes } from '@/lib/utils/pluralize';

type AssistantInput = CentFlowScoreInput & {
  firstName: string;
  subscriptionCount: number;
  goalsCount: number;
  transactionCount: number;
  maxInsights?: number;
  showSavingsTip?: boolean;
  verboseDescriptions?: boolean;
};

function withVerboseDescription(description: string, verbose: boolean, extra: string): string {
  if (!verbose) return description;
  return `${description} ${extra}`;
}

function buildSavingsTip(input: AssistantInput, score: CentFlowScoreResult): string | undefined {
  if (input.monthlySubscriptionCost >= 40 && input.monthlyIncome > 0) {
    const pct = Math.round((input.monthlySubscriptionCost / input.monthlyIncome) * 100);
    if (pct >= 8) {
      return `Podes poupar cerca de ${Math.round(input.monthlySubscriptionCost * 0.25)}€/mês revendo despesas recorrentes.`;
    }
  }
  // Sem despesa concreta identificada — não inventar oportunidade genérica.
  return undefined;
}

function buildGettingStartedInsights(input: AssistantInput): AssistantInsight[] {
  const verbose = input.verboseDescriptions ?? false;
  const items: AssistantInsight[] = [];

  if (input.transactionCount === 0) {
    items.push({
      id: 'start-movement',
      emoji: '✏️',
      title: 'Adiciona o teu primeiro movimento',
      description: withVerboseDescription(
        'Começa por registar uma despesa ou rendimento para ver o património actualizado.',
        verbose,
        'Cada movimento alimenta o orçamento mensal e as análises.',
      ),
      priority: 'high',
      actionId: 'add_expense',
      actionLabel: 'Adicionar movimento',
    });
  }

  if (input.goalsCount === 0) {
    items.push({
      id: 'start-goal',
      emoji: '🎯',
      title: 'Cria um objetivo de poupança',
      description: withVerboseDescription(
        'Define uma meta concreta e acompanha o progresso semana a semana.',
        verbose,
        'Usa o valor e prazo que definiste no onboarding como referência.',
      ),
      priority: 'medium',
      actionId: 'create_goal',
      actionLabel: 'Criar objetivo',
    });
  }

  if (input.subscriptionCount === 0) {
    items.push({
      id: 'start-sub',
      emoji: '📅',
      title: 'Organiza as tuas subscrições',
      description: withVerboseDescription(
        'Regista serviços recorrentes para controlar o orçamento mensal.',
        verbose,
        'Netflix, ginásio, cloud — tudo num só lugar com alertas de renovação.',
      ),
      priority: 'medium',
      actionId: 'add_subscription',
      actionLabel: 'Adicionar despesa recorrente',
    });
  }

  const limit = input.maxInsights ?? 3;
  return items.slice(0, limit);
}

export function buildDailyAssistantPlan(input: AssistantInput): DailyAssistantPlan {
  const score = calculateCentFlowScore(input);
  const insights: AssistantInsight[] = [];

  if (input.subscriptionsRenewingSoon > 0) {
    insights.push({
      id: 'renewals',
      emoji: '⚠️',
      title: pluralizeSubscricoes(input.subscriptionsRenewingSoon),
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

  const warrantiesExpiring = input.warrantiesExpiringSoon ?? 0;
  if (warrantiesExpiring > 0) {
    insights.push({
      id: 'warranty-expiry',
      emoji: '🛡️',
      title: `${warrantiesExpiring} garantia${warrantiesExpiring > 1 ? 's' : ''} a expirar`,
      description: 'Revê validades antes de perderes direitos de reparação.',
      priority: 'high',
      actionId: 'view_warranties',
      actionLabel: 'Ver garantias',
    });
  }

  if (
    input.weeklyExpenseDelta != null &&
    input.weeklyExpenseDelta < 0 &&
    input.transactionCount > 0
  ) {
    insights.push({
      id: 'weekly-down',
      emoji: '📉',
      title: 'Registaste menos despesas esta semana',
      description: `Gastaste cerca de ${Math.abs(Math.round(input.weeklyExpenseDelta))}€ menos que na semana passada.`,
      priority: 'low',
    });
  }

  if (score.breakdown.subscriptions < 12 && input.subscriptionCount > 0) {
    insights.push({
      id: 'subs-load',
      emoji: '💡',
      title: 'Despesas recorrentes a pesar no orçamento',
      description: 'Identifica 1–2 serviços que podes cancelar ou downgrade.',
      priority: 'medium',
      actionId: 'review_subscriptions',
      actionLabel: 'Optimizar',
    });
  }

  if (insights.length === 0) {
    insights.push(...buildGettingStartedInsights(input));
  }

  const hour = new Date().getHours();
  let greeting = `Olá, ${input.firstName}`;
  if (hour < 12) greeting = `Bom dia, ${input.firstName}`;
  else if (hour < 19) greeting = `Boa tarde, ${input.firstName}`;
  else greeting = `Boa noite, ${input.firstName}`;

  const maxInsights = input.maxInsights ?? 3;
  const showSavingsTip = input.showSavingsTip ?? true;

  return {
    greeting,
    insights: insights.slice(0, maxInsights),
    savingsTip: showSavingsTip ? buildSavingsTip(input, score) : undefined,
  };
}
