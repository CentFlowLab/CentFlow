import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateDebtAmortizationImpact,
  calculateLoanPaymentBreakdown,
  calculateMonthlyLoanPaymentImpact,
} from '@/lib/domain/financial/loan-payments';

const credit = { id: 'c1', outstandingBalance: 5000, nextPaymentDate: '2026-07-01' };

test('calculateLoanPaymentBreakdown — capital + juros', () => {
  const b = calculateLoanPaymentBreakdown({
    amount: 250,
    principalAmount: 200,
    interestAmount: 50,
  });
  assert.equal(b.total, 250);
  assert.equal(b.principal, 200);
  assert.equal(b.interest, 50);
});

test('mensalidade — conta -250, dívida -200, juros 50', () => {
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

test('amortização — conta e dívida -300, património neutro', () => {
  const impact = calculateDebtAmortizationImpact({
    credit,
    accountId: 'acc-1',
    amount: 300,
  });
  assert.equal(impact.accountDelta, -300);
  assert.equal(impact.newCreditBalance, 4700);
  assert.equal(impact.availableDelta, -300);
});
