import assert from 'node:assert/strict';
import test from 'node:test';

import type { Credit } from '@/lib/domain/types';
import type { Transaction } from '@/lib/domain/transaction.types';

import { buildFinancialCalendar } from './calendar';
import type { FinancialState } from './financial-state.types';
import { createTestFinancialState } from './test-financial-state.fixture';

const AS_OF = new Date('2026-07-10T12:00:00');

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

function stubState(): FinancialState {
  return createTestFinancialState({
    asOf: AS_OF,
    availableThisMonth: 500,
    budget: { ...createTestFinancialState().budget, daysRemaining: 20 },
  });
}

test('buildFinancialCalendar — sem padrão de rendimento assinala receção não confirmada', () => {
  const transactions = [
    tx({ id: '1', type: 'expense', amount: 50, date: '2026-07-05', category: 'food' }),
  ];

  const result = buildFinancialCalendar(stubState(), 30, {
    transactions,
    subscriptions: [],
    credits: [],
    asOf: AS_OF,
  });

  assert.equal(result.incomePatternDetected, false);
  assert.match(result.incomePatternNote ?? '', /não confirmado/i);
});

test('buildFinancialCalendar — crédito com vencimento gera evento e dias com saldo', () => {
  const transactions = [
    tx({ id: '1', type: 'income', amount: 2000, date: '2026-04-01' }),
    tx({ id: '2', type: 'income', amount: 2000, date: '2026-05-01' }),
    tx({ id: '3', type: 'income', amount: 2000, date: '2026-06-01' }),
    tx({ id: '4', type: 'expense', amount: 300, date: '2026-07-02', category: 'food' }),
  ];
  const credits: Credit[] = [
    {
      id: 'loan1',
      name: 'Empréstimo',
      outstandingBalance: 5000,
      monthlyPayment: 400,
      nextPaymentDate: '2026-07-15',
      creditType: 'personal',
    },
  ];

  const result = buildFinancialCalendar(stubState(), 30, {
    transactions,
    subscriptions: [],
    credits,
    asOf: AS_OF,
  });

  const paymentDay = result.days.find((day) => day.date === '2026-07-15');
  assert.ok(paymentDay);
  assert.ok(paymentDay.events.some((event) => event.kind === 'credit_payment'));
  assert.ok(result.days.every((day) => Number.isFinite(day.projectedBalance)));
});

test('buildFinancialCalendar — deteta rendimento recorrente', () => {
  const transactions = [
    tx({ id: '1', type: 'income', amount: 1800, date: '2026-04-25', description: 'Salário ACME' }),
    tx({ id: '2', type: 'income', amount: 1800, date: '2026-05-25', description: 'Salário ACME' }),
    tx({ id: '3', type: 'income', amount: 1800, date: '2026-06-25', description: 'Salário ACME' }),
  ];

  const result = buildFinancialCalendar(stubState(), 30, {
    transactions,
    subscriptions: [],
    credits: [],
    asOf: AS_OF,
  });

  assert.ok(result.detectedIncome.length > 0);
  assert.equal(result.incomePatternDetected, true);
});

test('buildFinancialCalendar — classifica risco quando saldo projetado negativo', () => {
  const transactions = [
    tx({ id: '1', type: 'income', amount: 500, date: '2026-04-01' }),
    tx({ id: '2', type: 'income', amount: 500, date: '2026-05-01' }),
    tx({ id: '3', type: 'expense', amount: 900, date: '2026-07-01', category: 'food' }),
  ];
  const credits: Credit[] = [
    {
      id: 'loan1',
      name: 'Crédito',
      outstandingBalance: 3000,
      monthlyPayment: 800,
      nextPaymentDate: '2026-07-12',
      creditType: 'personal',
    },
  ];

  const result = buildFinancialCalendar(stubState(), 30, {
    transactions,
    subscriptions: [],
    credits,
    asOf: AS_OF,
  });

  const hasRisk = result.days.some((day) => day.risk === 'risk');
  if (hasRisk) {
    assert.ok(result.riskDays.length > 0);
    assert.ok(result.firstRiskDay);
  }
});
