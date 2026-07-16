import assert from 'node:assert/strict';
import test from 'node:test';

import type { Credit } from '@/lib/domain/types';
import type { FinancialState } from './financial-state.types';
import {
  filterConsecutiveRecommendationDuplicates,
  generateRecommendations,
  mergeRecommendationFiredRecords,
} from './recommendations';
import { createTestFinancialState } from './test-financial-state.fixture';

const AS_OF = new Date('2026-06-15T12:00:00');

function baseState(overrides: Partial<FinancialState> = {}): FinancialState {
  return createTestFinancialState({
    asOf: AS_OF,
    availableThisMonth: 500,
    dailySafeSpend: 20,
    budget: {
      ...createTestFinancialState().budget,
      available: 500,
      dailySafeSpend: 20,
      consumptionSpending: 800,
    },
    cashFlow: {
      monthlyIncome: 2000,
      monthlyExpenses: 1200,
      net: 800,
      savingsRate: 0.4,
      weeklySpending: 200,
    },
    netWorth: {
      netWorth: 10000,
      totalAssets: 12000,
      totalLiabilities: 2000,
      breakdown: { accounts: 0, inventory: 0, investments: 3000, savings: 0, liabilities: 2000 },
      assetsByCategory: [],
    },
    goalProgress: [
      {
        id: 'g1',
        name: 'Férias',
        current: 100,
        target: 1000,
        percent: 10,
        remaining: 900,
        isComplete: false,
      },
    ],
    subscriptions: { items: [], monthlyTotal: 50, renewingSoon: 0 },
    investmentSummary: { totalBalance: 3000, accountCount: 1 },
    metrics: {
      savingsRate: 40,
      debtRatio: 0.2,
      emergencyMonths: 0.5,
      recurringRatio: 10,
      budgetAccuracy: 80,
      averageDailySpend: 40,
      incomeStability: 70,
      expenseConcentration: 20,
      subscriptionLoad: 2.5,
      financialRunway: 2,
      netWorthGrowth: 1,
      goalVelocity: 10,
      financialFreedomScore: 50,
    },
    healthScore: {
      score: 60,
      band: 'good',
      bandLabel: 'Bom',
      breakdown: { savings: 15, debt: 15, subscriptions: 15, goals: 15, stability: 0 },
      input: {
        netWorth: 10000,
        netWorthChangePercent: 1,
        monthlyIncome: 2000,
        monthlyExpenses: 1200,
        monthlySubscriptionCost: 50,
        totalDebt: 2000,
        goals: [{ current: 100, target: 1000 }],
        subscriptionsRenewingSoon: 0,
      },
      summary: '',
      explanation: { earned: [], missing: [] },
    },
    ...overrides,
  });
}

test('generateRecommendations — dívida acima do investimento inclui números auditáveis', () => {
  const credit: Credit = {
    id: 'loan-1',
    name: 'Crédito Habitação',
    outstandingBalance: 80000,
    originalAmount: 100000,
    interestRateAnnual: 8.5,
    monthlyPayment: 450,
    termMonths: 240,
    creditType: 'mortgage',
  };

  const recs = generateRecommendations(
    baseState({
      credits: [credit],
      availableThisMonth: 600,
    }),
    { transactions: [], asOf: AS_OF },
  );

  const debtRec = recs.find((item) => item.ruleId === 'debt_vs_investment');
  assert.ok(debtRec);
  assert.match(debtRec.explanation, /8\.5%/);
  assert.match(debtRec.explanation, /5\.0%/);
  assert.match(debtRec.suggestedAction, /Amortizar/);
});

test('generateRecommendations — fundo de emergência curto dispara com despesas fixas', () => {
  const recs = generateRecommendations(
    baseState({
      availableThisMonth: 120,
      subscriptions: { items: [], monthlyTotal: 80, renewingSoon: 0 },
      credits: [
        {
          id: 'c1',
          name: 'Empréstimo',
          outstandingBalance: 5000,
          monthlyPayment: 100,
          creditType: 'personal',
        },
      ],
    }),
    { transactions: [], asOf: AS_OF },
  );

  const emergency = recs.find((item) => item.ruleId === 'emergency_fund');
  assert.ok(emergency);
  assert.match(emergency.explanation, /120/);
  assert.equal(emergency.priority, 'alta');
});

test('filterConsecutiveRecommendationDuplicates — suprime repetição no dia seguinte', () => {
  const rec = {
    id: 'rec-emergency-fund',
    ruleId: 'emergency_fund' as const,
    priority: 'alta' as const,
    title: 'Test',
    explanation: 'x',
    suggestedAction: 'y',
    fingerprint: 'same',
  };

  const filtered = filterConsecutiveRecommendationDuplicates(
    [rec],
    [
      {
        id: rec.id,
        ruleId: rec.ruleId,
        fingerprint: 'same',
        firedAt: '2026-06-14T10:00:00.000Z',
      },
    ],
    AS_OF,
  );

  assert.equal(filtered.length, 0);
});

test('filterConsecutiveRecommendationDuplicates — mostra se fingerprint mudou', () => {
  const rec = {
    id: 'rec-emergency-fund',
    ruleId: 'emergency_fund' as const,
    priority: 'alta' as const,
    title: 'Test',
    explanation: 'x',
    suggestedAction: 'y',
    fingerprint: 'new-values',
  };

  const filtered = filterConsecutiveRecommendationDuplicates(
    [rec],
    [
      {
        id: rec.id,
        ruleId: rec.ruleId,
        fingerprint: 'old-values',
        firedAt: '2026-06-14T10:00:00.000Z',
      },
    ],
    AS_OF,
  );

  assert.equal(filtered.length, 1);
});

test('generateRecommendations — regra desactivada não aparece', () => {
  const recs = generateRecommendations(
    baseState({ availableThisMonth: 50 }),
    {
      transactions: [],
      asOf: AS_OF,
      settings: { emergency_fund: false, debt_vs_investment: false, surplus_allocation: false, category_above_median: false, habit_insight: false },
    },
  );

  assert.equal(recs.length, 0);
});

test('generateRecommendations — insight de hábito com prioridade baixa', () => {
  const fridays = [
    '2026-04-24',
    '2026-05-01',
    '2026-05-08',
    '2026-05-15',
    '2026-05-22',
    '2026-05-29',
    '2026-06-05',
  ];

  const transactions = [
    ...fridays.slice(0, 6).map((date, index) => ({
      id: `f-${index}`,
      type: 'expense' as const,
      amount: 18,
      category: 'restaurant',
      categoryLabel: 'Restaurante',
      description: 'Burger spot',
      date,
      currency: 'EUR',
    })),
    {
      id: 'f-high',
      type: 'expense' as const,
      amount: 34,
      category: 'restaurant',
      categoryLabel: 'Restaurante',
      description: 'Burger spot',
      date: '2026-06-05',
      currency: 'EUR',
    },
    {
      id: 'fill-1',
      type: 'expense' as const,
      amount: 12,
      category: 'food',
      categoryLabel: 'Alimentação',
      date: '2026-04-01',
      currency: 'EUR',
    },
    {
      id: 'fill-2',
      type: 'expense' as const,
      amount: 15,
      category: 'food',
      categoryLabel: 'Alimentação',
      date: '2026-04-20',
      currency: 'EUR',
    },
    {
      id: 'fill-3',
      type: 'expense' as const,
      amount: 20,
      category: 'transport',
      categoryLabel: 'Transportes',
      date: '2026-05-05',
      currency: 'EUR',
    },
    {
      id: 'fill-4',
      type: 'expense' as const,
      amount: 11,
      category: 'food',
      categoryLabel: 'Alimentação',
      date: '2026-05-20',
      currency: 'EUR',
    },
    {
      id: 'fill-5',
      type: 'expense' as const,
      amount: 9,
      category: 'food',
      categoryLabel: 'Alimentação',
      date: '2026-03-28',
      currency: 'EUR',
    },
  ];

  const recs = generateRecommendations(baseState(), {
    transactions,
    asOf: AS_OF,
  });

  const habitRec = recs.find((item) => item.ruleId === 'habit_insight');
  assert.ok(habitRec);
  assert.equal(habitRec.priority, 'baixa');
  assert.match(habitRec.explanation, /Normalmente gastas/);
  assert.doesNotMatch(habitRec.explanation, /demais|devias|evitar/i);
});

test('mergeRecommendationFiredRecords — actualiza timestamp das visíveis', () => {
  const merged = mergeRecommendationFiredRecords(
    [
      {
        id: 'rec-a',
        ruleId: 'emergency_fund',
        priority: 'alta',
        title: 'A',
        explanation: 'e',
        suggestedAction: 's',
        fingerprint: 'fp',
      },
    ],
    [],
    AS_OF,
  );

  assert.equal(merged.length, 1);
  assert.equal(merged[0].fingerprint, 'fp');
});
