import assert from 'node:assert/strict';
import test from 'node:test';

import type { FinancialEngineStepId } from './engine.types';
import { FINANCIAL_ENGINE_STEP_ORDER } from './engine.types';
import { recalculateFinancialState } from './engine';
import { DEFAULT_FINANCIAL_ENGINE_STEP_RUNNERS } from './engine.steps';
import type { FinancialEngineInput } from './engine.types';
import { DEFAULT_RECOMMENDATION_RULE_SETTINGS } from './recommendations';

const EMPTY_INPUT: FinancialEngineInput = {
  transactions: [],
  accounts: [],
  credits: [],
  goals: [],
  goalContributions: [],
  subscriptions: [],
  inventory: [],
  loanPayments: [],
  categoryBudgets: [],
  dismissedSubscriptionIds: [],
  prioritizeDebtAmortization: false,
  recommendationRules: { ...DEFAULT_RECOMMENDATION_RULE_SETTINGS },
  categorySpendAlertThreshold: 2,
  referenceDate: new Date('2026-06-15T12:00:00'),
};

test('recalculateFinancialState — invoca todos os passos pela ordem de dependências', async () => {
  const calls: FinancialEngineStepId[] = [];

  const stepRunners = Object.fromEntries(
    FINANCIAL_ENGINE_STEP_ORDER.map((step) => [
      step,
      () => {
        calls.push(step);
      },
    ]),
  ) as typeof DEFAULT_FINANCIAL_ENGINE_STEP_RUNNERS;

  await recalculateFinancialState('user-1', EMPTY_INPUT, { type: 'transaction_created' }, {
    stepRunners,
  });

  assert.deepEqual(calls, [...FINANCIAL_ENGINE_STEP_ORDER]);
});

test('recalculateFinancialState — falha num passo não impede os restantes', async () => {
  const calls: FinancialEngineStepId[] = [];

  const stepRunners = Object.fromEntries(
    FINANCIAL_ENGINE_STEP_ORDER.map((step) => [
      step,
      () => {
        if (step === 'subscriptions') {
          throw new Error('detecção de subscrições indisponível');
        }
        calls.push(step);
      },
    ]),
  ) as typeof DEFAULT_FINANCIAL_ENGINE_STEP_RUNNERS;

  const result = await recalculateFinancialState(
    'user-1',
    EMPTY_INPUT,
    { type: 'transaction_created', transactionId: 'tx-1' },
    { stepRunners },
  );

  const failed = result.steps.find((step) => step.step === 'subscriptions');
  assert.equal(failed?.ok, false);
  assert.equal(failed?.error, 'detecção de subscrições indisponível');

  const okSteps = result.steps.filter((step) => step.ok).map((step) => step.step);
  assert.deepEqual(okSteps, FINANCIAL_ENGINE_STEP_ORDER.filter((step) => step !== 'subscriptions'));
  assert.equal(result.steps.length, FINANCIAL_ENGINE_STEP_ORDER.length);
});

test('recalculateFinancialState — integração real produz resultados derivados', async () => {
  const stepRunners = {
    ...DEFAULT_FINANCIAL_ENGINE_STEP_RUNNERS,
    recommendations: (ctx: import('./engine.types').FinancialEngineContext) => {
      ctx.results.recommendations = [];
    },
  };

  const result = await recalculateFinancialState('user-1', EMPTY_INPUT, {
    type: 'manual_refresh',
  }, { stepRunners });

  assert.equal(result.steps.filter((step) => step.step !== 'recommendations').every((step) => step.ok), true);
  assert.ok(result.results.budget);
  assert.ok(result.results.netWorth);
  assert.ok(result.results.healthScore);
  assert.ok(result.results.homeSummary);
  assert.ok(Array.isArray(result.results.recommendations));
  assert.ok(result.totalDurationMs >= 0);
});
