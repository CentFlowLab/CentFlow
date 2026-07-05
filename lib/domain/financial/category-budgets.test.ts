import assert from 'node:assert/strict';
import test from 'node:test';

import type { CategoryBudget } from '@/lib/domain/category-budget.types';
import type { Transaction } from '@/lib/domain/transaction.types';

import {
  calculateCategoryBudgetStatus,
  getPreviousCompleteMonthKeys,
  mergeBudgetTemplates,
  pickSeedableSuggestions,
  roundSuggestedLimit,
  suggestCategoryBudgets,
} from './category-budgets';

const AS_OF = new Date('2026-07-15T12:00:00');

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

test('getPreviousCompleteMonthKeys — 3 meses anteriores a Jul/2026', () => {
  assert.deepEqual(getPreviousCompleteMonthKeys(3, AS_OF), ['2026-04', '2026-05', '2026-06']);
});

test('roundSuggestedLimit arredonda para múltiplos de 5', () => {
  assert.equal(roundSuggestedLimit(47), 50);
  assert.equal(roundSuggestedLimit(50), 50);
  assert.equal(roundSuggestedLimit(0), 0);
});

test('suggestCategoryBudgets — média 3 meses com mínimo 2 meses com gasto', () => {
  const transactions = [
    expense({ category: 'food', amount: 100, date: '2026-04-10' }),
    expense({ category: 'food', amount: 100, date: '2026-05-12' }),
    expense({ category: 'food', amount: 130, date: '2026-06-08' }),
    expense({ category: 'transport', amount: 40, date: '2026-06-01' }),
  ];

  const suggestions = suggestCategoryBudgets(transactions, AS_OF);

  const food = suggestions.find((item) => item.category === 'food');
  assert.ok(food);
  assert.equal(food.monthlyLimit, 110);
  assert.equal(food.monthsWithSpend, 3);

  assert.equal(suggestions.some((item) => item.category === 'transport'), false);
});

test('mergeBudgetTemplates — manual prevalece sobre sugerido', () => {
  const stored: CategoryBudget[] = [
    {
      id: '1',
      category: 'food',
      monthlyLimit: 200,
      source: 'manual',
    },
  ];
  const suggested = suggestCategoryBudgets(
    [
      expense({ category: 'food', amount: 90, date: '2026-04-01' }),
      expense({ category: 'food', amount: 90, date: '2026-05-01' }),
      expense({ category: 'food', amount: 90, date: '2026-06-01' }),
      expense({ category: 'shopping', amount: 50, date: '2026-04-01' }),
      expense({ category: 'shopping', amount: 50, date: '2026-05-01' }),
      expense({ category: 'shopping', amount: 50, date: '2026-06-01' }),
    ],
    AS_OF,
  );

  const merged = mergeBudgetTemplates(stored, suggested);
  const food = merged.find((item) => item.category === 'food');
  assert.equal(food?.monthlyLimit, 200);
  assert.equal(food?.source, 'manual');
  assert.ok(merged.some((item) => item.category === 'shopping'));
});

test('calculateCategoryBudgetStatus — níveis 80% e 100%', () => {
  const budgets: CategoryBudget[] = [
    { id: '1', category: 'food', monthlyLimit: 100, source: 'manual' },
    { id: '2', category: 'transport', monthlyLimit: 100, source: 'manual' },
    { id: '3', category: 'shopping', monthlyLimit: 100, source: 'manual' },
  ];
  const transactions = [
    expense({ category: 'food', amount: 85, date: '2026-07-05' }),
    expense({ category: 'transport', amount: 110, date: '2026-07-06' }),
    expense({ category: 'shopping', amount: 50, date: '2026-07-07' }),
  ];

  const statuses = calculateCategoryBudgetStatus(budgets, transactions, AS_OF);
  const food = statuses.find((item) => item.category === 'food');
  const transport = statuses.find((item) => item.category === 'transport');
  const shopping = statuses.find((item) => item.category === 'shopping');

  assert.equal(food?.level, 'warn80');
  assert.equal(transport?.level, 'over100');
  assert.equal(shopping?.level, 'ok');
});

test('pickSeedableSuggestions ignora categorias já persistidas', () => {
  const existing: CategoryBudget[] = [
    { id: '1', category: 'food', monthlyLimit: 100, source: 'manual' },
  ];
  const suggested = [
    { category: 'food', label: 'Alimentação', monthlyLimit: 90, monthsWithSpend: 3 },
    { category: 'transport', label: 'Transportes', monthlyLimit: 60, monthsWithSpend: 2 },
  ];

  const seedable = pickSeedableSuggestions(existing, suggested);
  assert.equal(seedable.length, 1);
  assert.equal(seedable[0]?.category, 'transport');
});
