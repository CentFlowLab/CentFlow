import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateMonthlyAvailableBreakdown } from '@/lib/domain/financial/monthly-available';

test('cenário real QA — disponível 867,20 €', () => {
  const breakdown = calculateMonthlyAvailableBreakdown({
    incomeReceived: 1013.2,
    registeredExpenses: 24.8,
    goalReserved: 13.2,
    futureObligations: 108,
    referenceDate: new Date(2026, 6, 15),
  });

  assert.equal(breakdown.available, 867.2);
  assert.equal(breakdown.components.incomeReceived, 1013.2);
  assert.equal(breakdown.components.registeredExpenses, 24.8);
  assert.equal(breakdown.components.goalReserved, 13.2);
  assert.equal(breakdown.components.futureObligations, 108);
});

test('mensalidade de crédito reduz disponível sem duplicar obrigação paga', () => {
  const breakdown = calculateMonthlyAvailableBreakdown({
    incomeReceived: 1000,
    registeredExpenses: 100,
    goalReserved: 0,
    futureObligations: 0,
    loanPaymentsPaid: 250,
    financialCharges: 50,
  });

  assert.equal(breakdown.available, 650);
});

test('amortização extra reduz disponível', () => {
  const breakdown = calculateMonthlyAvailableBreakdown({
    incomeReceived: 1000,
    registeredExpenses: 0,
    goalReserved: 0,
    futureObligations: 0,
    loanAmortizationsPaid: 300,
  });

  assert.equal(breakdown.available, 700);
});
