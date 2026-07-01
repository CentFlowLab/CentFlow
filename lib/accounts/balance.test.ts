import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateAccountBalance } from '@/lib/accounts/balance';
import type { Transaction } from '@/lib/domain/transaction.types';

function tx(partial: Partial<Transaction> & Pick<Transaction, 'type' | 'amount'>): Transaction {
  return {
    id: '1',
    category: 'other',
    categoryLabel: 'Outros',
    date: '2026-07-01',
    currency: 'EUR',
    ...partial,
  };
}

test('calculateAccountBalance — saldo inicial + movimentos', () => {
  const balance = calculateAccountBalance(
    { initialBalance: 1000 },
    [
      tx({ id: 'a', type: 'expense', amount: 200, accountId: 'acc-1' }),
      tx({ id: 'b', type: 'income', amount: 500, accountId: 'acc-1' }),
    ],
  );
  assert.equal(balance, 1300);
});
