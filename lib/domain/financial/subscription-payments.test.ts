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

  const breakdown = buildMonthlyAvailableBreakdown({
    transactions: txs,
    goalContributions: [],
    credits: [],
    subscriptions: [vodafone],
    loanPayments: [],
    referenceDate: julyReference,
  });

  // 1000 receita − 28 despesa (sem obrigação duplicada) = 972
  const withIncome = {
    ...breakdown,
    available: breakdown.available + 1000,
  };
  assert.equal(breakdown.components.registeredExpenses, 28);
  assert.equal(breakdown.components.futureObligations, 0);
  assert.equal(withIncome.available, 972);
});

test('subscrição pendente conta como obrigação futura', () => {
  const breakdown = buildMonthlyAvailableBreakdown({
    transactions: [],
    goalContributions: [],
    credits: [],
    subscriptions: [vodafone],
    loanPayments: [],
    referenceDate: julyReference,
  });

  assert.equal(breakdown.components.futureObligations, 28);
  // Sem receitas: −28; com 1000€ receita seria 972
  assert.equal(1000 - breakdown.components.futureObligations, 972);
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
