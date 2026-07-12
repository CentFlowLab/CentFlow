import assert from 'node:assert/strict';
import test from 'node:test';

import type { BankAccount } from '@/lib/domain/account.types';
import { enrichAccountsWithBalances } from '@/lib/domain/financial/accounts';
import {
  defaultBudgetEnabledForType,
  getBudgetAccountIds,
  isBudgetAccount,
  partitionAccountsByBudget,
  resolveBudgetEnabled,
  sumBudgetAccountBalances,
} from '@/lib/domain/financial/budget-accounts';
import { buildMonthlyAvailableBreakdown } from '@/lib/domain/financial/monthly-available.compose';
import { calculateNetWorth } from '@/lib/domain/financial/netWorth';
import type { Transaction } from '@/lib/domain/transaction.types';

const JULY = new Date(2026, 6, 15);

function account(
  partial: Pick<BankAccount, 'id' | 'name' | 'type'> &
    Partial<Pick<BankAccount, 'initialBalance' | 'budgetEnabled'>>,
): BankAccount {
  return {
    id: partial.id,
    name: partial.name,
    type: partial.type,
    initialBalance: partial.initialBalance ?? 0,
    isActive: true,
    currency: 'EUR',
    budgetEnabled: partial.budgetEnabled,
  };
}

const robinhood = account({
  id: 'acc-rh',
  name: 'Robinhood',
  type: 'investment',
  initialBalance: 7011.72,
  budgetEnabled: false,
});
const moey = account({
  id: 'acc-moey',
  name: 'Moey',
  type: 'checking',
  initialBalance: 700,
  budgetEnabled: true,
});
const santander = account({
  id: 'acc-sant',
  name: 'Santander',
  type: 'checking',
  initialBalance: 371,
  budgetEnabled: true,
});

const scenarioAccounts = [robinhood, moey, santander];

test('1. conta à ordem budget_enabled true entra no orçamento', () => {
  assert.equal(isBudgetAccount(moey), true);
  assert.equal(isBudgetAccount(santander), true);
});

test('2. investimento budget_enabled false não entra', () => {
  assert.equal(isBudgetAccount(robinhood), false);
});

test('3. saldo de contas budget_enabled inclui saldos iniciais sem transações', () => {
  const breakdown = buildMonthlyAvailableBreakdown({
    accounts: scenarioAccounts,
    transactions: [],
    goalContributions: [],
    credits: [],
    subscriptions: [],
    loanPayments: [],
    referenceDate: JULY,
  });

  assert.equal(breakdown.components.budgetAccountBalance, 1071);
  assert.equal(breakdown.available, 1071);
  assert.equal(breakdown.budgetAccountsIncluded.length, 2);
});

test('4. transferência não altera disponível global', () => {
  const txs: Transaction[] = [
    {
      id: 't1',
      type: 'transfer',
      amount: 100,
      accountId: 'acc-moey',
      destinationAccountId: 'acc-rh',
      date: '2026-07-10',
      category: 'transfer',
      categoryLabel: 'Transferência',
      currency: 'EUR',
    },
  ];

  const breakdown = buildMonthlyAvailableBreakdown({
    accounts: scenarioAccounts,
    transactions: txs,
    goalContributions: [],
    credits: [],
    subscriptions: [],
    loanPayments: [],
    referenceDate: JULY,
  });

  assert.equal(breakdown.components.budgetAccountBalance, 971);
  assert.equal(breakdown.available, 971);
  assert.equal(breakdown.components.movedOutOfBudget, 100);
  assert.equal(breakdown.consumptionSpending, 0);
});

test('5. receita global aumenta disponível', () => {
  const txs: Transaction[] = [
    {
      id: 'inc',
      type: 'income',
      amount: 200,
      accountId: 'acc-moey',
      date: '2026-07-05',
      category: 'salary',
      categoryLabel: 'Salário',
      currency: 'EUR',
    },
  ];

  const breakdown = buildMonthlyAvailableBreakdown({
    accounts: scenarioAccounts,
    transactions: txs,
    goalContributions: [],
    credits: [],
    subscriptions: [],
    loanPayments: [],
    referenceDate: JULY,
  });

  assert.equal(breakdown.components.budgetAccountBalance, 1271);
  assert.equal(breakdown.available, 1271);
  assert.equal(breakdown.components.incomeReceived, 200);
});

test('6. despesa global reduz disponível', () => {
  const txs: Transaction[] = [
    {
      id: 'inc',
      type: 'income',
      amount: 250,
      date: '2026-07-01',
      category: 'salary',
      categoryLabel: 'Salário',
      currency: 'EUR',
    },
    {
      id: 'exp',
      type: 'expense',
      amount: 50,
      accountId: 'acc-moey',
      date: '2026-07-08',
      category: 'food',
      categoryLabel: 'Comida',
      currency: 'EUR',
    },
  ];

  const breakdown = buildMonthlyAvailableBreakdown({
    accounts: scenarioAccounts,
    transactions: txs,
    goalContributions: [],
    credits: [],
    subscriptions: [],
    loanPayments: [],
    referenceDate: JULY,
  });

  assert.equal(breakdown.components.budgetAccountBalance, 1021);
  assert.equal(breakdown.available, 1021);
  assert.equal(breakdown.components.registeredExpenses, 50);
});

test('7. receita em qualquer origem conta globalmente', () => {
  const txs: Transaction[] = [
    {
      id: 'inc-rh',
      type: 'income',
      amount: 500,
      accountId: 'acc-rh',
      date: '2026-07-05',
      category: 'salary',
      categoryLabel: 'Salário',
      currency: 'EUR',
    },
  ];

  const breakdown = buildMonthlyAvailableBreakdown({
    accounts: scenarioAccounts,
    transactions: txs,
    goalContributions: [],
    credits: [],
    subscriptions: [],
    loanPayments: [],
    referenceDate: JULY,
  });

  assert.equal(breakdown.components.budgetAccountBalance, 1071);
  assert.equal(breakdown.components.incomeReceived, 500);
});

test('8. compra com cartão não reduz disponível', () => {
  const txs: Transaction[] = [
    {
      id: 'inc',
      type: 'income',
      amount: 1000,
      date: '2026-07-01',
      category: 'salary',
      categoryLabel: 'Salário',
      currency: 'EUR',
    },
    {
      id: 'card',
      type: 'credit_card_purchase',
      amount: 100,
      creditId: 'card-1',
      date: '2026-07-10',
      category: 'food',
      categoryLabel: 'Comida',
      currency: 'EUR',
    },
  ];

  const breakdown = buildMonthlyAvailableBreakdown({
    accounts: scenarioAccounts,
    transactions: txs,
    goalContributions: [],
    credits: [],
    subscriptions: [],
    loanPayments: [],
    referenceDate: JULY,
  });

  assert.equal(breakdown.available, 1071);
  assert.equal(breakdown.consumptionSpending, 100);
});

test('9. pagamento de cartão reduz disponível', () => {
  const txs: Transaction[] = [
    {
      id: 'inc',
      type: 'income',
      amount: 1000,
      date: '2026-07-01',
      category: 'salary',
      categoryLabel: 'Salário',
      currency: 'EUR',
    },
    {
      id: 'pay',
      type: 'credit_card_payment',
      amount: 80,
      accountId: 'acc-sant',
      creditId: 'card-1',
      date: '2026-07-14',
      category: 'credit',
      categoryLabel: 'Crédito',
      currency: 'EUR',
    },
  ];

  const breakdown = buildMonthlyAvailableBreakdown({
    accounts: scenarioAccounts,
    transactions: txs,
    goalContributions: [],
    credits: [],
    subscriptions: [],
    loanPayments: [],
    referenceDate: JULY,
  });

  assert.equal(breakdown.components.budgetAccountBalance, 991);
  assert.equal(breakdown.available, 991);
});

test('10. contribuição para objetivo reduz disponível', () => {
  const breakdown = buildMonthlyAvailableBreakdown({
    accounts: scenarioAccounts,
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
    goalContributions: [
      {
        id: 'gc1',
        goalId: 'g1',
        accountId: 'acc-moey',
        amount: 100,
        createdAt: '2026-07-10T10:00:00Z',
      },
    ],
    credits: [],
    subscriptions: [],
    loanPayments: [],
    referenceDate: JULY,
  });

  assert.equal(breakdown.components.budgetAccountBalance, 971);
  assert.equal(breakdown.components.goalReserved, 100);
});

test('11. objetivo não reduz património', () => {
  const enriched = enrichAccountsWithBalances(scenarioAccounts, [], [
    {
      id: 'gc1',
      goalId: 'g1',
      accountId: 'acc-moey',
      amount: 500,
      createdAt: '2026-06-01T10:00:00Z',
    },
  ]);

  const before = calculateNetWorth({
    accounts: enriched.map((a) => ({
      id: a.id,
      name: a.name,
      balance: a.balance ?? a.initialBalance,
      currency: a.currency,
    })),
    inventory: [],
    investments: [],
    credits: [],
    savings: 500,
  });

  assert.equal(before.netWorth, 8082.72);
});

test('defaults por tipo de conta', () => {
  assert.equal(defaultBudgetEnabledForType('checking'), true);
  assert.equal(defaultBudgetEnabledForType('wallet'), true);
  assert.equal(defaultBudgetEnabledForType('savings'), false);
  assert.equal(defaultBudgetEnabledForType('investment'), false);
  assert.equal(defaultBudgetEnabledForType('other'), false);
});

test('partitionAccountsByBudget separa totais', () => {
  const enriched = enrichAccountsWithBalances(scenarioAccounts, []);
  const { inBudget, outOfBudget } = partitionAccountsByBudget(enriched);
  assert.equal(inBudget.length, 2);
  assert.equal(outOfBudget.length, 1);
  assert.equal(sumBudgetAccountBalances(enriched), 1071);
  assert.equal(getBudgetAccountIds(enriched).size, 2);
});
