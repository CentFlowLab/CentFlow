import assert from 'node:assert/strict';
import test from 'node:test';

import type { BankAccount } from '@/lib/domain/account.types';
import type { Subscription } from '@/lib/domain/assets.types';
import type { Credit } from '@/lib/domain/types';
import type { Transaction } from '@/lib/domain/transaction.types';

import { calculateFinancialState } from './financial-state';
import { simulateFinancialDecision } from './simulator';

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

function tx(partial: Pick<Transaction, 'type' | 'amount' | 'date'> & Partial<Transaction>): Transaction {
  return {
    id: partial.id ?? `tx-${partial.date}`,
    description: partial.description ?? 'Test',
    category: partial.category ?? 'other',
    categoryLabel: partial.categoryLabel ?? 'Outros',
    currency: 'EUR',
    ...partial,
  };
}

function baseState(overrides: Partial<Parameters<typeof calculateFinancialState>[0]> = {}) {
  return calculateFinancialState({ transactions: [], today: AS_OF, ...overrides });
}

test('1. simular amortização não altera dados reais', () => {
  const accounts = [
    account({ id: 'inv', name: 'Robinhood', type: 'investment', initialBalance: 7011.72, budgetEnabled: false }),
    account({ id: 'chk', name: 'Moey', type: 'checking', initialBalance: 1000, budgetEnabled: true }),
  ];
  const credits: Credit[] = [
    {
      id: 'loan1',
      name: 'Crédito Pessoal',
      outstandingBalance: 17133.55,
      monthlyPayment: 250,
      interestRateAnnual: 11.29,
      creditType: 'personal',
    },
  ];

  const stateBefore = baseState({ accounts, credits });
  const result = simulateFinancialDecision({
    financialState: stateBefore,
    scenario: { type: 'amortize_credit', creditId: 'loan1', accountId: 'inv', amount: 1000 },
  });

  const stateAfter = baseState({ accounts, credits });
  assert.equal(stateAfter.credits[0]?.outstandingBalance, 17133.55);
  assert.equal(stateAfter.accounts.find((a) => a.id === 'inv')?.balance, 7011.72);
  assert.equal(result.after.credits[0]?.balance, 16133.55);
  assert.equal(result.after.accounts.find((a) => a.id === 'inv')?.balance, 6011.72);
  assert.equal(result.isReadOnly, true);
});

test('2. simular pagamento cartão não duplica despesa', () => {
  const accounts = [account({ id: 'a1', initialBalance: 2000, budgetEnabled: true })];
  const credits: Credit[] = [
    {
      id: 'card1',
      name: 'Visa',
      outstandingBalance: 500,
      originalAmount: 5000,
      creditType: 'card',
    },
  ];

  const state = baseState({
    accounts,
    credits,
    transactions: [
      tx({ id: '1', type: 'credit_card_purchase', amount: 200, date: '2026-06-10', creditId: 'card1' }),
    ],
  });

  const result = simulateFinancialDecision({
    financialState: state,
    scenario: { type: 'pay_credit_card', creditId: 'card1', accountId: 'a1', amount: 200 },
  });

  assert.equal(result.after.monthlyExpenses, state.cashFlow.monthlyExpenses);
  assert.ok(result.explanation.unchanged.some((line) => line.includes('consumo')));
});

test('3. simular objetivo baixa orçamento simulado', () => {
  const accounts = [account({ id: 'a1', initialBalance: 1500, budgetEnabled: true })];
  const state = baseState({
    accounts,
    goals: [{ id: 'g1', name: 'Férias', target: 3000, current: 500 }],
  });

  const result = simulateFinancialDecision({
    financialState: state,
    scenario: { type: 'contribute_goal', goalId: 'g1', accountId: 'a1', amount: 200 },
  });

  assert.ok(result.after.availableThisMonth < result.before.availableThisMonth);
  assert.equal(result.after.goals[0]?.current, 700);
});

test('4. simular cancelamento recorrente aumenta disponível futuro', () => {
  const subscriptions: Subscription[] = [
    { id: 'sub1', name: 'Net Vodafone', amount: 28, billingInterval: 'monthly' },
  ];
  const state = baseState({
    accounts: [account({ id: 'a1', initialBalance: 500, budgetEnabled: true })],
    subscriptions,
  });

  const result = simulateFinancialDecision({
    financialState: state,
    scenario: { type: 'cancel_subscription', subscriptionId: 'sub1' },
  });

  assert.ok(result.after.availableThisMonth > result.before.availableThisMonth);
  assert.ok(result.explanation.summary.includes('28'));
});

test('5. simular transferência investimento baixa orçamento mas mantém património', () => {
  const accounts = [
    account({ id: 'chk', initialBalance: 2000, budgetEnabled: true }),
    account({ id: 'inv', name: 'Invest', type: 'investment', initialBalance: 1000, budgetEnabled: false }),
  ];
  const state = baseState({ accounts });

  const result = simulateFinancialDecision({
    financialState: state,
    scenario: {
      type: 'transfer_to_investment',
      fromAccountId: 'chk',
      toAccountId: 'inv',
      amount: 500,
    },
  });

  assert.ok(result.after.availableThisMonth < result.before.availableThisMonth);
  assert.equal(result.after.netWorth, result.before.netWorth);
});

test('6. simular retirar investimento aumenta orçamento', () => {
  const accounts = [
    account({ id: 'chk', initialBalance: 500, budgetEnabled: true }),
    account({ id: 'inv', type: 'investment', initialBalance: 3000, budgetEnabled: false }),
  ];
  const state = baseState({ accounts });

  const result = simulateFinancialDecision({
    financialState: state,
    scenario: {
      type: 'withdraw_investment',
      fromAccountId: 'inv',
      toAccountId: 'chk',
      amount: 800,
    },
  });

  assert.ok(result.after.availableThisMonth > result.before.availableThisMonth);
});

test('7. simular aumento rendimento aumenta cashflow', () => {
  const state = baseState({
    accounts: [account({ id: 'a1', initialBalance: 1000, budgetEnabled: true })],
    transactions: [
      tx({ id: '1', type: 'income', amount: 1500, date: '2026-06-01', accountId: 'a1' }),
    ],
  });

  const result = simulateFinancialDecision({
    financialState: state,
    scenario: { type: 'increase_monthly_income', amount: 300 },
  });

  assert.ok(result.after.monthlyIncome > result.before.monthlyIncome);
  assert.ok(result.after.availableThisMonth > result.before.availableThisMonth);
});

test('8. simular redução categoria melhora savings rate', () => {
  const state = baseState({
    accounts: [account({ id: 'a1', initialBalance: 1000, budgetEnabled: true })],
    transactions: [
      tx({ id: '1', type: 'income', amount: 2000, date: '2026-06-01', accountId: 'a1' }),
      tx({ id: '2', type: 'expense', amount: 800, date: '2026-06-05', accountId: 'a1', category: 'food' }),
    ],
  });

  const result = simulateFinancialDecision({
    financialState: state,
    scenario: {
      type: 'reduce_category_spending',
      categoryKey: 'food',
      categoryLabel: 'Alimentação',
      reductionPercent: 20,
    },
    categorySpending: { food: 200 },
  });

  assert.ok(result.after.savingsRate >= result.before.savingsRate);
  assert.ok(result.after.monthlyExpenses < result.before.monthlyExpenses);
});

test('9. todas as simulações têm explanation', () => {
  const state = baseState({
    accounts: [
      account({ id: 'a1', initialBalance: 2000, budgetEnabled: true }),
      account({ id: 'inv', type: 'investment', initialBalance: 5000, budgetEnabled: false }),
    ],
    credits: [
      { id: 'c1', name: 'Cartão', outstandingBalance: 300, creditType: 'card', originalAmount: 3000 },
      { id: 'l1', name: 'Empréstimo', outstandingBalance: 5000, creditType: 'personal', monthlyPayment: 200 },
    ],
    goals: [{ id: 'g1', name: 'Meta', target: 1000, current: 200 }],
    subscriptions: [{ id: 's1', name: 'Spotify', amount: 10, billingInterval: 'monthly' }],
  });

  const scenarios = [
    { type: 'amortize_credit' as const, creditId: 'l1', accountId: 'inv', amount: 500 },
    { type: 'pay_credit_card' as const, creditId: 'c1', accountId: 'a1', amount: 100 },
    { type: 'contribute_goal' as const, goalId: 'g1', accountId: 'a1', amount: 50 },
    { type: 'withdraw_goal' as const, goalId: 'g1', accountId: 'a1', amount: 50 },
    { type: 'transfer_to_investment' as const, fromAccountId: 'a1', toAccountId: 'inv', amount: 100 },
    { type: 'withdraw_investment' as const, fromAccountId: 'inv', toAccountId: 'a1', amount: 100 },
    { type: 'cancel_subscription' as const, subscriptionId: 's1' },
    { type: 'increase_monthly_savings' as const, amount: 100 },
    { type: 'reduce_category_spending' as const, categoryKey: 'food', reductionAmount: 20 },
    { type: 'increase_monthly_income' as const, amount: 200 },
  ];

  for (const scenario of scenarios) {
    const result = simulateFinancialDecision({
      financialState: state,
      scenario,
      categorySpending: { food: 100 },
    });
    assert.ok(result.explanation.changes.length > 0 || result.explanation.summary.length > 0);
    assert.ok(result.explanation.summary.length > 0);
  }
});

test('10. todas as simulações têm before/after', () => {
  const state = baseState({
    accounts: [account({ id: 'a1', initialBalance: 1500, budgetEnabled: true })],
    credits: [{ id: 'l1', name: 'Crédito', outstandingBalance: 3000, creditType: 'personal', monthlyPayment: 150 }],
  });

  const result = simulateFinancialDecision({
    financialState: state,
    scenario: { type: 'amortize_credit', creditId: 'l1', accountId: 'a1', amount: 300 },
  });

  assert.ok(result.before);
  assert.ok(result.after);
  assert.ok(result.impact.length > 0);
  assert.ok(result.recommendation.length > 0);
});
