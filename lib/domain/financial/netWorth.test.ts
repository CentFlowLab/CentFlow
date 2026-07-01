import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateConsolidatedNetWorth } from '@/lib/domain/financial/netWorth';

test('património = contas + objetivos + inventário − créditos', () => {
  const result = calculateConsolidatedNetWorth({
    accounts: [{ id: '1', name: 'Conta', balance: 1000, currency: 'EUR' }],
    goals: [{ current: 300 }],
    inventory: [{ id: 'inv', name: 'Item', value: 200 }],
    credits: [{ id: 'c1', name: 'Crédito', outstandingBalance: 400 }],
  });

  assert.equal(result.netWorth, 1100);
});

test('contribuição para objetivo não reduz património (reservado em savings)', () => {
  const withGoals = calculateConsolidatedNetWorth({
    accounts: [{ id: '1', name: 'Conta', balance: 800, currency: 'EUR' }],
    goals: [{ current: 200 }],
    inventory: [],
    credits: [],
  });
  assert.equal(withGoals.netWorth, 1000);
});
