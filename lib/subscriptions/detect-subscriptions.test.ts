import assert from 'node:assert/strict';
import test from 'node:test';

import type { Subscription } from '@/lib/domain/assets.types';
import type { Transaction } from '@/lib/domain/transaction.types';
import { detectSubscriptionsFromTransactions } from '@/lib/subscriptions/detect-subscriptions';

function expense(
  id: string,
  description: string,
  amount: number,
  date: string,
): Transaction {
  return {
    id,
    type: 'expense',
    amount,
    category: 'subscriptions',
    categoryLabel: 'Subscrições',
    description,
    date,
    currency: 'EUR',
  };
}

test('detects monthly Netflix pattern', () => {
  const transactions = [
    expense('1', 'Netflix', 15.99, '2026-04-01'),
    expense('2', 'Netflix', 15.99, '2026-05-02'),
  ];

  const detected = detectSubscriptionsFromTransactions(transactions, []);
  assert.equal(detected.length, 1);
  assert.equal(detected[0]?.billingInterval, 'monthly');
  assert.equal(detected[0]?.name, 'Netflix');
});

test('detects quarterly pattern', () => {
  const transactions = [
    expense('1', 'Adobe Creative', 179.97, '2026-01-10'),
    expense('2', 'Adobe Creative', 179.97, '2026-04-12'),
  ];

  const detected = detectSubscriptionsFromTransactions(transactions, []);
  assert.equal(detected.length, 1);
  assert.equal(detected[0]?.billingInterval, 'quarterly');
});

test('skips already registered subscriptions', () => {
  const transactions = [
    expense('1', 'Spotify', 9.99, '2026-04-01'),
    expense('2', 'Spotify', 9.99, '2026-05-01'),
  ];
  const existing: Subscription[] = [
    { id: 'sub-1', name: 'Spotify', amount: 9.99, billingInterval: 'monthly' },
  ];

  const detected = detectSubscriptionsFromTransactions(transactions, existing);
  assert.equal(detected.length, 0);
});
