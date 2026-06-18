import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateNetWorth,
  sumCreditLiabilities,
  sumGoalSavings,
} from '@/lib/domain/net-worth.service';

test('calculateNetWorth includes accounts, inventory, savings and subtracts credits', () => {
  const result = calculateNetWorth({
    accounts: [{ id: '1', name: 'Conta', balance: 1000, currency: 'EUR' }],
    inventory: [{ id: 'inv-1', name: 'Portátil', value: 500 }],
    investments: [],
    savings: 300,
    credits: [
      { id: 'c1', name: 'Crédito pessoal', outstandingBalance: 400 },
    ],
  });

  assert.equal(result.breakdown.accounts, 1000);
  assert.equal(result.breakdown.inventory, 500);
  assert.equal(result.breakdown.savings, 300);
  assert.equal(result.breakdown.liabilities, 400);
  assert.equal(result.totalAssets, 1800);
  assert.equal(result.netWorth, 1400);
});

test('sumGoalSavings ignores negative balances', () => {
  assert.equal(
    sumGoalSavings([
      { current: 200 },
      { current: -50 },
      { current: 100 },
    ]),
    300,
  );
});

test('sumCreditLiabilities sums outstanding balances', () => {
  assert.equal(
    sumCreditLiabilities([
      { id: '1', name: 'A', outstandingBalance: 100 },
      { id: '2', name: 'B', outstandingBalance: 250 },
    ]),
    350,
  );
});

test('calculateNetWorth with no liabilities equals total assets', () => {
  const result = calculateNetWorth({
    accounts: [{ id: '1', name: 'Conta', balance: 50, currency: 'EUR' }],
    inventory: [],
    investments: [],
    credits: [],
  });

  assert.equal(result.netWorth, 50);
  assert.equal(result.totalLiabilities, 0);
});
