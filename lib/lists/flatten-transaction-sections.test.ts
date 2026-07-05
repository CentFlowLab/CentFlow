import assert from 'node:assert/strict';
import test from 'node:test';

import type { Transaction } from '@/lib/domain/transaction.types';
import { groupTransactionsByDay } from '@/lib/domain/transaction-grouping';

import { flattenTransactionSections } from './flatten-transaction-sections';

function tx(id: string, date: string): Transaction {
  return {
    id,
    type: 'expense',
    amount: 10,
    date,
    description: 'Test',
    category: 'other',
    categoryLabel: 'Outros',
    currency: 'EUR',
  };
}

test('flattenTransactionSections inclui headers e transacções na ordem', () => {
  const sections = groupTransactionsByDay([
    tx('a', '2026-07-05'),
    tx('b', '2026-07-04'),
    tx('c', '2026-07-04'),
  ]);

  const rows = flattenTransactionSections(sections);

  assert.ok(rows.some((row) => row.kind === 'header'));
  assert.equal(rows.filter((row) => row.kind === 'transaction').length, 3);
  assert.equal(rows[0].kind, 'header');
  assert.equal(rows[1].kind, 'transaction');
});

test('agrupa e achata 500 movimentos sem perder linhas', () => {
  const transactions = Array.from({ length: 500 }, (_, index) =>
    tx(`tx-${index}`, `2026-${String((index % 12) + 1).padStart(2, '0')}-${String((index % 28) + 1).padStart(2, '0')}`),
  );

  const sections = groupTransactionsByDay(transactions);
  const rows = flattenTransactionSections(sections);

  assert.equal(rows.filter((row) => row.kind === 'transaction').length, 500);
  assert.equal(rows.filter((row) => row.kind === 'header').length, sections.length);
});
