/**
 * Baseline de performance do motor financeiro — dataset sintético.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { BankAccount } from '@/lib/domain/account.types';
import type { Transaction } from '@/lib/domain/transaction.types';
import type { Credit } from '@/lib/domain/types';

import { calculateFinancialState } from './financial-state';
import { recalculateFinancialState } from './engine';
import { DEFAULT_FINANCIAL_ENGINE_STEP_RUNNERS } from './engine.steps';
import { DEFAULT_RECOMMENDATION_RULE_SETTINGS } from './recommendations';
import type { FinancialEngineInput } from './engine.types';

const AS_OF = new Date('2026-07-15T12:00:00');

function buildSyntheticDataset() {
  const accounts: BankAccount[] = Array.from({ length: 10 }, (_, i) => ({
    id: `acc-${i}`,
    name: `Conta ${i}`,
    type: i === 9 ? 'investment' : 'checking',
    currency: 'EUR',
    initialBalance: 1000 + i * 100,
    isActive: true,
    budgetEnabled: i < 8,
  }));

  const credits: Credit[] = Array.from({ length: 5 }, (_, i) => ({
    id: `credit-${i}`,
    name: `Crédito ${i}`,
    type: i < 3 ? 'credit_card' : 'loan',
    outstandingBalance: 500 + i * 200,
    originalAmount: 1000 + i * 500,
    currency: 'EUR',
    isActive: true,
    creditLimit: i < 3 ? 5000 : undefined,
    monthlyPayment: i >= 3 ? 150 : undefined,
  }));

  const goals = Array.from({ length: 10 }, (_, i) => ({
    id: `goal-${i}`,
    name: `Objetivo ${i}`,
    target: 1000 + i * 500,
    current: i * 50,
  }));

  const transactions: Transaction[] = Array.from({ length: 10_000 }, (_, i) => ({
    id: `tx-${i}`,
    type: i % 5 === 0 ? 'income' : 'expense',
    amount: 10 + (i % 100),
    date: `2026-${String(1 + (i % 7)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`,
    accountId: `acc-${i % 10}`,
    category: 'other',
    categoryLabel: 'Outros',
    currency: 'EUR',
    description: `Movimento ${i}`,
    creditId: i % 50 === 0 ? `credit-${i % 5}` : undefined,
  }));

  const input: FinancialEngineInput = {
    transactions,
    accounts,
    credits,
    goals,
    goalContributions: [],
    subscriptions: [],
    inventory: [],
    loanPayments: [],
    categoryBudgets: [],
    dismissedSubscriptionIds: [],
    prioritizeDebtAmortization: true,
    recommendationRules: { ...DEFAULT_RECOMMENDATION_RULE_SETTINGS },
    categorySpendAlertThreshold: 2,
    referenceDate: AS_OF,
  };

  return input;
}

test('performance baseline — calculateFinancialState com 10k transações', () => {
  const input = buildSyntheticDataset();
  const started = performance.now();
  const state = calculateFinancialState({
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
  const durationMs = performance.now() - started;

  assert.ok(state.netWorth.netWorth !== 0);
  assert.ok(durationMs < 5000, `calculateFinancialState demorou ${durationMs.toFixed(0)}ms (limite 5s)`);
  console.log(`[perf] calculateFinancialState 10k tx: ${durationMs.toFixed(1)}ms`);
});

test('performance baseline — recalculateFinancialState com 10k transações', async () => {
  const input = buildSyntheticDataset();
  const started = performance.now();
  const result = await recalculateFinancialState('perf-user', input, { type: 'manual_refresh' }, {
    stepRunners: {
      ...DEFAULT_FINANCIAL_ENGINE_STEP_RUNNERS,
      recommendations: (ctx) => {
        ctx.results.recommendations = [];
      },
    },
  });
  const durationMs = performance.now() - started;

  assert.ok(result.results.coreState);
  assert.ok(durationMs < 8000, `recalculateFinancialState demorou ${durationMs.toFixed(0)}ms (limite 8s)`);
  console.log(`[perf] recalculateFinancialState 10k tx: ${durationMs.toFixed(1)}ms`);
});
