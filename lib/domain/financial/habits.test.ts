import assert from 'node:assert/strict';
import test from 'node:test';

import type { Transaction } from '@/lib/domain/transaction.types';

import {
  buildHabitDeviationMessage,
  detectSpendingHabits,
  findHabitDeviations,
  hasEnoughHistoryForHabits,
} from '@/lib/domain/financial/habits';

const AS_OF = new Date('2026-06-15T12:00:00');

function expense(
  id: string,
  date: string,
  amount: number,
  overrides: Partial<Transaction> = {},
): Transaction {
  return {
    id,
    type: 'expense',
    amount,
    category: 'restaurant',
    categoryLabel: 'Restaurante',
    description: 'Burger spot',
    date,
    currency: 'EUR',
    ...overrides,
  };
}

function buildFridayHabitHistory(): Transaction[] {
  const fridays = [
    '2026-04-03',
    '2026-04-10',
    '2026-04-17',
    '2026-04-24',
    '2026-05-01',
    '2026-05-08',
    '2026-05-15',
    '2026-05-22',
    '2026-05-29',
    '2026-06-05',
  ];

  return [
    ...fridays.map((date, index) => expense(`tx-${index}`, date, 18)),
    expense('filler-1', '2026-04-01', 12, { category: 'food', categoryLabel: 'Alimentação' }),
    expense('filler-2', '2026-04-20', 15, { category: 'food', categoryLabel: 'Alimentação' }),
    expense('filler-3', '2026-05-05', 20, { category: 'transport', categoryLabel: 'Transportes' }),
    expense('filler-4', '2026-05-20', 11, { category: 'food', categoryLabel: 'Alimentação' }),
  ];
}

test('hasEnoughHistoryForHabits — rejeita histórico curto', () => {
  const short = [
    expense('a', '2026-06-01', 10),
    expense('b', '2026-06-08', 12),
  ];
  assert.equal(hasEnoughHistoryForHabits(short, AS_OF), false);
});

test('detectSpendingHabits — deteta padrão semanal consistente', () => {
  const transactions = buildFridayHabitHistory();
  assert.equal(hasEnoughHistoryForHabits(transactions, AS_OF), true);

  const habits = detectSpendingHabits(transactions, { asOf: AS_OF });
  assert.ok(habits.length >= 1);

  const restaurantFriday = habits.find(
    (habit) => habit.category === 'restaurant' && habit.dayOfWeek === 5,
  );
  assert.ok(restaurantFriday);
  assert.equal(restaurantFriday.occurrenceCount, 7);
  assert.equal(restaurantFriday.averageAmount, 18);
  assert.ok(restaurantFriday.confidence >= 0.7);
});

test('detectSpendingHabits — ignora padrões marcados pelo utilizador', () => {
  const transactions = buildFridayHabitHistory();
  const habits = detectSpendingHabits(transactions, { asOf: AS_OF });
  const habitId = habits[0]?.id;
  assert.ok(habitId);

  const filtered = detectSpendingHabits(transactions, {
    asOf: AS_OF,
    ignoredHabitIds: [habitId],
  });
  assert.equal(filtered.find((item) => item.id === habitId), undefined);
});

test('findHabitDeviations — insight quando valor excede média do hábito', () => {
  const transactions = [
    ...buildFridayHabitHistory().filter((tx) => tx.id !== 'tx-9'),
    expense('tx-9', '2026-06-05', 34),
  ];

  const habits = detectSpendingHabits(transactions, { asOf: AS_OF });
  const deviations = findHabitDeviations(transactions, habits, { asOf: AS_OF });

  assert.equal(deviations.length, 1);
  assert.equal(deviations[0].actualAmount, 34);

  const message = buildHabitDeviationMessage(deviations[0].habit, deviations[0].actualAmount);
  assert.match(message, /Normalmente gastas/);
  assert.match(message, /34/);
  assert.doesNotMatch(message, /demais|devias|evitar|culpa/i);
});

test('detectSpendingHabits — sem histórico suficiente devolve lista vazia', () => {
  const habits = detectSpendingHabits([expense('x', '2026-06-10', 20)], { asOf: AS_OF });
  assert.deepEqual(habits, []);
});
