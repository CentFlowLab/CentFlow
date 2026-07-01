import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getExpenseTotal,
  getIncomeTotal,
  getNetCashflow,
  sumTransactionCashBalance,
  transactionCashDelta,
} from '@/lib/domain/financial/transactions';
import type { Transaction } from '@/lib/domain/transaction.types';

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

const JULY = { kind: 'month' as const, monthKey: '2026-07', asOf: new Date(2026, 6, 15) };

test('getIncomeTotal — receitas por período', () => {
  const transactions = [
    tx({ type: 'income', amount: 1000, date: '2026-07-01' }),
    tx({ type: 'income', amount: 500, date: '2026-06-30' }),
  ];
  assert.equal(getIncomeTotal(transactions, JULY), 1000);
});

test('getExpenseTotal — despesas por período', () => {
  const transactions = [
    tx({ type: 'expense', amount: 200, date: '2026-07-05' }),
    tx({ type: 'expense', amount: 50, date: '2026-06-20' }),
  ];
  assert.equal(getExpenseTotal(transactions, JULY), 200);
});

test('transferências ignoradas em receitas/despesas', () => {
  const transactions = [
    tx({ type: 'transfer', amount: 300, date: '2026-07-02' }),
    tx({ type: 'income', amount: 100, date: '2026-07-02' }),
  ];
  assert.equal(getIncomeTotal(transactions, JULY), 100);
  assert.equal(getExpenseTotal(transactions, JULY), 0);
  assert.equal(transactionCashDelta({ type: 'transfer', amount: 300 }), 0);
});

test('getNetCashflow — líquido do período', () => {
  const transactions = [
    tx({ type: 'income', amount: 1000, date: '2026-07-01' }),
    tx({ type: 'expense', amount: 400, date: '2026-07-10' }),
  ];
  assert.equal(getNetCashflow(transactions, JULY), 600);
});

test('sumTransactionCashBalance — movimentos futuros separados', () => {
  const asOf = new Date(2026, 6, 1);
  const transactions = [
    tx({ type: 'income', amount: 100, date: '2026-07-01' }),
    tx({ type: 'expense', amount: 50, date: '2026-07-15' }),
  ];
  assert.equal(sumTransactionCashBalance(transactions, 'occurred', asOf), 100);
  assert.equal(sumTransactionCashBalance(transactions, 'future', asOf), -50);
});
