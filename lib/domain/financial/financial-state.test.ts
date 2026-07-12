import assert from 'node:assert/strict';
import test from 'node:test';

import type { BankAccount } from '@/lib/domain/account.types';
import type { Transaction } from '@/lib/domain/transaction.types';
import type { Credit } from '@/lib/domain/types';

import { calculateFinancialState } from './financial-state';
import { explainMonthlyAvailable } from './explain';
import { deriveEventsFromTransaction } from './events';

const AS_OF = new Date('2026-06-15T12:00:00');

function account(partial: Partial<BankAccount> & Pick<BankAccount, 'id'>): BankAccount {
  return {
    name: partial.name ?? 'Conta',
    type: partial.type ?? 'checking',
    currency: 'EUR',
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
    currency: partial.currency ?? 'EUR',
    ...partial,
  };
}

test('calculateFinancialState — receita aumenta disponível e cashflow', () => {
  const transactions = [
    tx({ id: '1', type: 'income', amount: 1000, date: '2026-06-10', accountId: 'a1' }),
    tx({ id: '2', type: 'expense', amount: 50, date: '2026-06-12', accountId: 'a1' }),
  ];

  const state = calculateFinancialState({
    accounts: [],
    transactions,
    today: AS_OF,
  });

  assert.equal(state.cashFlow.monthlyIncome, 1000);
  assert.equal(state.cashFlow.monthlyExpenses, 50);
  assert.equal(state.availableThisMonth, 950);
  assert.ok(state.budgetExplanation.lines.length > 0);
});

test('calculateFinancialState — compra cartão não baixa orçamento', () => {
  const credit: Credit = {
    id: 'c1',
    name: 'Visa',
    creditType: 'card',
    outstandingBalance: 0,
    originalAmount: 5000,
    monthlyPayment: 0,
    interestRateAnnual: 0,
  };

  const transactions = [
    tx({ id: '0', type: 'income', amount: 1000, date: '2026-06-01', accountId: 'a1' }),
    tx({
      id: '1',
      type: 'credit_card_purchase',
      amount: 200,
      date: '2026-06-10',
      creditId: 'c1',
    }),
  ];

  const state = calculateFinancialState({
    accounts: [],
    credits: [credit],
    transactions,
    today: AS_OF,
  });

  assert.equal(state.availableThisMonth, 1000);
  assert.equal(state.budget.components.creditCardPurchases, 200);
  assert.equal(state.creditCards[0]?.debt, 200);
});

test('calculateFinancialState — pagamento cartão baixa orçamento', () => {
  const credit: Credit = {
    id: 'c1',
    name: 'Visa',
    creditType: 'card',
    outstandingBalance: 300,
    originalAmount: 5000,
    monthlyPayment: 0,
    interestRateAnnual: 0,
  };

  const transactions = [
    tx({ id: '0', type: 'income', amount: 1000, date: '2026-06-01', accountId: 'a1' }),
    tx({
      id: '1',
      type: 'credit_card_payment',
      amount: 150,
      date: '2026-06-10',
      accountId: 'a1',
      creditId: 'c1',
    }),
  ];

  const state = calculateFinancialState({
    accounts: [],
    credits: [credit],
    transactions,
    today: AS_OF,
  });

  assert.equal(state.availableThisMonth, 850);
  assert.equal(state.budget.components.creditCardPayments, 150);
});

test('deriveEventsFromTransaction — receita propaga eventos', () => {
  const events = deriveEventsFromTransaction(
    tx({ id: '1', type: 'income', amount: 100, date: '2026-06-01', accountId: 'a1' }),
  );
  const types = events.map((e) => e.type);
  assert.ok(types.includes('BUDGET_UPDATED'));
  assert.ok(types.includes('CASHFLOW_UPDATED'));
});

test('explainMonthlyAvailable — resultado coerente com breakdown', () => {
  const accounts = [account({ id: 'a1', initialBalance: 937.2, budgetEnabled: true })];
  const state = calculateFinancialState({
    accounts,
    transactions: [],
    today: AS_OF,
  });

  const explanation = explainMonthlyAvailable(state.budget);
  assert.equal(explanation.result, state.availableThisMonth);
});

test('calculateFinancialState — health score explicável', () => {
  const state = calculateFinancialState({
    accounts: [account({ id: 'a1', initialBalance: 5000, budgetEnabled: true })],
    transactions: [
      tx({ id: '1', type: 'income', amount: 2000, date: '2026-06-01', accountId: 'a1' }),
      tx({ id: '2', type: 'expense', amount: 800, date: '2026-06-05', accountId: 'a1' }),
    ],
    today: AS_OF,
  });

  assert.ok(state.healthScore.score >= 0 && state.healthScore.score <= 100);
  assert.ok(state.healthScore.explanation.earned.length + state.healthScore.explanation.missing.length > 0);
});

test('calculateFinancialState — métricas derivadas', () => {
  const state = calculateFinancialState({
    accounts: [account({ id: 'a1', initialBalance: 2000, budgetEnabled: true })],
    transactions: [
      tx({ id: '1', type: 'income', amount: 1500, date: '2026-06-01', accountId: 'a1' }),
      tx({ id: '2', type: 'expense', amount: 500, date: '2026-06-05', accountId: 'a1' }),
    ],
    subscriptions: [{ id: 's1', name: 'Netflix', amount: 15, billingInterval: 'monthly' }],
    today: AS_OF,
  });

  assert.ok(state.metrics.savingsRate > 0);
  assert.ok(state.metrics.subscriptionLoad >= 0);
  assert.ok(state.calendar.length > 0);
});
