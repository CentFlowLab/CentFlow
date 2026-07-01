import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getCurrentMonthRange,
  getMonthKey,
  getPreviousMonthRange,
  isSameMonth,
  isTransactionFuture,
  isTransactionOccurred,
  isValidYear,
  isWithinPeriod,
  parseFinancialDate,
} from '@/lib/domain/financial/dates';

const JULY_FIRST = new Date(2026, 6, 1);
const JUNE_LAST = new Date(2026, 5, 30);

test('getMonthKey — dia 1 do mês', () => {
  assert.equal(getMonthKey(JULY_FIRST), '2026-07');
});

test('getCurrentMonthRange — último dia do mês', () => {
  const range = getCurrentMonthRange(JULY_FIRST);
  assert.equal(range.end.getDate(), 31);
  assert.equal(range.start.getDate(), 1);
});

test('isWithinPeriod — mês anterior não entra no actual', () => {
  const juneSalary = '2026-06-30';
  const julyPeriod = { kind: 'month' as const, monthKey: '2026-07', asOf: JULY_FIRST };
  const junePeriod = { kind: 'month' as const, monthKey: '2026-06', asOf: JUNE_LAST };

  assert.equal(isWithinPeriod(juneSalary, julyPeriod), false);
  assert.equal(isWithinPeriod(juneSalary, junePeriod), true);
});

test('isTransactionFuture — movimento futuro excluído do ocorrido', () => {
  const tomorrow = new Date(2026, 6, 2);
  assert.equal(isTransactionOccurred('2026-07-03', tomorrow), false);
  assert.equal(isTransactionFuture('2026-07-03', tomorrow), true);
});

test('parseFinancialDate — anos inválidos rejeitados', () => {
  assert.equal(parseFinancialDate('1906-01-01'), null);
  assert.equal(parseFinancialDate('2101-06-15'), null);
  assert.ok(parseFinancialDate('2026-01-01'));
});

test('getPreviousMonthRange — mês anterior correcto', () => {
  const prev = getPreviousMonthRange(JULY_FIRST);
  assert.equal(prev.monthKey, '2026-06');
});

test('isSameMonth — comparação por chave', () => {
  assert.equal(isSameMonth('2026-07-15', '2026-07'), true);
  assert.equal(isSameMonth('2026-06-30', '2026-07'), false);
});

test('isValidYear — limites', () => {
  assert.equal(isValidYear(2026), true);
  assert.equal(isValidYear(1906), false);
});
