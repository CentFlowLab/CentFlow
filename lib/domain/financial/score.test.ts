import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateCentFlowScore, explainTransparentScore } from '@/lib/domain/financial/score';

const baseInput = {
  subscriptionsRenewingSoon: 0,
};

test('score nunca abaixo de 0 nem acima de 100', () => {
  const low = calculateCentFlowScore({
    ...baseInput,
    monthlyIncome: 0,
    monthlyExpenses: 5000,
    totalDebt: 50000,
    monthlySubscriptionCost: 200,
    goals: [],
    netWorth: -10000,
    netWorthChangePercent: -20,
  });
  assert.ok(low.score >= 0 && low.score <= 100);

  const high = calculateCentFlowScore({
    ...baseInput,
    monthlyIncome: 5000,
    monthlyExpenses: 2000,
    totalDebt: 0,
    monthlySubscriptionCost: 50,
    goals: [{ current: 9000, target: 10000 }],
    netWorth: 50000,
    netWorthChangePercent: 10,
  });
  assert.ok(high.score >= 0 && high.score <= 100);
});

test('explainTransparentScore — breakdown consistente', () => {
  const result = calculateCentFlowScore({
    ...baseInput,
    monthlyIncome: 3000,
    monthlyExpenses: 2400,
    totalDebt: 5000,
    monthlySubscriptionCost: 80,
    goals: [{ current: 500, target: 2000 }],
    netWorth: 10000,
    netWorthChangePercent: 2,
  });

  const explained = explainTransparentScore(result);
  assert.equal(explained.score, result.score);
  assert.ok(explained.explanation.earned.length + explained.explanation.missing.length > 0);
  assert.ok(Array.isArray(explained.positiveFactors));
  assert.ok(Array.isArray(explained.negativeFactors));
});
