/**
 * Testes de paridade — motor v2 (scheduler) deriva de calculateFinancialState (v1 canónico).
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { BankAccount } from '@/lib/domain/account.types';
import type { GoalContribution } from '@/lib/domain/goal-contribution.types';
import type { Transaction } from '@/lib/domain/transaction.types';
import type { Goal } from '@/lib/domain/assets.types';
import type { Credit } from '@/lib/domain/types';

import { calculateFinancialState } from './financial-state';
import { recalculateFinancialState } from './engine';
import { DEFAULT_FINANCIAL_ENGINE_STEP_RUNNERS } from './engine.steps';
import type { FinancialEngineInput } from './engine.types';
import { DEFAULT_RECOMMENDATION_RULE_SETTINGS } from './recommendations';

const AS_OF = new Date('2026-07-15T12:00:00');

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
    id: partial.id ?? `tx-${partial.date}-${partial.amount}-${partial.type}`,
    description: partial.description ?? 'Test',
    category: partial.category ?? 'other',
    categoryLabel: partial.categoryLabel ?? 'Outros',
    currency: partial.currency ?? 'EUR',
    ...partial,
  };
}

function credit(partial: Partial<Credit> & Pick<Credit, 'id'>): Credit {
  return {
    name: partial.name ?? 'Crédito',
    outstandingBalance: partial.outstandingBalance ?? 0,
    originalAmount: partial.originalAmount ?? 0,
    creditType: partial.creditType ?? 'card',
    ...partial,
  };
}

function buildEngineInput(partial: Partial<FinancialEngineInput>): FinancialEngineInput {
  return {
    transactions: partial.transactions ?? [],
    accounts: partial.accounts ?? [],
    credits: partial.credits ?? [],
    goals: partial.goals ?? [],
    goalContributions: partial.goalContributions ?? [],
    subscriptions: partial.subscriptions ?? [],
    inventory: partial.inventory ?? [],
    loanPayments: partial.loanPayments ?? [],
    categoryBudgets: partial.categoryBudgets ?? [],
    dismissedSubscriptionIds: partial.dismissedSubscriptionIds ?? [],
    prioritizeDebtAmortization: partial.prioritizeDebtAmortization ?? true,
    recommendationRules: partial.recommendationRules ?? { ...DEFAULT_RECOMMENDATION_RULE_SETTINGS },
    categorySpendAlertThreshold: partial.categorySpendAlertThreshold ?? 2,
    referenceDate: AS_OF,
  };
}

async function runParity(
  label: string,
  partial: Partial<FinancialEngineInput>,
  assertExtra?: (direct: ReturnType<typeof calculateFinancialState>) => void,
) {
  const input = buildEngineInput(partial);
  const direct = calculateFinancialState({
    transactions: input.transactions,
    accounts: input.accounts,
    credits: input.credits,
    goals: input.goals,
    goalContributions: input.goalContributions,
    subscriptions: input.subscriptions,
    inventory: input.inventory,
    loanPayments: input.loanPayments,
    today: AS_OF,
  });

  const stepRunners = {
    ...DEFAULT_FINANCIAL_ENGINE_STEP_RUNNERS,
    recommendations: (ctx: import('./engine.types').FinancialEngineContext) => {
      ctx.results.recommendations = [];
    },
  };

  const engine = await recalculateFinancialState('user-parity', input, { type: 'manual_refresh' }, {
    stepRunners,
  });

  assert.ok(engine.results.coreState, `${label}: coreState ausente`);
  assert.equal(
    engine.results.coreState!.netWorth.netWorth,
    direct.netWorth.netWorth,
    `${label}: património`,
  );
  assert.equal(
    engine.results.budget?.available,
    direct.budget.available,
    `${label}: orçamento`,
  );
  assert.equal(
    engine.results.healthScore?.score,
    direct.healthScore.score,
    `${label}: health score`,
  );
  assert.equal(
    engine.results.netWorth?.changePercent,
    direct.netWorthChangePercent,
    `${label}: variação património %`,
  );
  assert.equal(
    engine.results.liabilities?.totalDebt,
    direct.creditSummary.totalDebt,
    `${label}: dívida total`,
  );

  assertExtra?.(direct);
}

test('paridade — conta simples com salário', async () => {
  await runParity('conta simples', {
    accounts: [account({ id: 'a1', initialBalance: 0, budgetEnabled: true })],
    transactions: [
      tx({ id: 'sal', type: 'income', amount: 2000, date: '2026-07-01', accountId: 'a1' }),
    ],
  });
});

test('paridade — várias contas e saldo inicial', async () => {
  await runParity('várias contas', {
    accounts: [
      account({ id: 'a1', initialBalance: 500 }),
      account({ id: 'a2', initialBalance: 300, budgetEnabled: true }),
    ],
    transactions: [
      tx({ id: 'e1', type: 'expense', amount: 50, date: '2026-07-05', accountId: 'a2' }),
    ],
  });
});

test('paridade — transferência não altera património', async () => {
  await runParity(
    'transferência',
    {
      accounts: [
        account({ id: 'a1', initialBalance: 1000 }),
        account({ id: 'a2', initialBalance: 0 }),
      ],
      transactions: [
        tx({
          id: 't1',
          type: 'transfer',
          amount: 200,
          date: '2026-07-03',
          accountId: 'a1',
          destinationAccountId: 'a2',
        }),
      ],
    },
    (direct) => assert.equal(direct.netWorth.netWorth, 1000),
  );
});

test('paridade — receita futura não contamina valor atual', async () => {
  await runParity(
    'receita futura',
    {
      accounts: [account({ id: 'a1', initialBalance: 100 })],
      transactions: [
        tx({ id: 'fut', type: 'income', amount: 5000, date: '2026-08-01', accountId: 'a1' }),
      ],
    },
    (direct) => assert.equal(direct.netWorth.netWorth, 100),
  );
});

test('paridade — despesa futura', async () => {
  await runParity(
    'despesa futura',
    {
      accounts: [account({ id: 'a1', initialBalance: 1000 })],
      transactions: [
        tx({ id: 'fut', type: 'expense', amount: 400, date: '2026-08-10', accountId: 'a1' }),
      ],
    },
    (direct) => assert.equal(direct.netWorth.netWorth, 1000),
  );
});

test('paridade — cartão compra e pagamento', async () => {
  const card = credit({
    id: 'card-1',
    creditType: 'card',
    outstandingBalance: 0,
    originalAmount: 5000,
  });
  await runParity('cartão compra+pagamento', {
    accounts: [account({ id: 'a1', initialBalance: 2000, budgetEnabled: true })],
    credits: [card],
    transactions: [
      tx({
        id: 'buy',
        type: 'expense',
        amount: 150,
        date: '2026-07-02',
        creditId: 'card-1',
        accountId: 'a1',
      }),
      tx({
        id: 'pay',
        type: 'expense',
        amount: 150,
        date: '2026-07-10',
        accountId: 'a1',
        category: 'credit_payment',
        categoryLabel: 'Pagamento cartão',
      }),
    ],
  });
});

test('paridade — cartão reembolso', async () => {
  await runParity('reembolso', {
    accounts: [account({ id: 'a1', initialBalance: 1000, budgetEnabled: true })],
    credits: [credit({ id: 'c1', creditType: 'card', outstandingBalance: 100 })],
    transactions: [
      tx({
        id: 'ref',
        type: 'income',
        amount: 30,
        date: '2026-07-08',
        creditId: 'c1',
        accountId: 'a1',
        category: 'refund',
        categoryLabel: 'Reembolso',
      }),
    ],
  });
});

test('paridade — objetivo com contribuição', async () => {
  const goals: Goal[] = [
    {
      id: 'g1',
      name: 'Férias',
      target: 2000,
      current: 0,
      currency: 'EUR',
    },
  ];
  const goalContributions: GoalContribution[] = [
    { id: 'gc1', goalId: 'g1', amount: 200, createdAt: '2026-07-05T10:00:00Z', accountId: 'a1' },
  ];
  await runParity('objetivo', {
    accounts: [account({ id: 'a1', initialBalance: 1000 })],
    goals,
    goalContributions,
    transactions: [
      tx({
        id: 'gc-tx',
        type: 'expense',
        amount: 200,
        date: '2026-07-05',
        accountId: 'a1',
        category: 'goal_contribution',
        categoryLabel: 'Objetivo',
      }),
    ],
  });
});

test('paridade — conta investment sem duplicação', async () => {
  await runParity(
    'investimento',
    {
      accounts: [
        account({ id: 'inv', type: 'investment', initialBalance: 5000, budgetEnabled: false }),
        account({ id: 'chk', initialBalance: 500, budgetEnabled: true }),
      ],
      transactions: [],
    },
    (direct) => assert.equal(direct.netWorth.netWorth, 5500),
  );
});

test('paridade — conta negativa', async () => {
  await runParity(
    'conta negativa',
    {
      accounts: [account({ id: 'a1', initialBalance: 50, budgetEnabled: true })],
      transactions: [
        tx({ id: 'big', type: 'expense', amount: 200, date: '2026-07-04', accountId: 'a1' }),
      ],
    },
    (direct) => assert.equal(direct.accounts[0]?.balance, -150),
  );
});

test('paridade — combinação completa', async () => {
  await runParity('combinação', {
    accounts: [
      account({ id: 'a1', initialBalance: 2000, budgetEnabled: true }),
      account({ id: 'inv', type: 'investment', initialBalance: 3000, budgetEnabled: false }),
    ],
    credits: [credit({ id: 'loan', creditType: 'personal', outstandingBalance: 10000, monthlyPayment: 300 })],
    goals: [{ id: 'g1', name: 'Reserva', target: 5000, current: 500 }],
    transactions: [
      tx({ id: 'sal', type: 'income', amount: 2500, date: '2026-07-01', accountId: 'a1' }),
      tx({ id: 'exp', type: 'expense', amount: 400, date: '2026-07-06', accountId: 'a1' }),
      tx({
        id: 'tr',
        type: 'transfer',
        amount: 100,
        date: '2026-07-07',
        accountId: 'a1',
        destinationAccountId: 'inv',
      }),
    ],
  });
});
