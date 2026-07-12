import assert from 'node:assert/strict';
import test from 'node:test';

import type { BankAccount } from '@/lib/domain/account.types';
import type { Credit } from '@/lib/domain/types';
import type { Transaction } from '@/lib/domain/transaction.types';

import { buildMonthlyAvailableBreakdown } from '@/lib/domain/financial/monthly-available.compose';
import {
  calculateAccountImpact,
  calculateBudgetImpact,
  calculateCreditCardImpact,
} from '@/lib/domain/financial/ledger-impact';
import {
  calculateDebtAmortizationImpact,
  calculateMonthlyLoanPaymentImpact,
} from '@/lib/domain/financial/loan-payments';

const JULY = new Date(2026, 6, 15);

function budgetAccount(id: string, initialBalance: number): BankAccount {
  return {
    id,
    name: id,
    type: 'checking',
    initialBalance,
    isActive: true,
    currency: 'EUR',
    budgetEnabled: true,
  };
}

test('receita entra na conta e aumenta orçamento', () => {
  const tx: Transaction = {
    id: 'inc',
    type: 'income',
    amount: 200,
    accountId: 'acc-1',
    date: '2026-07-05',
    category: 'salary',
    categoryLabel: 'Salário',
    currency: 'EUR',
  };

  assert.equal(calculateAccountImpact(tx, 'acc-1'), 200);
  assert.equal(calculateBudgetImpact(tx).budgetIncomeDelta, 200);
  assert.equal(calculateBudgetImpact(tx).countsAsExpense, false);
});

test('despesa sai da conta e conta como gasto', () => {
  const tx: Transaction = {
    id: 'exp',
    type: 'expense',
    amount: 50,
    accountId: 'acc-1',
    date: '2026-07-08',
    category: 'food',
    categoryLabel: 'Comida',
    currency: 'EUR',
  };

  assert.equal(calculateAccountImpact(tx, 'acc-1'), -50);
  assert.equal(calculateBudgetImpact(tx).budgetExpenseDelta, 50);
  assert.equal(calculateBudgetImpact(tx).countsAsExpense, true);
});

test('compra cartão aumenta dívida, não baixa conta', () => {
  const tx: Transaction = {
    id: 'card',
    type: 'credit_card_purchase',
    amount: 100,
    creditId: 'card-1',
    date: '2026-07-10',
    category: 'food',
    categoryLabel: 'Comida',
    currency: 'EUR',
  };

  assert.equal(calculateAccountImpact(tx, 'acc-1'), 0);
  assert.equal(calculateCreditCardImpact(tx, 'card-1'), 100);
});

test('pagamento cartão baixa conta e dívida, não é novo gasto de consumo', () => {
  const tx: Transaction = {
    id: 'pay',
    type: 'credit_card_payment',
    amount: 80,
    accountId: 'acc-1',
    creditId: 'card-1',
    date: '2026-07-14',
    category: 'credit',
    categoryLabel: 'Crédito',
    currency: 'EUR',
  };

  assert.equal(calculateAccountImpact(tx, 'acc-1'), -80);
  assert.equal(calculateCreditCardImpact(tx, 'card-1'), -80);
  assert.equal(calculateBudgetImpact(tx).countsAsExpense, false);
});

test('mensalidade crédito — juros são despesa financeira', () => {
  const credit: Credit = {
    id: 'loan-1',
    name: 'Crédito',
    outstandingBalance: 5000,
    creditType: 'personal',
  };

  const impact = calculateMonthlyLoanPaymentImpact({
    credit,
    accountId: 'acc-1',
    amount: 250,
    principalAmount: 200,
    interestAmount: 50,
  });

  assert.equal(impact.accountDelta, -250);
  assert.equal(impact.newCreditBalance, 4800);
  assert.equal(impact.financialExpenseDelta, 50);
  assert.equal(impact.availableDelta, -250);
});

test('amortização baixa dívida e orçamento, não é gasto de consumo', () => {
  const credit: Credit = {
    id: 'loan-1',
    name: 'Crédito',
    outstandingBalance: 5000,
    creditType: 'personal',
  };

  const impact = calculateDebtAmortizationImpact({
    credit,
    accountId: 'acc-1',
    amount: 300,
  });

  assert.equal(impact.newCreditBalance, 4700);
  assert.equal(impact.availableDelta, -300);

  const breakdown = buildMonthlyAvailableBreakdown({
    accounts: [budgetAccount('acc-1', 1000)],
    transactions: [
      {
        id: 'inc',
        type: 'income',
        amount: 1000,
        date: '2026-07-01',
        category: 'salary',
        categoryLabel: 'Salário',
        currency: 'EUR',
      },
    ],
    goalContributions: [],
    credits: [credit],
    subscriptions: [],
    loanPayments: [
      {
        id: 'lp1',
        creditId: 'loan-1',
        accountId: 'acc-1',
        type: 'extra_principal_payment',
        amount: 300,
        paidAt: '2026-07-10T10:00:00Z',
      },
    ],
    referenceDate: JULY,
  });

  assert.equal(breakdown.components.loanAmortizationsPaid, 300);
  assert.equal(breakdown.components.budgetAccountBalance, 700);
  assert.equal(breakdown.consumptionSpending, 0);
});

test('contas com budget_enabled incluem saldo inicial no orçamento', () => {
  const accounts: BankAccount[] = [
    {
      id: 'inv',
      name: 'Robinhood',
      type: 'investment',
      initialBalance: 7000,
      isActive: true,
      currency: 'EUR',
      budgetEnabled: false,
    },
    budgetAccount('acc-1', 500),
  ];

  const breakdown = buildMonthlyAvailableBreakdown({
    accounts,
    transactions: [],
    goalContributions: [],
    credits: [],
    subscriptions: [],
    loanPayments: [],
    referenceDate: JULY,
  });

  assert.equal(breakdown.available, 500);
  assert.equal(breakdown.budgetAccountsIncluded.length, 1);
  assert.equal(breakdown.budgetAccountsExcluded.length, 1);
});
