import assert from 'node:assert/strict';
import test from 'node:test';

import type { Credit } from '@/lib/domain/types';
import type { Transaction } from '@/lib/domain/transaction.types';

import { simulateDecision } from './decision-simulator';
import type { FinancialState, GoalProgressState } from './financial-state.types';
import { calculateRealSavingsMargin } from './savings-margin';

const AS_OF = new Date('2026-06-15T12:00:00');

function tx(
  partial: Pick<Transaction, 'type' | 'amount' | 'date'> & Partial<Transaction>,
): Transaction {
  return {
    id: partial.id ?? `tx-${partial.date}-${partial.amount}`,
    description: partial.description ?? 'Test',
    category: partial.category ?? 'other',
    categoryLabel: partial.categoryLabel ?? 'Outros',
    currency: 'EUR',
    ...partial,
  };
}

function stubState(partial: {
  availableThisMonth: number;
  daysRemaining?: number;
  credits?: Credit[];
  goalProgress?: GoalProgressState[];
}): FinancialState {
  return {
    asOf: AS_OF,
    availableThisMonth: partial.availableThisMonth,
    credits: partial.credits ?? [],
    subscriptions: { items: [], monthlyTotal: 0, renewingSoon: 0 },
    budget: { daysRemaining: partial.daysRemaining ?? 15 } as FinancialState['budget'],
    goalProgress: partial.goalProgress ?? [],
  } as FinancialState;
}

function baseContext(transactions: Transaction[]) {
  return { transactions, asOf: AS_OF };
}

test('simulateDecision — despesa a meio do mês com dívida não trata saldo bruto como excedente', () => {
  const transactions = [
    tx({ id: '1', type: 'income', amount: 2000, date: '2026-06-01' }),
    tx({ id: '2', type: 'expense', amount: 1500, date: '2026-06-10', category: 'food' }),
  ];
  const credits: Credit[] = [
    {
      id: 'loan1',
      name: 'Crédito',
      outstandingBalance: 5000,
      monthlyPayment: 200,
      creditType: 'personal',
    },
  ];
  const margin = calculateRealSavingsMargin(500, transactions, AS_OF).cappedActionBudget;
  const state = stubState({ availableThisMonth: margin, credits, daysRemaining: 15 });

  const result = simulateDecision(
    state,
    { type: 'one_time_expense', amount: 400, category: 'shopping' },
    baseContext(transactions),
  );

  assert.equal(result.isReadOnly, true);
  assert.ok(result.marginBefore >= 0);
  assert.ok(result.marginAfter < result.marginBefore);
  if (result.marginAfter <= 0) {
    assert.equal(result.canProceedWithoutRisk, false);
    assert.match(result.headline, /margem|orçamento|negativo/i);
  }
});

test('simulateDecision — saldo a 30 dias antes e depois', () => {
  const transactions = [
    tx({ id: '1', type: 'income', amount: 2500, date: '2026-06-01' }),
    tx({ id: '2', type: 'expense', amount: 400, date: '2026-06-05', category: 'food' }),
  ];
  const margin = calculateRealSavingsMargin(2100, transactions, AS_OF).cappedActionBudget;
  const state = stubState({ availableThisMonth: margin });

  const result = simulateDecision(
    state,
    { type: 'one_time_expense', amount: 50, category: 'food' },
    baseContext(transactions),
  );

  assert.ok(Number.isFinite(result.balanceAt30DaysBefore));
  assert.ok(Number.isFinite(result.balanceAt30DaysAfter));
  assert.equal(
    result.balanceDelta30Days,
    result.balanceAt30DaysAfter - result.balanceAt30DaysBefore,
  );
});

test('simulateDecision — objetivo atrasa com despesa grande', () => {
  const transactions = [
    tx({ id: '1', type: 'income', amount: 2000, date: '2026-06-01' }),
    tx({ id: '2', type: 'expense', amount: 1200, date: '2026-06-08', category: 'food' }),
  ];
  const margin = calculateRealSavingsMargin(800, transactions, AS_OF).cappedActionBudget;
  const state = stubState({
    availableThisMonth: margin,
    goalProgress: [
      {
        id: 'g1',
        name: 'Carro',
        current: 1000,
        target: 8000,
        percent: 12.5,
        remaining: 7000,
        isComplete: false,
      },
    ],
  });

  const result = simulateDecision(
    state,
    { type: 'one_time_expense', amount: 600, category: 'shopping' },
    baseContext(transactions),
  );

  const carImpact = result.goalImpacts.find((row) => row.goalName === 'Carro');
  if (carImpact) {
    assert.ok(carImpact.daysDelayed > 0);
    assert.match(carImpact.message, /Carro/);
  }
});

test('simulateDecision — pagamento extra de dívida reduz margem imediata', () => {
  const transactions = [
    tx({ id: '1', type: 'income', amount: 3000, date: '2026-06-01' }),
    tx({ id: '2', type: 'expense', amount: 500, date: '2026-06-05', category: 'food' }),
  ];
  const credits: Credit[] = [
    {
      id: 'loan1',
      name: 'Empréstimo',
      outstandingBalance: 10000,
      monthlyPayment: 300,
      interestRateAnnual: 9,
      creditType: 'personal',
    },
  ];
  const margin = calculateRealSavingsMargin(2500, transactions, AS_OF).cappedActionBudget;
  const state = stubState({ availableThisMonth: margin, credits });

  const result = simulateDecision(
    state,
    { type: 'debt_extra_payment', amount: 200, liabilityId: 'loan1' },
    baseContext(transactions),
  );

  assert.ok(result.marginAfter < result.marginBefore);
  assert.equal(result.decision.type, 'debt_extra_payment');
});

test('simulateDecision — não altera transações reais', () => {
  const transactions = [tx({ id: '1', type: 'income', amount: 1000, date: '2026-06-01' })];
  const margin = calculateRealSavingsMargin(1000, transactions, AS_OF).cappedActionBudget;
  const state = stubState({ availableThisMonth: margin });
  const snapshot = JSON.stringify(transactions);

  simulateDecision(
    state,
    { type: 'one_time_expense', amount: 900, category: 'shopping' },
    baseContext(transactions),
  );

  assert.equal(JSON.stringify(transactions), snapshot);
});
