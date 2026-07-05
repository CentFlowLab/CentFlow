import assert from 'node:assert/strict';
import test from 'node:test';

import type { BankAccount } from '@/lib/domain/account.types';
import type { Goal } from '@/lib/domain/assets.types';

import { buildSavingsAllocationAction } from './savings-allocation';
import { calculateRealSavingsMargin } from './savings-margin';

function account(partial: Partial<BankAccount> & Pick<BankAccount, 'id'>): BankAccount {
  return {
    name: partial.name ?? 'Conta',
    type: partial.type ?? 'checking',
    currency: 'EUR',
    initialBalance: partial.initialBalance ?? 0,
    isActive: partial.isActive ?? true,
    ...partial,
  };
}

function goal(partial: Partial<Goal> & Pick<Goal, 'id'>): Goal {
  return {
    name: partial.name ?? 'Objetivo',
    target: partial.target ?? 1000,
    current: partial.current ?? 0,
    ...partial,
  };
}

function margin(available: number) {
  return calculateRealSavingsMargin(available, [], new Date('2026-07-05T12:00:00'));
}

test('buildSavingsAllocationAction — margem real e saldo suficientes', () => {
  const m = margin(200);
  const action = buildSavingsAllocationAction({
    margin: m,
    goals: [goal({ id: 'g1', name: 'Fundo', target: 1000, current: 200 })],
    accounts: [account({ id: 'a1', name: 'Moey', initialBalance: 500, balance: 500 })],
  });

  assert.ok(action);
  assert.equal(action.goalId, 'g1');
  assert.equal(action.accountId, 'a1');
  assert.equal(action.amount, 180);
});

test('buildSavingsAllocationAction — bloqueia sem saldo na conta', () => {
  const action = buildSavingsAllocationAction({
    margin: margin(200),
    goals: [goal({ id: 'g1', target: 1000, current: 0 })],
    accounts: [account({ id: 'a1', initialBalance: 5, balance: 5 })],
  });

  assert.equal(action, null);
});

test('buildSavingsAllocationAction — bloqueia sem margem disponível', () => {
  const action = buildSavingsAllocationAction({
    margin: margin(0),
    goals: [goal({ id: 'g1', target: 1000, current: 0 })],
    accounts: [account({ id: 'a1', initialBalance: 500, balance: 500 })],
  });

  assert.equal(action, null);
});

test('buildSavingsAllocationAction — ignora contas fora do orçamento', () => {
  const action = buildSavingsAllocationAction({
    margin: margin(100),
    goals: [goal({ id: 'g1', target: 500, current: 0 })],
    accounts: [
      account({
        id: 'inv',
        type: 'investment',
        initialBalance: 1000,
        balance: 1000,
        budgetEnabled: false,
      }),
    ],
  });

  assert.equal(action, null);
});
