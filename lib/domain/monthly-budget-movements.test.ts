import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateMonthlySpendable } from '@/lib/budget/calculateMonthlySpendable';
import {
  filterOccurredForBudgetMonth,
  incomeCountsForBudgetMonth,
} from '@/lib/domain/monthly-budget-movements';
import { summarizeCurrentMonth } from '@/lib/domain/transaction-grouping';
import type { Transaction } from '@/lib/domain/transaction.types';

const JULY_FIRST = new Date(2026, 6, 1);
const JUNE_LAST = new Date(2026, 5, 30);

function tx(
  partial: Pick<Transaction, 'type' | 'amount' | 'date'> & Partial<Transaction>,
): Transaction {
  return {
    id: partial.id ?? 'tx-1',
    description: partial.description ?? 'Test',
    category: partial.category ?? 'other',
    categoryLabel: partial.categoryLabel ?? 'Outros',
    type: partial.type,
    amount: partial.amount,
    date: partial.date,
    currency: 'EUR',
  };
}

test('receita dia 30/06 conta para junho, não julho', () => {
  const salary = tx({
    type: 'income',
    amount: 1090,
    date: '2026-06-30',
    category: 'salary',
  });

  assert.equal(incomeCountsForBudgetMonth(salary, JUNE_LAST), true);
  assert.equal(incomeCountsForBudgetMonth(salary, JULY_FIRST), false);

  const juneSummary = summarizeCurrentMonth([salary], JUNE_LAST);
  assert.equal(juneSummary.net, 1090);
});

test('receita dia 01/07 conta para julho', () => {
  const transactions = [
    tx({
      type: 'income',
      amount: 1090,
      date: '2026-06-30',
      category: 'salary',
    }),
    tx({ type: 'expense', amount: 200, date: '2026-07-01' }),
    tx({ type: 'income', amount: 500, date: '2026-07-01' }),
  ];

  const occurred = filterOccurredForBudgetMonth(transactions, JULY_FIRST);
  const result = calculateMonthlySpendable({
    currentBalance: 0,
    currentMonthMovements: occurred,
    referenceDate: JULY_FIRST,
  });

  assert.equal(result.remainingThisMonth, 300);
});

test('receita usa mês civil da data', () => {
  const income = tx({ type: 'income', amount: 500, date: '2026-07-01' });
  assert.equal(incomeCountsForBudgetMonth(income, JULY_FIRST), true);
});
