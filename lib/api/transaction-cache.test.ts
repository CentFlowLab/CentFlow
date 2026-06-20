import assert from 'node:assert/strict';
import test from 'node:test';

import { QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/api/keys';
import {
  invalidateTransactionQueryTargets,
  TRANSACTION_INVALIDATION_ROOT_KEYS,
} from '@/lib/api/transaction-invalidation';
import {
  applyOptimisticTransactionDelete,
  applyOptimisticTransactionUpdate,
  getTransactionQueries,
  patchTransactionCaches,
} from '@/lib/api/transaction-cache';
import type { Transaction } from '@/lib/domain/transaction.types';

function sampleTransaction(id: string, amount = 10): Transaction {
  return {
    id,
    type: 'expense',
    amount,
    category: 'food',
    categoryLabel: 'Alimentação',
    date: '2026-06-15',
    currency: 'EUR',
  };
}

test('applyOptimisticTransactionUpdate altera campos do movimento', () => {
  const updated = applyOptimisticTransactionUpdate([sampleTransaction('tx-1', 10)], 'tx-1', {
    type: 'expense',
    amount: 25,
    category: 'food',
    description: 'Atualizado',
    date: '2026-06-16',
  });

  assert.equal(updated[0]?.amount, 25);
  assert.equal(updated[0]?.description, 'Atualizado');
});

test('applyOptimisticTransactionDelete remove movimento', () => {
  const remaining = applyOptimisticTransactionDelete(
    [sampleTransaction('tx-1'), sampleTransaction('tx-2')],
    'tx-1',
  );
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0]?.id, 'tx-2');
});

test('patchTransactionCaches aplica update optimista no QueryClient', () => {
  const queryClient = new QueryClient();
  const key = queryKeys.transactions({ filter: 'all' });
  queryClient.setQueryData(key, [sampleTransaction('tx-1', 10)]);

  patchTransactionCaches(queryClient, (transactions) =>
    applyOptimisticTransactionUpdate(transactions, 'tx-1', {
      type: 'expense',
      amount: 25,
      category: 'food',
      description: 'Atualizado',
      date: '2026-06-16',
    }),
  );

  const updated = queryClient.getQueryData<Transaction[]>(key);
  assert.equal(updated?.[0]?.amount, 25);
});

test('getTransactionQueries devolve snapshots de todas as queries de transacções', () => {
  const queryClient = new QueryClient();
  const allKey = queryKeys.transactions({ filter: 'all' });
  const expenseKey = queryKeys.transactions({ filter: 'expense' });
  queryClient.setQueryData(allKey, [sampleTransaction('tx-1')]);
  queryClient.setQueryData(expenseKey, [sampleTransaction('tx-1')]);

  const snapshot = getTransactionQueries(queryClient);
  assert.equal(snapshot.length, 2);
});

test('invalidateTransactionQueryTargets marca home e transacções como stale', async () => {
  const queryClient = new QueryClient();
  const invalidated: string[] = [];

  const original = queryClient.invalidateQueries.bind(queryClient);
  queryClient.invalidateQueries = ((filters) => {
    invalidated.push(JSON.stringify(filters?.queryKey));
    return original(filters);
  }) as typeof queryClient.invalidateQueries;

  await invalidateTransactionQueryTargets(queryClient);

  assert.ok(invalidated.some((key) => key.includes('transactions')));
  assert.ok(invalidated.some((key) => key.includes('home')));
});

test('TRANSACTION_INVALIDATION_ROOT_KEYS cobre áreas financeiras principais', () => {
  assert.ok(TRANSACTION_INVALIDATION_ROOT_KEYS.includes('transactions'));
  assert.ok(TRANSACTION_INVALIDATION_ROOT_KEYS.includes('home'));
  assert.ok(TRANSACTION_INVALIDATION_ROOT_KEYS.includes('netWorth'));
});
