import assert from 'node:assert/strict';
import test from 'node:test';

import type { BankAccount } from '@/lib/domain/account.types';
import type { Credit } from '@/lib/domain/types';

import { buildDebtAmortizationAction } from './debt-amortization-action';
import { calculateRealSavingsMargin } from './savings-margin';
import type { Transaction } from '@/lib/domain/transaction.types';

function account(partial: Partial<BankAccount> & Pick<BankAccount, 'id'>): BankAccount {
  return {
    name: partial.name ?? 'Conta',
    type: partial.type ?? 'checking',
    currency: 'EUR',
    initialBalance: partial.initialBalance ?? 0,
    isActive: partial.isActive ?? true,
    budgetEnabled: partial.budgetEnabled ?? true,
    ...partial,
  };
}

function credit(partial: Partial<Credit> & Pick<Credit, 'id'>): Credit {
  return {
    name: partial.name ?? 'Cartão',
    outstandingBalance: partial.outstandingBalance ?? 1000,
    creditType: partial.creditType ?? 'card',
    ...partial,
  };
}

test('buildDebtAmortizationAction — prioridade ON com margem', () => {
  const asOf = new Date('2026-07-05T12:00:00');
  const transactions = [] as Transaction[];
  const margin = calculateRealSavingsMargin(1158.3, transactions, asOf);

  const action = buildDebtAmortizationAction({
    margin,
    credits: [credit({ id: 'card1', name: 'Gold', outstandingBalance: 4664 })],
    accounts: [account({ id: 'a1', initialBalance: 2000, balance: 2000 })],
    prioritizeDebt: true,
  });

  assert.ok(action);
  assert.equal(action?.isCard, true);
  assert.ok(action!.amount > 0);
  assert.ok(action!.amount <= margin.cappedActionBudget);
});

test('buildDebtAmortizationAction — OFF não sugere', () => {
  const margin = calculateRealSavingsMargin(500, [], new Date('2026-07-05T12:00:00'));
  const action = buildDebtAmortizationAction({
    margin,
    credits: [credit({ id: 'c1', outstandingBalance: 1000 })],
    accounts: [account({ id: 'a1', initialBalance: 500, balance: 500 })],
    prioritizeDebt: false,
  });
  assert.equal(action, null);
});
