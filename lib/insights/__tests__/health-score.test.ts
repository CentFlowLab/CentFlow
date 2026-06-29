import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { calculateHealthScore } from '@/lib/insights/health-score';

describe('calculateHealthScore', () => {
  it('score excelente com perfil saudável', () => {
    const result = calculateHealthScore({
      monthlyIncome: 2000,
      monthlyExpenses: 1200,
      monthlySubscriptionCost: 50,
      monthlyBudget: 1500,
      totalDebt: 0,
      creditMonthlyPayments: 0,
      transactionCountThisMonth: 10,
    });
    assert.ok(result.total >= 86);
    assert.equal(result.status, 'excellent');
  });

  it('sem dados de rendimento não penaliza poupança', () => {
    const result = calculateHealthScore({
      monthlyIncome: 0,
      monthlyExpenses: 0,
      monthlySubscriptionCost: 0,
      totalDebt: 0,
      creditMonthlyPayments: 0,
      transactionCountThisMonth: 1,
    });
    assert.equal(result.components.savings.score, null);
    assert.equal(result.hasSufficientData, false);
    assert.equal(result.total, 0);
    assert.equal(result.status, 'warning');
  });

  it('despesas sem receitas não confundem com fluxo negativo neutro', () => {
    const result = calculateHealthScore({
      monthlyIncome: 0,
      monthlyExpenses: 500,
      monthlySubscriptionCost: 0,
      totalDebt: 0,
      creditMonthlyPayments: 0,
      transactionCountThisMonth: 5,
    });
    assert.equal(result.components.cashflow.score, 0);
    assert.equal(result.components.cashflow.detail, 'Sem receitas registadas.');
    assert.equal(result.components.savings.score, null);
  });

  it('dívida elevada reduz score', () => {
    const result = calculateHealthScore({
      monthlyIncome: 1000,
      monthlyExpenses: 900,
      monthlySubscriptionCost: 100,
      totalDebt: 20000,
      creditMonthlyPayments: 400,
      transactionCountThisMonth: 5,
    });
    assert.equal(result.components.debt.score, 0);
    assert.ok(result.total < 66);
  });

  it('mês sem despesas mantém fluxo positivo', () => {
    const result = calculateHealthScore({
      monthlyIncome: 1500,
      monthlyExpenses: 0,
      monthlySubscriptionCost: 0,
      totalDebt: 0,
      creditMonthlyPayments: 0,
      transactionCountThisMonth: 1,
    });
    assert.equal(result.components.cashflow.score, 20);
  });

  it('crédito com TAEG zero — sem dívida', () => {
    const result = calculateHealthScore({
      monthlyIncome: 2000,
      monthlyExpenses: 1500,
      monthlySubscriptionCost: 0,
      totalDebt: 0,
      creditMonthlyPayments: 0,
      transactionCountThisMonth: 3,
    });
    assert.equal(result.components.debt.score, 20);
  });

  it('orçamento não definido não conta no total', () => {
    const result = calculateHealthScore({
      monthlyIncome: 2000,
      monthlyExpenses: 1800,
      monthlySubscriptionCost: 0,
      monthlyBudget: null,
      totalDebt: 5000,
      creditMonthlyPayments: 200,
      transactionCountThisMonth: 8,
    });
    assert.equal(result.components.budget.score, null);
    assert.equal(result.components.budget.hasData, false);
  });
});
