import assert from 'node:assert/strict';
import test from 'node:test';

import type { Subscription } from '@/lib/domain/assets.types';
import type { Credit } from '@/lib/domain/types';
import type { Transaction } from '@/lib/domain/transaction.types';

import {
  buildCashflowProjection,
  calculateMonthlyIncomeMedian,
} from './cashflow-projection';

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

function income(
  partial: Pick<Transaction, 'amount' | 'date'> & Partial<Transaction>,
): Transaction {
  return {
    id: partial.id ?? `inc-${partial.date}`,
    type: 'income',
    description: partial.description ?? 'Salário',
    category: partial.category ?? 'salary',
    categoryLabel: partial.categoryLabel ?? 'Salário',
    currency: 'EUR',
    ...partial,
  };
}

test('calculateMonthlyIncomeMedian — mediana de receitas', () => {
  const asOf = new Date('2026-07-05T12:00:00');
  const transactions: Transaction[] = [
    income({ amount: 2000, date: '2026-04-01' }),
    income({ amount: 2100, date: '2026-05-01' }),
    income({ amount: 2050, date: '2026-06-01' }),
  ];

  assert.equal(calculateMonthlyIncomeMedian(transactions, asOf), 2050);
});

test('buildCashflowProjection — reduz saldo com gasto variável diário', () => {
  const asOf = new Date('2026-07-05T12:00:00');
  const transactions: Transaction[] = [
    income({ amount: 3000, date: '2026-07-01' }),
    expense({ amount: 500, category: 'supermarket', date: '2026-04-10' }),
    expense({ amount: 500, category: 'supermarket', date: '2026-05-10' }),
    expense({ amount: 500, category: 'supermarket', date: '2026-06-10' }),
  ];

  const result = buildCashflowProjection({
    transactions,
    subscriptions: [],
    credits: [],
    goalContributions: [],
    loanPayments: [],
    prioritizeDebtAmortization: false,
    horizon: 30,
    asOf,
  });

  assert.equal(result.points.length, 31);
  assert.ok(result.horizonBalance < result.currentBalance);
  assert.equal(result.variableMedianMonthly, 500);
});

test('buildCashflowProjection — detecta cruzamento negativo', () => {
  const asOf = new Date('2026-07-05T12:00:00');
  const transactions: Transaction[] = [
    income({ amount: 100, date: '2026-04-01' }),
    expense({ amount: 900, category: 'supermarket', date: '2026-04-15' }),
    expense({ amount: 900, category: 'supermarket', date: '2026-05-15' }),
    expense({ amount: 900, category: 'supermarket', date: '2026-06-15' }),
  ];

  const subscription: Subscription = {
    id: 'sub1',
    name: 'Netflix',
    amount: 15,
    renewsAt: '2026-07-08',
  };

  const result = buildCashflowProjection({
    transactions,
    subscriptions: [subscription],
    credits: [],
    goalContributions: [],
    loanPayments: [],
    prioritizeDebtAmortization: false,
    horizon: 30,
    asOf,
  });

  assert.ok(result.negativeCrossing);
  assert.ok(result.negativeCrossing.dayIndex > 0);
});

test('buildCashflowProjection — subscrição futura reduz saldo na data', () => {
  const asOf = new Date('2026-07-05T12:00:00');
  const transactions: Transaction[] = [
    income({ amount: 2500, date: '2026-07-01' }),
    expense({ amount: 400, category: 'supermarket', date: '2026-04-10' }),
    expense({ amount: 400, category: 'supermarket', date: '2026-05-10' }),
    expense({ amount: 400, category: 'supermarket', date: '2026-06-10' }),
  ];

  const subscription: Subscription = {
    id: 'sub1',
    name: 'Spotify',
    amount: 10,
    renewsAt: '2026-07-10',
  };

  const result = buildCashflowProjection({
    transactions,
    subscriptions: [subscription],
    credits: [],
    goalContributions: [],
    loanPayments: [],
    prioritizeDebtAmortization: false,
    horizon: 30,
    asOf,
  });

  const dayBefore = result.points.find((point) => point.date === '2026-07-09');
  const dueDay = result.points.find((point) => point.date === '2026-07-10');
  assert.ok(dayBefore && dueDay);
  assert.ok(dueDay.balance < dayBefore.balance);
  assert.ok(dayBefore.balance - dueDay.balance >= 10);
});

test('buildCashflowProjection — amortização de dívida no fim do mês quando prioritária', () => {
  const asOf = new Date('2026-07-05T12:00:00');
  const transactions: Transaction[] = [
    income({ amount: 3000, date: '2026-07-01' }),
    expense({ amount: 200, category: 'supermarket', date: '2026-04-10' }),
    expense({ amount: 200, category: 'supermarket', date: '2026-05-10' }),
    expense({ amount: 200, category: 'supermarket', date: '2026-06-10' }),
  ];

  const credit: Credit = {
    id: 'c1',
    name: 'Crédito pessoal',
    outstandingBalance: 5000,
    monthlyPayment: 150,
    nextPaymentDate: '2026-08-01',
    interestRateAnnual: 8,
  };

  const withoutDebt = buildCashflowProjection({
    transactions,
    subscriptions: [],
    credits: [credit],
    goalContributions: [],
    loanPayments: [],
    prioritizeDebtAmortization: false,
    horizon: 30,
    asOf,
  });

  const withDebt = buildCashflowProjection({
    transactions,
    subscriptions: [],
    credits: [credit],
    goalContributions: [],
    loanPayments: [],
    prioritizeDebtAmortization: true,
    horizon: 30,
    asOf,
  });

  assert.ok(withDebt.horizonBalance <= withoutDebt.horizonBalance);
});
