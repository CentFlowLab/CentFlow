import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { generateInsights } from '@/lib/insights/generate-insights';
import type { InsightInput } from '@/lib/insights/types';

function baseInput(overrides: Partial<InsightInput> = {}): InsightInput {
  return {
    transactions: [],
    subscriptions: [],
    credits: [],
    goals: [],
    monthlyIncome: 2000,
    monthlyExpenses: 0,
    referenceDate: new Date('2026-06-15T12:00:00'),
    ...overrides,
  };
}

describe('generateInsights', () => {
  it('retorna vazio com dados mínimos (1 movimento)', () => {
    const insights = generateInsights(
      baseInput({
        transactions: [
          {
            id: '1',
            type: 'expense',
            amount: 10,
            category: 'food',
            categoryLabel: 'Alimentação',
            date: '2026-06-10',
            currency: 'EUR',
          },
        ],
        monthlyExpenses: 10,
      }),
    );
    assert.equal(insights.length, 0);
  });

  it('alerta ritmo de gasto quando projeção excede rendimento', () => {
    const insights = generateInsights(
      baseInput({
        monthlyIncome: 1000,
        monthlyExpenses: 900,
        transactions: [
          { id: '1', type: 'expense', amount: 300, category: 'food', categoryLabel: 'Alimentação', date: '2026-06-01', currency: 'EUR' },
          { id: '2', type: 'expense', amount: 300, category: 'food', categoryLabel: 'Alimentação', date: '2026-06-05', currency: 'EUR' },
          { id: '3', type: 'expense', amount: 300, category: 'food', categoryLabel: 'Alimentação', date: '2026-06-10', currency: 'EUR' },
        ],
      }),
    );
    assert.ok(insights.some((i) => i.id === 'spending-pace'));
  });

  it('mostra insight de subscrições quando existem', () => {
    const insights = generateInsights(
      baseInput({
        subscriptions: [{ id: 's1', name: 'Netflix', amount: 14, billingInterval: 'monthly' }],
      }),
    );
    assert.ok(insights.some((i) => i.id === 'subs-annual'));
  });

  it('mês sem receitas não gera projeção de objetivo', () => {
    const insights = generateInsights(
      baseInput({
        monthlyIncome: 0,
        goals: [{ id: 'g1', name: 'Férias', current: 0, target: 1000 }],
        transactions: [
          { id: '1', type: 'expense', amount: 50, category: 'food', categoryLabel: 'Alimentação', date: '2026-06-01', currency: 'EUR' },
          { id: '2', type: 'expense', amount: 50, category: 'food', categoryLabel: 'Alimentação', date: '2026-06-02', currency: 'EUR' },
          { id: '3', type: 'expense', amount: 50, category: 'food', categoryLabel: 'Alimentação', date: '2026-06-03', currency: 'EUR' },
        ],
      }),
    );
    assert.ok(!insights.some((i) => i.id.startsWith('goal-')));
  });

  it('objetivo já atingido gera insight positivo', () => {
    const insights = generateInsights(
      baseInput({
        goals: [{ id: 'g1', name: 'Férias', current: 1000, target: 1000 }],
        transactions: [
          { id: '1', type: 'expense', amount: 50, category: 'food', categoryLabel: 'Alimentação', date: '2026-06-01', currency: 'EUR' },
          { id: '2', type: 'expense', amount: 50, category: 'food', categoryLabel: 'Alimentação', date: '2026-06-02', currency: 'EUR' },
          { id: '3', type: 'expense', amount: 50, category: 'food', categoryLabel: 'Alimentação', date: '2026-06-03', currency: 'EUR' },
        ],
      }),
    );
    assert.ok(insights.some((i) => i.id === 'goal-done-g1'));
  });

  it('limita a 5 insights', () => {
    const insights = generateInsights(
      baseInput({
        netWorthChangePercent: 5,
        subscriptions: [{ id: 's1', name: 'Spotify', amount: 10, billingInterval: 'monthly' }],
        transactions: [
          { id: '1', type: 'expense', amount: 500, category: 'shopping', categoryLabel: 'Compras', date: '2026-06-01', currency: 'EUR' },
          { id: '2', type: 'expense', amount: 400, category: 'shopping', categoryLabel: 'Compras', date: '2026-06-02', currency: 'EUR' },
          { id: '3', type: 'expense', amount: 300, category: 'food', categoryLabel: 'Alimentação', date: '2026-06-03', currency: 'EUR' },
          { id: '4', type: 'expense', amount: 200, category: 'food', categoryLabel: 'Alimentação', date: '2026-05-10', currency: 'EUR' },
        ],
      }),
    );
    assert.ok(insights.length <= 5);
  });
});
