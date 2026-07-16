/**
 * Testes CREATE / UPDATE / DELETE — estado antes → mutação → estado depois.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { BankAccount } from '@/lib/domain/account.types';
import type { GoalContribution } from '@/lib/domain/goal-contribution.types';
import type { Transaction } from '@/lib/domain/transaction.types';
import type { Goal } from '@/lib/domain/assets.types';
import type { Credit } from '@/lib/domain/types';

import { calculateFinancialState } from './financial-state';

const AS_OF = new Date('2026-07-15T12:00:00');

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

function tx(
  partial: Pick<Transaction, 'type' | 'amount' | 'date'> & Partial<Transaction>,
): Transaction {
  return {
    id: partial.id ?? `tx-${partial.date}-${partial.amount}`,
    description: partial.description ?? 'Test',
    category: partial.category ?? 'other',
    categoryLabel: partial.categoryLabel ?? 'Outros',
    currency: partial.currency ?? 'EUR',
    ...partial,
  };
}

function stateFor(transactions: Transaction[], accounts: BankAccount[], credits: Credit[] = []) {
  return calculateFinancialState({
    transactions,
    accounts,
    credits,
    goals: [],
    goalContributions: [],
    subscriptions: [],
    loanPayments: [],
    today: AS_OF,
  });
}

test('CREATE transaction — despesa reduz saldo e património', () => {
  const accounts = [account({ id: 'a1', initialBalance: 1000 })];
  const before = stateFor([], accounts);
  assert.equal(before.netWorth.netWorth, 1000);

  const after = stateFor(
    [tx({ id: 'e1', type: 'expense', amount: 120, date: '2026-07-10', accountId: 'a1' })],
    accounts,
  );
  assert.equal(after.accounts[0]?.balance, 880);
  assert.equal(after.netWorth.netWorth, 880);
});

test('UPDATE transaction — reverter antigo e aplicar novo', () => {
  const accounts = [account({ id: 'a1', initialBalance: 1000 })];
  const original = tx({ id: 'e1', type: 'expense', amount: 100, date: '2026-07-05', accountId: 'a1' });
  const updated = tx({ id: 'e1', type: 'expense', amount: 250, date: '2026-07-05', accountId: 'a1' });

  const withOriginal = stateFor([original], accounts);
  assert.equal(withOriginal.accounts[0]?.balance, 900);

  const without = stateFor([], accounts);
  assert.equal(without.accounts[0]?.balance, 1000);

  const withUpdated = stateFor([updated], accounts);
  assert.equal(withUpdated.accounts[0]?.balance, 750);
});

test('DELETE transaction — reversão completa', () => {
  const accounts = [account({ id: 'a1', initialBalance: 500 })];
  const income = tx({ id: 'i1', type: 'income', amount: 300, date: '2026-07-02', accountId: 'a1' });

  const withTx = stateFor([income], accounts);
  assert.equal(withTx.accounts[0]?.balance, 800);

  const without = stateFor([], accounts);
  assert.equal(without.accounts[0]?.balance, 500);
  assert.equal(without.netWorth.netWorth, withTx.netWorth.netWorth - 300);
});

test('CREATE transfer — património inalterado, saldos movidos', () => {
  const accounts = [
    account({ id: 'a1', initialBalance: 1000 }),
    account({ id: 'a2', initialBalance: 200 }),
  ];
  const transfer = tx({
    id: 't1',
    type: 'transfer',
    amount: 150,
    date: '2026-07-04',
    accountId: 'a1',
    destinationAccountId: 'a2',
  });

  const before = stateFor([], accounts);
  const after = stateFor([transfer], accounts);

  assert.equal(before.netWorth.netWorth, after.netWorth.netWorth);
  assert.equal(after.accounts.find((a) => a.id === 'a1')?.balance, 850);
  assert.equal(after.accounts.find((a) => a.id === 'a2')?.balance, 350);
});

test('CREATE card purchase — dívida aumenta sem duplicar património', () => {
  const accounts = [account({ id: 'a1', initialBalance: 2000 })];
  const credits: Credit[] = [
    {
      id: 'card-1',
      name: 'Visa',
      creditType: 'card',
      outstandingBalance: 0,
      originalAmount: 3000,
    },
  ];
  const purchase = tx({
    id: 'buy',
    type: 'credit_card_purchase',
    amount: 80,
    date: '2026-07-03',
    creditId: 'card-1',
  });

  const before = stateFor([], accounts, credits);
  const after = stateFor([purchase], accounts, credits);

  assert.equal(before.netWorth.netWorth, 2000);
  assert.equal(after.creditCards[0]?.debt, 80);
});

test('CREATE refund — reduz consumo de orçamento', () => {
  const accounts = [account({ id: 'a1', initialBalance: 1000, budgetEnabled: true })];
  const credits: Credit[] = [
    {
      id: 'card-1',
      name: 'Visa',
      creditType: 'card',
      outstandingBalance: 100,
      originalAmount: 3000,
    },
  ];
  const purchase = tx({
    id: 'buy',
    type: 'credit_card_purchase',
    amount: 100,
    date: '2026-07-05',
    creditId: 'card-1',
  });
  const refund = tx({
    id: 'ref',
    type: 'credit_card_refund',
    amount: 40,
    date: '2026-07-08',
    creditId: 'card-1',
  });

  const withPurchase = stateFor([purchase], accounts, credits);
  const withRefund = stateFor([purchase, refund], accounts, credits);

  assert.equal(withPurchase.creditCards[0]?.debt, 100);
  assert.equal(withRefund.creditCards[0]?.debt, 60);
  assert.ok(withRefund.budget.consumptionSpending < withPurchase.budget.consumptionSpending);
});

test('CREATE goal contribution — progresso e saldo consistentes', () => {
  const accounts = [account({ id: 'a1', initialBalance: 1000 })];
  const goals: Goal[] = [
    { id: 'g1', name: 'Reserva', target: 5000, current: 0 },
  ];
  const contributions: GoalContribution[] = [
    { id: 'gc1', goalId: 'g1', amount: 300, createdAt: '2026-07-06T10:00:00Z', accountId: 'a1' },
  ];

  const state = calculateFinancialState({
    transactions: [],
    accounts,
    goals,
    goalContributions: contributions,
    credits: [],
    subscriptions: [],
    loanPayments: [],
    today: AS_OF,
  });

  const goal = state.goalProgress.find((g) => g.id === 'g1');
  assert.equal(goal?.current, 300);
  assert.equal(state.accounts[0]?.balance, 700);
  assert.equal(state.netWorth.netWorth, 1000);
});
