import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAttentionItems } from './attention-items';
import { composeDashboardFromLocalSources } from './dashboard.compose';
import type { Transaction } from './transaction.types';

const AS_OF = new Date('2026-06-19T12:00:00');

test('attentionItems inclui garantia crítica e subscrição próxima', () => {
  const items = buildAttentionItems({
    warranties: [{ id: 'w1', product: 'MacBook', expiresAt: '2026-06-25' }],
    credits: [],
    subscriptions: [{ id: 's1', name: 'Netflix', amount: 15.99, renewsAt: '2026-06-22' }],
    goals: [],
    asOf: AS_OF,
  });

  assert.ok(items.some((item) => item.type === 'warranty'));
  assert.ok(items.some((item) => item.type === 'subscription'));
});

test('attentionItems inclui crédito com prestação próxima', () => {
  const items = buildAttentionItems({
    warranties: [],
    credits: [
      {
        id: 'c1',
        name: 'Crédito auto',
        outstandingBalance: 8000,
        nextPaymentDate: '2026-06-24',
        nextPaymentAmount: 285,
      },
    ],
    subscriptions: [],
    goals: [],
    asOf: AS_OF,
  });

  assert.equal(items.length, 1);
  assert.equal(items[0]?.type, 'credit');
});

test('attentionItems inclui objetivo parado', () => {
  const items = buildAttentionItems({
    warranties: [],
    credits: [],
    subscriptions: [],
    goals: [{ id: 'g1', name: 'Férias', target: 2000, current: 0, deadline: '2026-12-31' }],
    asOf: AS_OF,
  });

  assert.ok(items.some((item) => item.type === 'goal' && item.title === 'Objetivo parado'));
});

test('composeDashboardFromLocalSources expõe attentionItems e delta mensal', () => {
  const transactions: Transaction[] = [
    {
      id: '1',
      type: 'income',
      amount: 1000,
      category: 'salary',
      categoryLabel: 'Salário',
      date: '2026-06-05',
      currency: 'EUR',
    },
    {
      id: '2',
      type: 'expense',
      amount: 200,
      category: 'food',
      categoryLabel: 'Alimentação',
      date: '2026-06-15',
      currency: 'EUR',
    },
  ];

  const result = composeDashboardFromLocalSources({
    transactions,
    assets: { goals: [], inventory: [], subscriptions: [], warranties: [], credits: [] },
    credits: [],
    asOf: AS_OF,
  });

  assert.equal(result.netWorth.netWorth, 800);
  assert.equal(result.netWorthChangeThisMonth, 800);
  assert.equal(result.previousMonthNetWorth, 0);
  assert.ok(Array.isArray(result.attentionItems));
});
