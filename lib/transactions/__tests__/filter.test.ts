import assert from 'node:assert/strict';
import test from 'node:test';

import type { Transaction } from '@/lib/domain/transaction.types';
import { filterTransactionsBySearch } from '@/lib/domain/transaction-search';

function tx(
  partial: Pick<Transaction, 'type' | 'amount' | 'date'> & Partial<Transaction>,
): Transaction {
  return {
    id: partial.id ?? 'tx-1',
    category: partial.category ?? 'supermarket',
    categoryLabel: partial.categoryLabel ?? 'Supermercado',
    type: partial.type,
    amount: partial.amount,
    date: partial.date,
    description: partial.description,
    currency: 'EUR',
    accountId: partial.accountId,
    creditId: partial.creditId,
  };
}

test('filtro Despesas inclui compras no cartão de hoje', () => {
  const today = '2026-07-03';
  const transactions = [
    tx({
      id: '1',
      type: 'expense',
      amount: 12,
      date: today,
      description: 'Continente',
    }),
    tx({
      id: '2',
      type: 'credit_card_purchase',
      amount: 45,
      date: today,
      description: 'Zara',
      creditId: 'card-1',
    }),
    tx({
      id: '3',
      type: 'income',
      amount: 1000,
      date: today,
      description: 'Salário',
    }),
  ];

  const result = filterTransactionsBySearch(transactions, {
    query: '',
    typeFilter: 'expense',
  });

  assert.equal(result.length, 2);
  assert.ok(result.some((item) => item.id === '1'));
  assert.ok(result.some((item) => item.id === '2'));
});

test('filtro Despesas inclui despesas legadas com creditId', () => {
  const transactions = [
    tx({
      id: 'legacy',
      type: 'expense',
      amount: 20,
      date: '2026-07-03',
      creditId: 'card-legacy',
    }),
  ];

  const result = filterTransactionsBySearch(transactions, {
    query: '',
    typeFilter: 'expense',
  });

  assert.equal(result.length, 1);
  assert.equal(result[0]!.id, 'legacy');
});
