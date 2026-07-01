import assert from 'node:assert/strict';
import test from 'node:test';

import type { Transaction } from '@/lib/domain/transaction.types';
import { filterTransactionsBySearch } from '@/lib/domain/transaction-search';

function tx(
  partial: Pick<Transaction, 'type' | 'amount' | 'date' | 'description'> &
    Partial<Transaction>,
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
  };
}

test('pesquisa por comerciante/descrição', () => {
  const transactions = [
    tx({ id: '1', type: 'expense', amount: 42, date: '2026-07-01', description: 'Continente' }),
    tx({ id: '2', type: 'expense', amount: 18, date: '2026-07-02', description: 'Galp' }),
  ];

  const result = filterTransactionsBySearch(transactions, {
    query: 'continente',
    typeFilter: 'all',
  });

  assert.equal(result.length, 1);
  assert.equal(result[0]!.description, 'Continente');
});

test('pesquisa por categoria mostra label, não key interna', () => {
  const transactions = [
    tx({
      id: '1',
      type: 'expense',
      amount: 90,
      date: '2026-07-01',
      description: 'Oficina',
      category: 'car_maintenance',
      categoryLabel: 'Manutenção auto',
    }),
  ];

  const byLabel = filterTransactionsBySearch(transactions, {
    query: 'manutenção',
    typeFilter: 'all',
  });
  assert.equal(byLabel.length, 1);

  const byKey = filterTransactionsBySearch(transactions, {
    query: 'car_maintenance',
    typeFilter: 'all',
  });
  assert.equal(byKey.length, 1);
});

test('filtro de tipo combina com pesquisa', () => {
  const transactions = [
    tx({ id: '1', type: 'expense', amount: 10, date: '2026-07-01', description: 'Spotify' }),
    tx({ id: '2', type: 'income', amount: 1500, date: '2026-07-01', description: 'Salário Spotify SA' }),
  ];

  const result = filterTransactionsBySearch(transactions, {
    query: 'spotify',
    typeFilter: 'expense',
  });

  assert.equal(result.length, 1);
  assert.equal(result[0]!.type, 'expense');
});

test('pesquisa por valor', () => {
  const transactions = [
    tx({ id: '1', type: 'expense', amount: 49.99, date: '2026-07-01', description: 'Lidl' }),
  ];

  const result = filterTransactionsBySearch(transactions, {
    query: '49,99',
    typeFilter: 'all',
  });

  assert.equal(result.length, 1);
});
