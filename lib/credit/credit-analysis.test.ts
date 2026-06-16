import assert from 'node:assert/strict';
import test from 'node:test';

import { analyzeCredit, resolveEffectiveAnnualRate, simulateEarlyAmortization } from '@/lib/credit/credit-analysis';

test('resolveEffectiveAnnualRate uses TAEG when provided', () => {
  assert.equal(
    resolveEffectiveAnnualRate({ outstandingBalance: 1000, interestRateAnnual: 5.5 }),
    5.5,
  );
});

test('resolveEffectiveAnnualRate sums Euribor and spread', () => {
  const rate = resolveEffectiveAnnualRate({
    outstandingBalance: 1000,
    indexRate: 3.2,
    spread: 1.1,
  });
  assert.ok(Math.abs(rate - 4.3) < 0.001);
});

test('analyzeCredit calculates debt-to-income ratio', () => {
  const result = analyzeCredit({
    outstandingBalance: 100000,
    termMonths: 360,
    interestRateAnnual: 4,
    monthlyIncome: 2000,
  });

  assert.ok(result.monthlyPayment > 0);
  assert.ok(result.debtToIncomeRatio !== null);
  assert.ok(result.debtToIncomeRatio! > 0);
});

test('simulateEarlyAmortization reduces remaining term', () => {
  const result = simulateEarlyAmortization(50000, 300, 4, 5000);
  assert.ok(result);
  assert.ok(result!.newBalance < 50000);
  assert.ok(result!.monthsSaved >= 0);
});
