import assert from 'node:assert/strict';
import test from 'node:test';

import type { Subscription } from '@/lib/domain/assets.types';
import type { Transaction } from '@/lib/domain/transaction.types';

import {
  advanceSubscriptionRenewalDate,
  collectPaidSubscriptionIds,
  getSubscriptionPaymentUiState,
  isSubscriptionPaidInCycle,
} from './subscription-payments';
import { buildMonthlyAvailableBreakdown } from './monthly-available.compose';

const vodafone: Subscription = {
  id: 'sub-vodafone',
  name: 'Vodafone',
  amount: 28,
  billingInterval: 'monthly',
  renewsAt: '2026-07-28',
  category: 'subscriptions',
};

const julyReference = new Date(2026, 6, 15);

test('isSubscriptionPaidInCycle — detecta pagamento no ciclo', () => {
  const txs: Transaction[] = [
    {
      id: '1',
      type: 'expense',
      amount: 28,
      recurringId: vodafone.id,
      date: '2026-07-10',
      category: 'subscriptions',
      categoryLabel: 'Despesas recorrentes',
      currency: 'EUR',
    },
  ];
  assert.equal(isSubscriptionPaidInCycle(vodafone, txs, julyReference), true);
});

test('getSubscriptionPaymentUiState — pago bloqueia nova acção', () => {
  const txs: Transaction[] = [
    {
      id: '1',
      type: 'expense',
      amount: 28,
      recurringId: vodafone.id,
      date: '2026-07-10',
      category: 'subscriptions',
      categoryLabel: 'Despesas recorrentes',
      currency: 'EUR',
    },
  ];
  const ui = getSubscriptionPaymentUiState(vodafone, txs, julyReference);
  assert.equal(ui.status, 'paid');
  assert.equal(ui.disabled, true);
});

test('advanceSubscriptionRenewalDate — mensal avança 1 mês', () => {
  const next = advanceSubscriptionRenewalDate(vodafone, '2026-07-10');
  assert.equal(next, '2026-08-28');
});

test('subscrição paga não duplica obrigação futura no disponível', () => {
  const txs: Transaction[] = [
    {
      id: '1',
      type: 'expense',
      amount: 28,
      recurringId: vodafone.id,
      date: '2026-07-10',
      category: 'subscriptions',
      categoryLabel: 'Despesas recorrentes',
      currency: 'EUR',
    },
  ];

  const moeyAccount = {
    id: 'acc-moey',
    name: 'Moey',
    type: 'checking' as const,
    initialBalance: 1000,
    isActive: true,
    currency: 'EUR',
    budgetEnabled: true,
  };

  const breakdown = buildMonthlyAvailableBreakdown({
    accounts: [moeyAccount],
    transactions: txs.map((tx) => ({ ...tx, accountId: 'acc-moey' })),
    goalContributions: [],
    credits: [],
    subscriptions: [vodafone],
    loanPayments: [],
    referenceDate: julyReference,
  });

  assert.equal(breakdown.components.registeredExpenses, 28);
  assert.equal(breakdown.components.futureObligations, 0);
  assert.equal(breakdown.available, 972);
});

test('subscrição pendente conta como obrigação futura', () => {
  const moeyAccount = {
    id: 'acc-moey',
    name: 'Moey',
    type: 'checking' as const,
    initialBalance: 1000,
    isActive: true,
    currency: 'EUR',
    budgetEnabled: true,
  };

  const breakdown = buildMonthlyAvailableBreakdown({
    accounts: [moeyAccount],
    transactions: [],
    goalContributions: [],
    credits: [],
    subscriptions: [vodafone],
    loanPayments: [],
    referenceDate: julyReference,
  });

  assert.equal(breakdown.components.futureObligations, 28);
  assert.equal(breakdown.available, 972);
});

test('collectPaidSubscriptionIds — ignora subscrições por pagar', () => {
  const paid = collectPaidSubscriptionIds(
    [vodafone],
    [
      {
        id: '1',
        type: 'expense',
        amount: 28,
        recurringId: vodafone.id,
        date: '2026-07-10',
        category: 'subscriptions',
        categoryLabel: 'Despesas recorrentes',
        currency: 'EUR',
      },
    ],
    julyReference,
  );
  assert.equal(paid.has(vodafone.id), true);
});
