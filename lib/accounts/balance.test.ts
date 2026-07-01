import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateAccountBalance } from '@/lib/accounts/balance';
import {
  accountMovementDelta,
  goalContributionDelta,
  transactionCashDelta,
} from '@/lib/domain/financial-movement';
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

test('calculateAccountBalance — saldo inicial + movimentos da conta', () => {
  const balance = calculateAccountBalance({
    account: { id: 'acc-1', initialBalance: 1000 },
    transactions: [
      tx({ id: 'a', type: 'expense', amount: 200, accountId: 'acc-1' }),
      tx({ id: 'b', type: 'income', amount: 500, accountId: 'acc-1' }),
    ],
  });
  assert.equal(balance, 1300);
});

test('calculateAccountBalance — transferência reduz origem e aumenta destino', () => {
  const transfer = tx({
    id: 't',
    type: 'transfer',
    amount: 100,
    accountId: 'acc-1',
    destinationAccountId: 'acc-2',
  });

  assert.equal(
    calculateAccountBalance({
      account: { id: 'acc-1', initialBalance: 500 },
      transactions: [transfer],
    }),
    400,
  );
  assert.equal(
    calculateAccountBalance({
      account: { id: 'acc-2', initialBalance: 200 },
      transactions: [transfer],
    }),
    300,
  );
});

test('calculateAccountBalance — contribuição para objetivo reduz conta', () => {
  const balance = calculateAccountBalance({
    account: { id: 'acc-1', initialBalance: 371 },
    transactions: [],
    goalContributions: [{ id: 'g1', goalId: 'goal-1', accountId: 'acc-1', amount: 50, createdAt: '' }],
  });
  assert.equal(balance, 321);
});

test('transactionCashDelta — transferência não afecta fluxo de caixa', () => {
  assert.equal(transactionCashDelta({ type: 'transfer', amount: 50 }), 0);
});

test('accountMovementDelta — receita/despesa só na conta ligada', () => {
  const expense = tx({ type: 'expense', amount: 20, accountId: 'acc-1' });
  assert.equal(accountMovementDelta(expense, 'acc-1'), -20);
  assert.equal(accountMovementDelta(expense, 'acc-2'), 0);
});

test('goalContributionDelta — subtrai da conta de origem', () => {
  assert.equal(
    goalContributionDelta([{ accountId: 'acc-1', amount: 50 }], 'acc-1'),
    -50,
  );
});
