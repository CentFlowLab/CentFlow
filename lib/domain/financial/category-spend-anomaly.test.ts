import assert from 'node:assert/strict';
import test from 'node:test';

import type { Transaction } from '@/lib/domain/transaction.types';

import {
  buildCategorySpendAnomalyMessage,
  DEFAULT_CATEGORY_SPEND_ALERT_THRESHOLD,
  evaluateCategorySpendAnomaly,
  MIN_CATEGORY_SPEND_ABSOLUTE_DELTA,
} from './category-spend-anomaly';
import { MIN_CATEGORY_SPEND_BASELINE_TRANSACTIONS } from './savings-margin';

function expense(
  partial: Pick<Transaction, 'amount' | 'date' | 'category'> & Partial<Transaction>,
): Transaction {
  return {
    id: partial.id ?? `tx-${partial.date}-${partial.amount}`,
    type: 'expense',
    description: partial.description ?? 'Test',
    categoryLabel: partial.categoryLabel ?? partial.category,
    currency: 'EUR',
    ...partial,
  };
}

test('evaluateCategorySpendAnomaly — dispara acima de 2× mediana', () => {
  const asOf = new Date('2026-07-05T12:00:00');
  const baseline: Transaction[] = [];

  for (let i = 0; i < MIN_CATEGORY_SPEND_BASELINE_TRANSACTIONS; i += 1) {
    baseline.push(
      expense({
        id: `hist-${i}`,
        amount: 20,
        category: 'supermarket',
        date: `2026-0${4 + (i % 3)}-${10 + i}`,
      }),
    );
  }

  const result = evaluateCategorySpendAnomaly(50, 'supermarket', baseline, {
    asOf,
    thresholdMultiplier: DEFAULT_CATEGORY_SPEND_ALERT_THRESHOLD,
  });

  assert.ok(result);
  assert.equal(result.percentAbove, 150);
});

test('evaluateCategorySpendAnomaly — não dispara para diferença trivial', () => {
  const asOf = new Date('2026-07-05T12:00:00');
  const baseline: Transaction[] = [];

  for (let i = 0; i < MIN_CATEGORY_SPEND_BASELINE_TRANSACTIONS; i += 1) {
    baseline.push(
      expense({
        id: `hist-${i}`,
        amount: 1.5,
        category: 'supermarket',
        date: `2026-0${4 + (i % 3)}-${10 + i}`,
      }),
    );
  }

  const result = evaluateCategorySpendAnomaly(3, 'supermarket', baseline, { asOf });
  assert.equal(result, null);
  assert.ok(3 - 1.5 < MIN_CATEGORY_SPEND_ABSOLUTE_DELTA);
});

test('evaluateCategorySpendAnomaly — histórico insuficiente', () => {
  const asOf = new Date('2026-07-05T12:00:00');
  const baseline = [
    expense({ amount: 20, category: 'supermarket', date: '2026-04-10' }),
    expense({ amount: 20, category: 'supermarket', date: '2026-05-10' }),
  ];

  assert.equal(evaluateCategorySpendAnomaly(100, 'supermarket', baseline, { asOf }), null);
});

test('evaluateCategorySpendAnomaly — exclui categorias pontuais', () => {
  const asOf = new Date('2026-07-05T12:00:00');
  const baseline = [
    expense({ amount: 500, category: 'electronics', date: '2026-04-10' }),
    expense({ amount: 500, category: 'electronics', date: '2026-05-10' }),
    expense({ amount: 500, category: 'electronics', date: '2026-06-10' }),
    expense({ amount: 500, category: 'electronics', date: '2026-06-11' }),
    expense({ amount: 500, category: 'electronics', date: '2026-06-12' }),
  ];

  assert.equal(evaluateCategorySpendAnomaly(2000, 'electronics', baseline, { asOf }), null);
});

test('buildCategorySpendAnomalyMessage — texto esperado', () => {
  const message = buildCategorySpendAnomalyMessage({
    category: 'supermarket',
    categoryLabel: 'Supermercado',
    amount: 50,
    medianAmount: 20,
    percentAbove: 150,
    thresholdMultiplier: 2,
  });

  assert.match(message, /Supermercado/);
  assert.match(message, /150%/);
  assert.match(message, /20,00/);
});
