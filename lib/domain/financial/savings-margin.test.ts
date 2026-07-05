import assert from 'node:assert/strict';
import test from 'node:test';

import type { Transaction } from '@/lib/domain/transaction.types';

import {
  calculateRealSavingsMargin,
  calculateRemainingVariableProjection,
  calculateVariableSpendMonthlyMedian,
  capActionAmount,
  countsAsVariableSpendTransaction,
  REAL_SAVINGS_ACTION_CAP_RATIO,
} from './savings-margin';
import { roundMoney } from './money';

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

test('countsAsVariableSpendTransaction — exclui pontuais e recorrentes', () => {
  assert.equal(
    countsAsVariableSpendTransaction(expense({ amount: 50, category: 'supermarket', date: '2026-05-01' })),
    true,
  );
  assert.equal(
    countsAsVariableSpendTransaction(
      expense({ amount: 1800, category: 'electronics', date: '2026-05-10' }),
    ),
    false,
  );
  assert.equal(
    countsAsVariableSpendTransaction(
      expense({ amount: 15, category: 'streaming', date: '2026-05-02', recurringId: 'r1' }),
    ),
    false,
  );
});

test('calculateVariableSpendMonthlyMedian — mediana ignora outlier pontual', () => {
  const asOf = new Date('2026-07-05T12:00:00');
  const transactions: Transaction[] = [
    expense({ amount: 400, category: 'supermarket', date: '2026-04-15' }),
    expense({ amount: 420, category: 'restaurant', date: '2026-05-12' }),
    expense({ amount: 1800, category: 'electronics', date: '2026-05-20' }),
    expense({ amount: 380, category: 'supermarket', date: '2026-06-08' }),
  ];

  const result = calculateVariableSpendMonthlyMedian(transactions, asOf);
  assert.equal(result.monthsUsed, 3);
  assert.equal(result.medianMonthly, 400);
});

test('calculateRemainingVariableProjection — dias restantes', () => {
  const asOf = new Date('2026-07-05T12:00:00');
  const { daysRemaining, daysInMonth, projection } = calculateRemainingVariableProjection(600, asOf);
  assert.equal(daysInMonth, 31);
  assert.equal(daysRemaining, 26);
  assert.equal(projection, 503.23);
});

test('capActionAmount — reserva 10%', () => {
  assert.equal(capActionAmount(500), 450);
  assert.equal(REAL_SAVINGS_ACTION_CAP_RATIO, 0.9);
});

test('calculateRealSavingsMargin — disponível menos projeção com tecto', () => {
  const asOf = new Date('2026-07-05T12:00:00');
  const transactions: Transaction[] = [
    expense({ amount: 500, category: 'supermarket', date: '2026-04-10' }),
    expense({ amount: 500, category: 'supermarket', date: '2026-05-10' }),
    expense({ amount: 500, category: 'supermarket', date: '2026-06-10' }),
  ];

  const margin = calculateRealSavingsMargin(1158.3, transactions, asOf);
  assert.equal(margin.availableThisMonth, 1158.3);
  assert.equal(margin.variableMedianMonthly, 500);
  assert.ok(margin.variableProjection > 400);
  assert.equal(margin.rawMargin, roundMoney(margin.availableThisMonth - margin.variableProjection));
  assert.equal(margin.cappedActionBudget, capActionAmount(margin.rawMargin));
});
