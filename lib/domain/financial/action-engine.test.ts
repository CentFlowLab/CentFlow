import assert from 'node:assert/strict';
import test from 'node:test';

import type { CategoryBudgetStatus } from '@/lib/domain/category-budget.types';
import type { Subscription } from '@/lib/domain/assets.types';
import type { Transaction } from '@/lib/domain/transaction.types';

import { buildFinancialActions } from './action-engine';
import { isSubscriptionReviewDue } from './subscription-review';
import { resolveSubscriptionCancelUrl } from '@/lib/subscriptions/cancel-url-map';

function expense(
  partial: Pick<Transaction, 'amount' | 'date' | 'category'> & Partial<Transaction>,
): Transaction {
  return {
    id: partial.id ?? `tx-${partial.date}-${partial.category}`,
    type: 'expense',
    description: partial.description ?? 'Test',
    categoryLabel: partial.categoryLabel ?? partial.category,
    currency: 'EUR',
    ...partial,
  };
}

test('resolveSubscriptionCancelUrl — Netflix e Spotify', () => {
  assert.equal(resolveSubscriptionCancelUrl('Netflix Premium'), 'https://www.netflix.com/cancelplan');
  assert.equal(
    resolveSubscriptionCancelUrl('Spotify Família'),
    'https://www.spotify.com/account/subscription/',
  );
  assert.equal(resolveSubscriptionCancelUrl('Serviço Local XYZ'), null);
});

test('isSubscriptionReviewDue — nunca revista', () => {
  const sub: Subscription = { id: '1', name: 'Netflix', amount: 15 };
  assert.equal(isSubscriptionReviewDue(sub, new Date('2026-07-01T12:00:00')), true);
});

test('isSubscriptionReviewDue — revista recente', () => {
  const sub: Subscription = {
    id: '1',
    name: 'Netflix',
    amount: 15,
    lastReviewedAt: '2026-06-15',
  };
  assert.equal(isSubscriptionReviewDue(sub, new Date('2026-07-01T12:00:00')), false);
});

test('buildFinancialActions — prioriza orçamento e subscrição', () => {
  const budgetStatus: CategoryBudgetStatus = {
    category: 'food',
    label: 'Alimentação',
    monthlyLimit: 200,
    spent: 210,
    ratio: 1.05,
    level: 'over100',
    source: 'manual',
  };

  const transactions: Transaction[] = [
    expense({ id: 't1', amount: 210, category: 'food', date: '2026-07-05' }),
    expense({ id: 't2', amount: 80, category: 'food', date: '2026-06-10' }),
  ];

  const subscriptions: Subscription[] = [
    { id: 'sub1', name: 'Netflix', amount: 15, renewsAt: '2026-07-08' },
  ];

  const actions = buildFinancialActions({
    asOf: new Date('2026-07-05T12:00:00'),
    budgetStatuses: [budgetStatus],
    transactions,
    subscriptions,
    goals: [],
    accounts: [],
    availableThisMonth: 0,
    maxActions: 3,
  });

  assert.ok(actions.some((item) => item.kind === 'budget_alert'));
  assert.ok(actions.some((item) => item.kind === 'subscription_review'));
  assert.equal(actions[0]?.kind, 'budget_alert');
});
