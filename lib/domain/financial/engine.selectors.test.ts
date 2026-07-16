/**
 * Consistência multi-ecrã — dívida e património derivam do mesmo FinancialState.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { BankAccount } from '@/lib/domain/account.types';
import type { Transaction } from '@/lib/domain/transaction.types';
import type { Credit } from '@/lib/domain/types';

import { calculateFinancialState } from './financial-state';
import {
  selectCreditCardDebts,
  selectCurrentNetWorth,
  selectDebtSummary,
  selectHomeFinancialSummary,
  selectLoanDebts,
} from './engine.selectors';

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
    currency: 'EUR',
    ...partial,
  };
}

function buildState(accounts: BankAccount[], transactions: Transaction[], credits: Credit[] = []) {
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

test('selectDebtSummary — alinha com creditSummary do motor', () => {
  const credits: Credit[] = [
    {
      id: 'loan-1',
      name: 'Empréstimo',
      outstandingBalance: 5000,
      creditType: 'personal',
      nextPaymentAmount: 200,
    },
    {
      id: 'card-1',
      name: 'Visa',
      outstandingBalance: 0,
      creditType: 'card',
      originalAmount: 3000,
      interestRateAnnual: 18,
    },
  ];
  const accounts = [account({ id: 'a1', initialBalance: 2000 })];
  const transactions = [
    tx({
      id: 'p1',
      type: 'credit_card_purchase',
      amount: 400,
      date: '2026-07-10',
      creditId: 'card-1',
      accountId: 'a1',
    }),
  ];

  const state = buildState(accounts, transactions, credits);
  const summary = selectDebtSummary(state);

  assert.equal(summary.totalDebt, state.creditSummary.totalDebt);
  assert.equal(summary.cardDebt + summary.loanDebt, state.creditSummary.totalDebt);
  assert.equal(summary.monthlyPayments, state.creditSummary.monthlyPayments);
  assert.equal(summary.cardCount, state.creditSummary.cardCount);
  assert.equal(summary.loanCount, state.creditSummary.loanCount);
});

test('selectCreditCardDebts + selectLoanDebts — somam totalDebt', () => {
  const credits: Credit[] = [
    {
      id: 'loan-1',
      name: 'Auto',
      outstandingBalance: 3000,
      creditType: 'auto',
    },
    {
      id: 'card-1',
      name: 'MC',
      outstandingBalance: 0,
      creditType: 'card',
      originalAmount: 2000,
      interestRateAnnual: 15,
    },
  ];
  const accounts = [account({ id: 'a1', initialBalance: 1000 })];
  const transactions = [
    tx({
      id: 'p1',
      type: 'credit_card_purchase',
      amount: 150,
      date: '2026-07-08',
      creditId: 'card-1',
    }),
  ];

  const state = buildState(accounts, transactions, credits);
  const cards = selectCreditCardDebts(state);
  const loans = selectLoanDebts(state);
  const summary = selectDebtSummary(state);

  const cardSum = cards.reduce((s, c) => s + c.debt, 0);
  const loanSum = loans.reduce((s, l) => s + l.outstandingBalance, 0);

  assert.equal(cardSum, summary.cardDebt);
  assert.equal(loanSum, summary.loanDebt);
  assert.equal(cardSum + loanSum, summary.totalDebt);
});

test('selectHomeFinancialSummary — património e dívida coerentes com motor', () => {
  const accounts = [account({ id: 'a1', initialBalance: 5000 })];
  const credits: Credit[] = [
    { id: 'loan-1', name: 'CH', outstandingBalance: 1000, creditType: 'mortgage' },
  ];
  const state = buildState(accounts, [], credits);
  const home = selectHomeFinancialSummary(state);

  assert.equal(home.netWorth, selectCurrentNetWorth(state));
  assert.equal(home.availableThisMonth, state.availableThisMonth);
  assert.equal(selectDebtSummary(state).totalDebt, state.creditSummary.totalDebt);
});

test('seletores — execução < 10ms em dataset moderado', () => {
  const accounts = [account({ id: 'a1', initialBalance: 10_000 })];
  const transactions: Transaction[] = [];
  for (let i = 0; i < 500; i++) {
    transactions.push(
      tx({
        id: `e-${i}`,
        type: 'expense',
        amount: 10 + (i % 5),
        date: `2026-07-${String((i % 28) + 1).padStart(2, '0')}`,
        accountId: 'a1',
      }),
    );
  }
  const state = buildState(accounts, transactions);

  const start = performance.now();
  for (let i = 0; i < 100; i++) {
    selectDebtSummary(state);
    selectCreditCardDebts(state);
    selectLoanDebts(state);
    selectHomeFinancialSummary(state);
  }
  const elapsed = performance.now() - start;
  assert.ok(elapsed < 50, `seletores demasiado lentos: ${elapsed.toFixed(1)}ms / 100 iterações`);
});
