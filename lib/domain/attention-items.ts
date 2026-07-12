import type { Goal, Subscription, Warranty } from './assets.types';
import type { AttentionItem, AttentionPriority, Credit } from './types';
import { SUBSCRIPTION_RENEWAL_ALERT_DAYS } from '@/lib/subscriptions/renewal.constants';
import {
  daysUntilRenewal,
  getRenewalStatus,
  isRenewalWithinAlert,
} from '@/lib/subscriptions/renewal.utils';
import { WARRANTY_CRITICAL_DAYS } from './warranty.constants';
import { daysUntil } from '@/lib/utils/format';

const CREDIT_DUE_DAYS = 14;

function priorityWeight(priority: AttentionPriority): number {
  if (priority === 'high') return 0;
  if (priority === 'medium') return 1;
  return 2;
}

function creditDuePriority(daysLeft: number): AttentionPriority {
  if (daysLeft <= 3) return 'high';
  if (daysLeft <= 7) return 'medium';
  return 'low';
}

export function buildAttentionItems(input: {
  warranties: Warranty[];
  credits: Credit[];
  subscriptions: Subscription[];
  goals: Goal[];
  asOf?: Date;
}): AttentionItem[] {
  const asOf = input.asOf ?? new Date();
  const items: AttentionItem[] = [];

  for (const warranty of input.warranties) {
    const daysLeft = daysUntil(warranty.expiresAt, asOf);
    if (daysLeft < 0 || daysLeft > WARRANTY_CRITICAL_DAYS) continue;

    items.push({
      id: `warranty-${warranty.id}`,
      type: 'warranty',
      title: daysLeft < 0 ? 'Garantia expirada' : 'Garantia a expirar',
      description: warranty.product,
      dueDate: warranty.expiresAt,
      priority: daysLeft <= 7 ? 'high' : 'medium',
    });
  }

  for (const credit of input.credits) {
    if (!credit.nextPaymentDate) continue;
    const daysLeft = daysUntil(credit.nextPaymentDate, asOf);
    if (daysLeft < 0 || daysLeft > CREDIT_DUE_DAYS) continue;

    items.push({
      id: `credit-${credit.id}`,
      type: 'credit',
      title: daysLeft <= 3 ? 'Prestação iminente' : 'Prestação próxima',
      description: credit.name,
      dueDate: credit.nextPaymentDate,
      priority: creditDuePriority(daysLeft),
      amount: credit.nextPaymentAmount,
    });
  }

  for (const subscription of input.subscriptions) {
    if (!subscription.renewsAt) continue;
    const status = getRenewalStatus(subscription.renewsAt, asOf);
    const diffDays = daysUntilRenewal(subscription.renewsAt, asOf);

    if (diffDays < 0) {
      items.push({
        id: `subscription-${subscription.id}`,
        type: 'subscription',
        title: 'Renovação em atraso',
        description: subscription.name,
        dueDate: subscription.renewsAt,
        priority: 'high',
        amount: subscription.amount,
      });
      continue;
    }

    if (!isRenewalWithinAlert(subscription.renewsAt, asOf, SUBSCRIPTION_RENEWAL_ALERT_DAYS)) {
      continue;
    }

    items.push({
      id: `subscription-${subscription.id}`,
      type: 'subscription',
      title: diffDays === 0 ? 'Renova hoje' : 'Renovação de despesa recorrente',
      description: subscription.name,
      dueDate: subscription.renewsAt,
      priority: diffDays <= 3 ? 'high' : 'medium',
      amount: subscription.amount,
    });
  }

  // Objetivos NÃO entram em "Precisa de atenção" — têm o seu próprio destaque
  // na Home (HomeGoalHighlightCard). `input.goals` mantém-se na assinatura por
  // compatibilidade com os chamadores.

  return items.sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority));
}
