import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateOnboardingPlan, suggestComfortableMonths } from '@/lib/onboarding/plan';

test('plano simples — 6000€ em 12 meses → 500€/mês', () => {
  const result = calculateOnboardingPlan({ savingsGoal: 6000, months: 12, monthlyIncome: 2000 });
  assert.equal(result.monthlySaving, 500);
  assert.equal(result.freePerMonth, 1500);
  assert.equal(result.feasible, true);
});

test('sem rendimento → freePerMonth null e warning NO_INCOME', () => {
  const result = calculateOnboardingPlan({ savingsGoal: 1200, months: 12 });
  assert.equal(result.monthlySaving, 100);
  assert.equal(result.freePerMonth, null);
  assert.equal(result.effortRatio, null);
  assert.ok(result.warnings.includes('NO_INCOME'));
});

test('esforço agressivo — > 40% do rendimento', () => {
  const result = calculateOnboardingPlan({ savingsGoal: 10000, months: 10, monthlyIncome: 2000 });
  // 1000/mês de 2000 = 50%
  assert.ok(result.warnings.includes('AGGRESSIVE'));
  assert.equal(result.feasible, true);
});

test('excede o rendimento → EXCEEDS_INCOME e não viável', () => {
  const result = calculateOnboardingPlan({ savingsGoal: 30000, months: 10, monthlyIncome: 2000 });
  // 3000/mês > 2000
  assert.ok(result.warnings.includes('EXCEEDS_INCOME'));
  assert.equal(result.feasible, false);
});

test('esforço confortável — <= 20%', () => {
  const result = calculateOnboardingPlan({ savingsGoal: 2400, months: 12, monthlyIncome: 2000 });
  // 200/mês de 2000 = 10%
  assert.ok(result.warnings.includes('COMFORTABLE'));
});

test('meses inválidos fazem clamp para 1', () => {
  const result = calculateOnboardingPlan({ savingsGoal: 500, months: 0, monthlyIncome: 1000 });
  assert.equal(result.monthlySaving, 500);
});

test('suggestComfortableMonths sugere prazo realista', () => {
  // 20% de 2000 = 400/mês → 6000/400 = 15 meses
  assert.equal(suggestComfortableMonths(6000, 2000), 15);
  assert.equal(suggestComfortableMonths(6000, 0), 12);
});
