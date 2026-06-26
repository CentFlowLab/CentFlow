import type { Goal, Subscription, Warranty } from './assets.types';
import type { AttentionItem, AttentionPriority, Credit } from './types';
import { getGoalProgress } from './goal.utils';
import { SUBSCRIPTION_RENEWAL_ALERT_DAYS } from '@/lib/subscriptions/renewal.constants';
import {
  daysUntilRenewal,
  getRenewalStatus,
  isRenewalWithinAlert,
} from '@/lib/subscriptions/renewal.utils';
import { WARRANTY_CRITICAL_DAYS } from './warranty.utils';
import { daysUntil } from '@/lib/utils/format';

const CREDIT_DUE_DAYS = 14;
const GOAL_STALL_DEADLINE_DAYS = 30;

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
      title: diffDays === 0 ? 'Renova hoje' : 'Renovação de subscrição',
      description: subscription.name,
      dueDate: subscription.renewsAt,
      priority: diffDays <= 3 ? 'high' : 'medium',
      amount: subscription.amount,
    });
  }

  for (const goal of input.goals) {
    const progress = getGoalProgress(goal);
    if (progress.isComplete || goal.target <= 0) continue;

    const deadlineDays = goal.deadline ? daysUntil(goal.deadline) : null;
    const isStalled = goal.current <= 0;
    const isAtRisk =
      deadlineDays !== null &&
      deadlineDays >= 0 &&
      deadlineDays <= GOAL_STALL_DEADLINE_DAYS &&
      progress.percent < 25;

    if (!isStalled && !isAtRisk) continue;

    items.push({
      id: `goal-${goal.id}`,
      type: 'goal',
      title: isStalled ? 'Objetivo parado' : 'Objetivo em risco',
      description: goal.name,
      dueDate: goal.deadline,
      priority: isAtRisk && deadlineDays !== null && deadlineDays <= 14 ? 'high' : 'medium',
    });
  }

  return items.sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority));
}
