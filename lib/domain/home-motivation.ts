import type { MonthlySpendableOutput } from '@/lib/budget/calculateMonthlySpendable';
import type { AttentionItem } from '@/lib/domain/types';
import { formatCurrency } from '@/lib/utils/format';

const GENERAL_PHRASES = [
  'Hoje é um bom dia para poupar.',
  'Pequenas escolhas criam grandes resultados.',
  'Controla o mês antes que o mês te controle.',
  'O teu dinheiro precisa de direção.',
  'Poupar hoje dá liberdade amanhã.',
  'Cada euro precisa de um plano.',
  'O progresso financeiro começa no detalhe.',
] as const;

export type HomeMotivationContext = {
  referenceDate?: Date;
  spendable?: Pick<
    MonthlySpendableOutput,
    'remainingThisMonth' | 'projectedEndOfMonthBalance' | 'dailyAvailable' | 'daysRemaining'
  >;
  attentionItems?: AttentionItem[];
  activeGoalsCount?: number;
  netWorthChangePercent?: number;
  subscriptionAlertsCount?: number;
};

function dayIndex(date: Date): number {
  return date.getFullYear() * 400 + date.getMonth() * 31 + date.getDate();
}

function pickGeneralPhrase(date: Date): string {
  const index = dayIndex(date) % GENERAL_PHRASES.length;
  return GENERAL_PHRASES[index];
}

function hasUpcomingPayments(items: AttentionItem[]): boolean {
  return items.some(
    (item) => item.type === 'credit' || item.type === 'subscription',
  );
}

function countSubscriptionAlerts(items: AttentionItem[]): number {
  return items.filter((item) => item.type === 'subscription').length;
}

/** Frase curta e contextual para substituir a data no header da Home. */
export function getHomeMotivationPhrase(context: HomeMotivationContext = {}): string {
  const date = context.referenceDate ?? new Date();
  const spendable = context.spendable;
  const attention = context.attentionItems ?? [];
  const subscriptionAlerts =
    context.subscriptionAlertsCount ?? countSubscriptionAlerts(attention);

  if (spendable && spendable.remainingThisMonth < 0) {
    return 'Hoje o foco é recuperar controlo.';
  }

  if (
    spendable &&
    spendable.dailyAvailable > 0 &&
    spendable.remainingThisMonth > 0 &&
    spendable.daysRemaining > 0
  ) {
    return `Hoje podes gastar até ${formatCurrency(spendable.dailyAvailable)} mantendo o orçamento.`;
  }

  if (subscriptionAlerts >= 2) {
    return `Há ${subscriptionAlerts} despesas recorrentes que podes rever.`;
  }

  if ((context.netWorthChangePercent ?? 0) >= 0.5) {
    return 'O teu património cresceu este mês.';
  }

  if (spendable && spendable.projectedEndOfMonthBalance >= 0 && spendable.remainingThisMonth > 0) {
    if (hasUpcomingPayments(attention)) {
      return 'Atenção aos próximos compromissos.';
    }
    if ((context.activeGoalsCount ?? 0) > 0) {
      return 'Mais perto do teu objetivo, um passo de cada vez.';
    }
    return 'Bom ritmo. Mantém o plano.';
  }

  return pickGeneralPhrase(date);
}
