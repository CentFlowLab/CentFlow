/**
 * Integração — mutações de contas reflectidas no motor financeiro.
 * Invalidação de cache testada indirectamente via impacto em calculateFinancialState.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { BankAccount } from '@/lib/domain/account.types';
import type { Transaction } from '@/lib/domain/transaction.types';

import { calculateFinancialState } from './financial-state';

const AS_OF = new Date('2026-07-15T12:00:00');

function account(partial: Partial<BankAccount> & Pick<BankAccount, 'id'>): BankAccount {
  return {
    name: partial.name ?? 'Conta',
    type: partial.type ?? 'checking',
    currency: partial.currency ?? 'EUR',
    initialBalance: partial.initialBalance ?? 0,
    isActive: partial.isActive ?? true,
    budgetEnabled: partial.budgetEnabled,
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
    currency: 'EUR',
    ...partial,
  };
}

function stateFor(accounts: BankAccount[], transactions: Transaction[] = []) {
  return calculateFinancialState({
    transactions,
    accounts,
    credits: [],
    goals: [],
    goalContributions: [],
    subscriptions: [],
    loanPayments: [],
    today: AS_OF,
  });
}

test('1. criar conta com saldo inicial — entra no património', () => {
  const accounts = [account({ id: 'new-1', name: 'Nova', initialBalance: 1500 })];
  const state = stateFor(accounts);
  assert.equal(state.accounts[0]?.balance, 1500);
  assert.equal(state.netWorth.netWorth, 1500);
});

test('2. editar saldo inicial — património actualiza', () => {
  const before = stateFor([account({ id: 'a1', initialBalance: 1000 })]);
  const after = stateFor([account({ id: 'a1', initialBalance: 2500 })]);
  assert.equal(after.netWorth.netWorth - before.netWorth.netWorth, 1500);
});

test('3. budget_enabled false — conta excluída do orçamento', () => {
  const included = stateFor([
    account({ id: 'a1', initialBalance: 1000, budgetEnabled: true }),
  ]);
  const excluded = stateFor([
    account({ id: 'a1', initialBalance: 1000, budgetEnabled: false }),
  ]);
  assert.ok(included.budget.components.budgetAccountBalance >= 1000);
  assert.equal(excluded.budget.components.budgetAccountBalance, 0);
});

test('4. tipo investment — reflectido em investmentSummary sem duplicar património', () => {
  const checking = stateFor([account({ id: 'a1', type: 'checking', initialBalance: 1000 })]);
  const investment = stateFor([
    account({ id: 'inv-1', type: 'investment', initialBalance: 5000 }),
  ]);
  assert.equal(checking.investmentSummary.totalBalance, 0);
  assert.equal(investment.investmentSummary.totalBalance, 5000);
  assert.equal(investment.netWorth.netWorth, 5000);
  assert.equal(investment.netWorth.breakdown.investments, 0);
});

test('5. arquivar conta — saldo activo excluído do património', () => {
  const active = stateFor([account({ id: 'a1', initialBalance: 800, isActive: true })]);
  const archived = stateFor([account({ id: 'a1', initialBalance: 800, isActive: false })]);
  assert.equal(active.netWorth.netWorth, 800);
  assert.equal(archived.netWorth.netWorth, 0);
});

test('6. restaurar conta — património volta a incluir saldo', () => {
  const archived = stateFor([account({ id: 'a1', initialBalance: 600, isActive: false })]);
  const restored = stateFor([account({ id: 'a1', initialBalance: 600, isActive: true })]);
  assert.equal(archived.netWorth.netWorth, 0);
  assert.equal(restored.netWorth.netWorth, 600);
});

test('7. eliminar conta sem movimentos — património a zero', () => {
  const withAccount = stateFor([account({ id: 'a1', initialBalance: 400 })]);
  const without = stateFor([]);
  assert.equal(withAccount.netWorth.netWorth, 400);
  assert.equal(without.netWorth.netWorth, 0);
});

test('8. conta com movimentos — saldo deriva do ledger, não só initialBalance', () => {
  const accounts = [account({ id: 'a1', initialBalance: 1000 })];
  const transactions = [
    tx({ id: 'e1', type: 'expense', amount: 300, date: '2026-07-10', accountId: 'a1' }),
  ];
  const state = stateFor(accounts, transactions);
  assert.equal(state.accounts[0]?.balance, 700);
  assert.equal(state.netWorth.netWorth, 700);
  // Eliminar conta com movimentos na API é bloqueado — aqui validamos que o ledger prevalece
  assert.notEqual(state.accounts[0]?.balance, accounts[0]?.initialBalance);
});
