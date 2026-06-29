import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateAccountBalance } from '@/lib/accounts/balance';
import type { BankAccount } from '@/lib/domain/account.types';
import type { Transaction } from '@/lib/domain/transaction.types';

const account: BankAccount = {
  id: 'acc-1',
  name: 'Test',
  type: 'checking',
  initialBalance: 1000,
  isActive: true,
  currency: 'EUR',
};

test('calculateAccountBalance soma saldo inicial e movimentos', () => {
  const transactions: Transaction[] = [
    {
      id: '1',
      type: 'income',
      amount: 500,
      category: 'salary',
      categoryLabel: 'Salário',
      date: '2026-06-01',
      currency: 'EUR',
      accountId: 'acc-1',
    },
    {
      id: '2',
      type: 'expense',
      amount: 200,
      category: 'food',
      categoryLabel: 'Alimentação',
      date: '2026-06-02',
      currency: 'EUR',
      accountId: 'acc-1',
    },
    {
      id: '3',
      type: 'expense',
      amount: 50,
      category: 'food',
      categoryLabel: 'Alimentação',
      date: '2026-06-03',
      currency: 'EUR',
      accountId: 'acc-2',
    },
  ];

  assert.equal(calculateAccountBalance(account, transactions), 1300);
});
