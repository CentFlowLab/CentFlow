import assert from 'node:assert/strict';
import test from 'node:test';

import { buildMonthlyAvailableBreakdown } from '@/lib/domain/financial/monthly-available.compose';
import { calculateNetSpending } from '@/lib/domain/financial/ledger-impact';
import type { Transaction } from '@/lib/domain/transaction.types';

const JULY = new Date(2026, 6, 15);
const PERIOD = { kind: 'month' as const, monthKey: '2026-07', asOf: JULY };

const baseTx = {
  category: 'food',
  categoryLabel: 'Comida',
  currency: 'EUR',
};

test('compra cartão 100€ — disponível inalterado, gastos +100€', () => {
  const transactions: Transaction[] = [
    {
      id: 'inc',
      type: 'income',
      amount: 1000,
      date: '2026-07-01',
      category: 'salary',
      categoryLabel: 'Salário',
      currency: 'EUR',
    },
    {
      id: 'card',
      type: 'credit_card_purchase',
      amount: 100,
      creditId: 'card-gold',
      date: '2026-07-10',
      ...baseTx,
    },
  ];

  const breakdown = buildMonthlyAvailableBreakdown({
    transactions,
    goalContributions: [],
    credits: [],
    subscriptions: [],
    loanPayments: [],
    referenceDate: JULY,
  });

  assert.equal(breakdown.available, 1000);
  assert.equal(breakdown.components.creditCardPurchases, 100);
  assert.equal(breakdown.components.creditCardPayments, 0);
  assert.equal(breakdown.components.registeredExpenses, 0);
  assert.equal(breakdown.consumptionSpending, 100);
  assert.equal(calculateNetSpending(transactions, PERIOD), 100);
});

test('pagar cartão 100€ — disponível 900€, gastos mantêm 100€', () => {
  const transactions: Transaction[] = [
    {
      id: 'inc',
      type: 'income',
      amount: 1000,
      date: '2026-07-01',
      category: 'salary',
      categoryLabel: 'Salário',
      currency: 'EUR',
    },
    {
      id: 'purchase',
      type: 'credit_card_purchase',
      amount: 100,
      creditId: 'card-gold',
      date: '2026-07-10',
      ...baseTx,
    },
    {
      id: 'payment',
      type: 'credit_card_payment',
      amount: 100,
      creditId: 'card-gold',
      accountId: 'acc-robinhood',
      date: '2026-07-15',
      category: 'credit',
      categoryLabel: 'Crédito',
      currency: 'EUR',
    },
  ];

  const breakdown = buildMonthlyAvailableBreakdown({
    transactions,
    goalContributions: [],
    credits: [],
    subscriptions: [],
    loanPayments: [],
    referenceDate: JULY,
  });

  assert.equal(breakdown.available, 900);
  assert.equal(breakdown.components.creditCardPayments, 100);
  assert.equal(breakdown.consumptionSpending, 100);
  assert.equal(calculateNetSpending(transactions, PERIOD), 100);
});

test('despesa em conta 50€ após pagamento cartão — disponível 850€, gastos 150€', () => {
  const transactions: Transaction[] = [
    {
      id: 'inc',
      type: 'income',
      amount: 1000,
      date: '2026-07-01',
      category: 'salary',
      categoryLabel: 'Salário',
      currency: 'EUR',
    },
    {
      id: 'purchase',
      type: 'credit_card_purchase',
      amount: 100,
      creditId: 'card-gold',
      date: '2026-07-10',
      ...baseTx,
    },
    {
      id: 'payment',
      type: 'credit_card_payment',
      amount: 100,
      creditId: 'card-gold',
      accountId: 'acc-robinhood',
      date: '2026-07-15',
      category: 'credit',
      categoryLabel: 'Crédito',
      currency: 'EUR',
    },
    {
      id: 'expense',
      type: 'expense',
      amount: 50,
      accountId: 'acc-robinhood',
      date: '2026-07-20',
      ...baseTx,
    },
  ];

  const breakdown = buildMonthlyAvailableBreakdown({
    transactions,
    goalContributions: [],
    credits: [],
    subscriptions: [],
    loanPayments: [],
    referenceDate: new Date(2026, 6, 25),
  });

  assert.equal(breakdown.available, 850);
  assert.equal(breakdown.components.registeredExpenses, 50);
  assert.equal(breakdown.consumptionSpending, 150);
});

test('mensalidade paga reduz disponível; compra cartão não', () => {
  const breakdown = buildMonthlyAvailableBreakdown({
    transactions: [
      {
        id: 'inc',
        type: 'income',
        amount: 1000,
        date: '2026-07-01',
        category: 'salary',
        categoryLabel: 'Salário',
        currency: 'EUR',
      },
      {
        id: 'card',
        type: 'credit_card_purchase',
        amount: 100,
        creditId: 'c1',
        date: '2026-07-05',
        category: 'food',
        categoryLabel: 'Comida',
        currency: 'EUR',
      },
      {
        id: 'exp',
        type: 'expense',
        amount: 50,
        accountId: 'a1',
        date: '2026-07-06',
        category: 'food',
        categoryLabel: 'Comida',
        currency: 'EUR',
      },
    ],
    goalContributions: [],
    credits: [],
    subscriptions: [],
    loanPayments: [],
    referenceDate: JULY,
  });

  assert.equal(breakdown.available, 950);
  assert.equal(breakdown.consumptionSpending, 150);
});
