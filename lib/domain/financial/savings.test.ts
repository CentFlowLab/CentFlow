import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateSavingsRate } from '@/lib/domain/financial/savings';

test('taxa de poupança — rendimento normal', () => {
  const result = calculateSavingsRate(2000, 1500);
  assert.equal(result.rate, 25);
  assert.equal(result.status, 'healthy');
});

test('rendimento zero — sem divisão por zero', () => {
  const result = calculateSavingsRate(0, 500);
  assert.equal(result.rate, null);
  assert.equal(result.status, 'deficit');
});

test('despesa maior que rendimento', () => {
  const result = calculateSavingsRate(1000, 1200);
  assert.equal(result.rate, -20);
  assert.equal(result.status, 'deficit');
});

test('valores negativos tratados com safeAmount', () => {
  const result = calculateSavingsRate(-100, 50);
  assert.equal(result.rate, null);
});
