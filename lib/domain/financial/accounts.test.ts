import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateAccountBalance,
  calculateTotalAccountsBalance,
} from '@/lib/domain/financial/accounts';

test('saldo inicial + receita − despesa', () => {
  const balance = calculateAccountBalance({
    account: { id: 'acc-1', initialBalance: 1000 },
    transactions: [
      { id: '1', type: 'expense', amount: 200, accountId: 'acc-1', date: '2026-07-01', category: 'x', categoryLabel: 'X', currency: 'EUR' },
      { id: '2', type: 'income', amount: 500, accountId: 'acc-1', date: '2026-07-02', category: 'y', categoryLabel: 'Y', currency: 'EUR' },
    ],
  });
  assert.equal(balance, 1300);
});

test('contribuição para objetivo reduz saldo disponível', () => {
  const balance = calculateAccountBalance({
    account: { id: 'acc-1', initialBalance: 500 },
    transactions: [],
    goalContributions: [{ id: 'g1', goalId: 'goal-1', accountId: 'acc-1', amount: 75, createdAt: '' }],
  });
  assert.equal(balance, 425);
});

test('transferência entre contas — total conservado', () => {
  const transfer = {
    id: 't',
    type: 'transfer' as const,
    amount: 100,
    accountId: 'acc-1',
    destinationAccountId: 'acc-2',
    date: '2026-07-01',
    category: 'x',
    categoryLabel: 'X',
    currency: 'EUR',
  };
  const accounts = [
    { id: 'acc-1', name: 'A', initialBalance: 500, type: 'checking' as const, isActive: true, currency: 'EUR' },
    { id: 'acc-2', name: 'B', initialBalance: 200, type: 'checking' as const, isActive: true, currency: 'EUR' },
  ];
  const total = calculateTotalAccountsBalance(accounts, [transfer], []);
  assert.equal(total, 700);
});
