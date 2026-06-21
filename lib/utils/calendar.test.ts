import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMonthGrid,
  isDateDisabled,
  isSameDay,
  startOfDay,
} from '@/lib/utils/calendar';

test('buildMonthGrid gera 42 células', () => {
  assert.equal(buildMonthGrid(2026, 5).length, 42);
});

test('buildMonthGrid marca dias do mês corrente', () => {
  const grid = buildMonthGrid(2026, 5);
  const inMonth = grid.filter((cell) => cell.inCurrentMonth);
  assert.equal(inMonth.length, 30);
  assert.ok(inMonth.every((cell) => cell.date.getMonth() === 5));
});

test('isDateDisabled respeita minimumDate e maximumDate', () => {
  const day = new Date(2026, 5, 15);
  const min = new Date(2026, 5, 10);
  const max = new Date(2026, 5, 20);

  assert.equal(isDateDisabled(day, min, max), false);
  assert.equal(isDateDisabled(new Date(2026, 5, 5), min, max), true);
  assert.equal(isDateDisabled(new Date(2026, 5, 25), min, max), true);
});

test('isSameDay compara apenas a data', () => {
  const a = new Date(2026, 5, 15, 9, 30);
  const b = new Date(2026, 5, 15, 18, 0);
  assert.equal(isSameDay(a, b), true);
  assert.equal(isSameDay(a, new Date(2026, 5, 16)), false);
});

test('startOfDay zera horas', () => {
  const day = startOfDay(new Date(2026, 5, 15, 14, 45));
  assert.equal(day.getHours(), 0);
  assert.equal(day.getMinutes(), 0);
});
