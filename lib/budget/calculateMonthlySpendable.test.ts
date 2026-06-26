import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateMonthlySpendable } from '@/lib/budget/calculateMonthlySpendable';

// Data de referência fixa a meio do mês (15 de junho de 2026) para resultados
// determinísticos. Junho tem 30 dias → daysRemaining = 30 - 15 + 1 = 16.
const MID_JUNE = new Date(2026, 5, 15);
const LAST_DAY_JUNE = new Date(2026, 5, 30);

test('sem orçamento — saldo 500, sem futuros → remainingThisMonth = 500', () => {
  const result = calculateMonthlySpendable({
    currentBalance: 500,
    referenceDate: MID_JUNE,
  });
  assert.equal(result.remainingThisMonth, 500);
  assert.equal(result.projectedEndOfMonthBalance, 500);
});

test('com orçamento — saldo 1000, orçamento 600, gastos 200 → 400', () => {
  const result = calculateMonthlySpendable({
    currentBalance: 1000,
    monthlyBudget: 600,
    currentMonthMovements: [{ type: 'expense', amount: 200, date: '2026-06-10' }],
    referenceDate: MID_JUNE,
  });
  assert.equal(result.remainingThisMonth, 400);
});

test('salário futuro — saldo 100, salário futuro 1500 → inclui 1500 (1600)', () => {
  const result = calculateMonthlySpendable({
    currentBalance: 100,
    futureMovements: [{ type: 'income', amount: 1500, date: '2026-06-25' }],
    referenceDate: MID_JUNE,
  });
  assert.equal(result.remainingThisMonth, 1600);
});

test('subscrição futura — saldo 500, subscrição 15 → desconta 15 (485)', () => {
  const result = calculateMonthlySpendable({
    currentBalance: 500,
    subscriptions: [{ amount: 15 }],
    referenceDate: MID_JUNE,
  });
  assert.equal(result.remainingThisMonth, 485);
});

test('prestação de crédito — saldo 500, crédito 200 → desconta 200 (300)', () => {
  const result = calculateMonthlySpendable({
    currentBalance: 500,
    creditInstallments: [{ amount: 200 }],
    referenceDate: MID_JUNE,
  });
  assert.equal(result.remainingThisMonth, 300);
});

test('despesa hoje — saldo 500, despesa registada 50 → desconta 50 (450)', () => {
  const result = calculateMonthlySpendable({
    currentBalance: 500,
    currentMonthMovements: [{ type: 'expense', amount: 50, date: '2026-06-15' }],
    referenceDate: MID_JUNE,
  });
  assert.equal(result.remainingThisMonth, 450);
});

test('último dia do mês — daysRemaining = 1, dailyAvailable = remainingThisMonth', () => {
  const result = calculateMonthlySpendable({
    currentBalance: 420,
    referenceDate: LAST_DAY_JUNE,
  });
  assert.equal(result.daysRemaining, 1);
  assert.equal(result.dailyAvailable, result.remainingThisMonth);
  assert.equal(result.dailyAvailable, 420);
});

test('saldo negativo projetado — saldo 100, despesas futuras 300 → NEGATIVE_PROJECTED', () => {
  const result = calculateMonthlySpendable({
    currentBalance: 100,
    futureMovements: [{ type: 'expense', amount: 300, date: '2026-06-28' }],
    referenceDate: MID_JUNE,
  });
  assert.equal(result.projectedEndOfMonthBalance, -200);
  assert.ok(result.warnings.some((warning) => warning.code === 'NEGATIVE_PROJECTED'));
});
