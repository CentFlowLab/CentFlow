import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addMoney,
  centsToEuros,
  eurosToCents,
  formatMoney,
  roundMoney,
  safeAmount,
  subtractMoney,
} from '@/lib/domain/financial/money';

test('addMoney — soma decimal segura', () => {
  assert.equal(addMoney(10.1, 0.2), 10.3);
  assert.equal(eurosToCents(10.1) + eurosToCents(0.2), eurosToCents(10.3));
});

test('roundMoney — arredondamento', () => {
  assert.equal(roundMoney(10.005), 10.01);
  assert.equal(roundMoney(10.004), 10);
});

test('subtractMoney — valores negativos e zero', () => {
  assert.equal(subtractMoney(0, 5), -5);
  assert.equal(subtractMoney(5, 5), 0);
  assert.equal(safeAmount(Number.NaN), 0);
});

test('formatMoney — formato pt-PT', () => {
  assert.match(formatMoney(1234.5), /1[\s\u00a0]?234,50/);
});

test('centsToEuros — conversão', () => {
  assert.equal(centsToEuros(100), 1);
});
