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
    budgetMonth: partial.budgetMonth,
  };
}

test('salário dia 30/06 com mês financeiro Julho entra no disponível de Julho', () => {
  const transactions = [
    tx({
      id: 'salary',
      type: 'income',
      amount: 1090,
      date: '2026-06-30',
      category: 'salary',
      budgetMonth: '2026-07',
    }),
    tx({ id: 'july-exp', type: 'expense', amount: 200, date: '2026-07-01' }),
  ];

  assert.equal(incomeCountsForBudgetMonth(transactions[0]!, JULY_FIRST), true);
  assert.equal(incomeCountsForBudgetMonth(transactions[0]!, JUNE_LAST), false);

  const occurred = filterOccurredForBudgetMonth(transactions, JULY_FIRST);
  const result = calculateMonthlySpendable({
    currentBalance: 0,
    currentMonthMovements: occurred,
    referenceDate: JULY_FIRST,
  });

  assert.equal(result.remainingThisMonth, 890);
});

test('Junho não fica inflacionado quando salário é para Julho', () => {
  const transactions = [
    tx({
      type: 'income',
      amount: 1090,
      date: '2026-06-30',
      category: 'salary',
      budgetMonth: '2026-07',
    }),
    tx({ type: 'expense', amount: 300, date: '2026-06-15' }),
  ];

  const juneSummary = summarizeCurrentMonth(transactions, JUNE_LAST);
  assert.equal(juneSummary.net, -300);
});

test('receita sem budget_month usa mês da data', () => {
  const income = tx({ type: 'income', amount: 500, date: '2026-07-01' });
  assert.equal(incomeCountsForBudgetMonth(income, JULY_FIRST), true);
});
