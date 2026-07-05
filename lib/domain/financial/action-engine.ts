import type { BankAccount } from '@/lib/domain/account.types';
import type { Goal, Subscription } from '@/lib/domain/assets.types';
import type { CategoryBudgetStatus } from '@/lib/domain/category-budget.types';
import type { Transaction } from '@/lib/domain/transaction.types';

import { compareCategoryPeriods } from './insights';
import { getCurrentMonthRange, getPreviousMonthRange, type FinancialPeriod } from './dates';
import { pickSubscriptionsNeedingReview } from './subscription-review';
import {
  buildSavingsAllocationAction,
  type SavingsAllocationAction,
} from './savings-allocation';

export type FinancialActionKind =
  | 'budget_alert'
  | 'category_mom'
  | 'allocate_goal'
  | 'subscription_review';

export type FinancialAction =
  | {
      id: string;
      kind: 'budget_alert';
      priority: number;
      title: string;
      description: string;
      payload: { status: CategoryBudgetStatus };
    }
  | {
      id: string;
      kind: 'category_mom';
      priority: number;
      title: string;
      description: string;
      payload: { category: string; label: string; deltaPercent: number };
    }
  | {
      id: string;
      kind: 'allocate_goal';
      priority: number;
      title: string;
      description: string;
      payload: SavingsAllocationAction;
    }
  | {
      id: string;
      kind: 'subscription_review';
      priority: number;
      title: string;
      description: string;
      payload: {
        subscriptionId: string;
        subscriptionName: string;
        cancelUrl: string | null;
        monthlyAmount: number;
        renewingSoon: boolean;
      };
    };

export type BuildFinancialActionsInput = {
  asOf?: Date;
  budgetStatuses: CategoryBudgetStatus[];
  transactions: Transaction[];
  subscriptions: Subscription[];
  goals: Goal[];
  accounts: BankAccount[];
  availableThisMonth: number;
  maxActions?: number;
  momDeltaThresholdPercent?: number;
};

const DEFAULT_MOM_THRESHOLD = 12;

function monthPeriod(monthKey: string, asOf: Date): FinancialPeriod {
  return { kind: 'month', monthKey, asOf };
}

function budgetPriority(level: CategoryBudgetStatus['level']): number {
  if (level === 'over100') return 100;
  if (level === 'warn80') return 85;
  return 0;
}

function buildBudgetActions(statuses: CategoryBudgetStatus[]): FinancialAction[] {
  return statuses
    .filter((status) => status.level !== 'ok')
    .map((status) => {
      const priority = budgetPriority(status.level);
      const title =
        status.level === 'over100'
          ? `${status.label} acima do limite`
          : `${status.label} a aproximar-se do limite`;

      const description =
        status.level === 'over100'
          ? `Gastaste ${status.spent.toFixed(0)} € de ${status.monthlyLimit.toFixed(0)} € este mês.`
          : `Já usaste ${Math.round(status.ratio * 100)}% do orçamento mensal.`;

      return {
        id: `budget-${status.category}`,
        kind: 'budget_alert' as const,
        priority,
        title,
        description,
        payload: { status },
      };
    });
}

function buildMomActions(
  transactions: Transaction[],
  asOf: Date,
  threshold: number,
): FinancialAction[] {
  const current = monthPeriod(getCurrentMonthRange(asOf).monthKey, asOf);
  const previous = monthPeriod(getPreviousMonthRange(asOf).monthKey, asOf);

  return compareCategoryPeriods(transactions, current, previous)
    .filter((item) => item.deltaPercent !== null && item.deltaPercent >= threshold)
    .map((item) => ({
      id: `mom-${item.category.key}`,
      kind: 'category_mom' as const,
      priority: 55 + Math.min(Math.round(item.deltaPercent ?? 0), 30),
      title: `${item.category.label} subiu ${Math.round(item.deltaPercent ?? 0)}%`,
      description: 'Comparado com o mês anterior — vale rever se faz sentido manter este ritmo.',
      payload: {
        category: item.category.key,
        label: item.category.label,
        deltaPercent: item.deltaPercent ?? 0,
      },
    }));
}

function buildAllocateAction(input: BuildFinancialActionsInput): FinancialAction | null {
  const allocation = buildSavingsAllocationAction({
    availableThisMonth: input.availableThisMonth,
    goals: input.goals,
    accounts: input.accounts,
  });
  if (!allocation) return null;

  return {
    id: `allocate-${allocation.goalId}`,
    kind: 'allocate_goal',
    priority: 70,
    title: 'Margem de poupança disponível',
    description: `Podes reservar ${allocation.amount.toFixed(0)} € para «${allocation.goalName}».`,
    payload: allocation,
  };
}

function buildSubscriptionReviewActions(
  subscriptions: Subscription[],
  asOf: Date,
): FinancialAction[] {
  return pickSubscriptionsNeedingReview(subscriptions, asOf).map((item) => {
    const priority = item.renewingSoon ? 80 : 65;
    const title = item.renewingSoon
      ? `Revê ${item.subscription.name} antes da renovação`
      : `Revê ${item.subscription.name}`;

    const description = item.cancelUrl
      ? `Custa cerca de ${item.monthlyAmount.toFixed(0)} €/mês — podes cancelar online se já não usas.`
      : `Custa cerca de ${item.monthlyAmount.toFixed(0)} €/mês — confirma se ainda precisas deste serviço.`;

    return {
      id: `sub-review-${item.subscription.id}`,
      kind: 'subscription_review' as const,
      priority,
      title,
      description,
      payload: {
        subscriptionId: item.subscription.id,
        subscriptionName: item.subscription.name,
        cancelUrl: item.cancelUrl,
        monthlyAmount: item.monthlyAmount,
        renewingSoon: item.renewingSoon,
      },
    };
  });
}

/** Orquestra alertas de orçamento, MoM, alocação e revisão de subscrições. */
export function buildFinancialActions(input: BuildFinancialActionsInput): FinancialAction[] {
  const asOf = input.asOf ?? new Date();
  const threshold = input.momDeltaThresholdPercent ?? DEFAULT_MOM_THRESHOLD;

  const actions: FinancialAction[] = [
    ...buildBudgetActions(input.budgetStatuses),
    ...buildMomActions(input.transactions, asOf, threshold),
  ];

  const allocate = buildAllocateAction(input);
  if (allocate) actions.push(allocate);

  actions.push(...buildSubscriptionReviewActions(input.subscriptions, asOf));

  return actions
    .sort((a, b) => b.priority - a.priority)
    .slice(0, input.maxActions ?? actions.length);
}
