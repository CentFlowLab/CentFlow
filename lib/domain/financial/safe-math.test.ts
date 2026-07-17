import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clampPercentage,
  emergencyMonthsCovered,
  formatMissingMetricLabel,
  percentChangeVsPrevious,
  safeDivide,
} from './safe-math';

test('safeDivide — denominador zero ou inválido', () => {
  assert.equal(safeDivide(10, 0), null);
  assert.equal(safeDivide(10, -0), null);
  assert.equal(safeDivide(Number.NaN, 2), null);
  assert.equal(safeDivide(10, Number.POSITIVE_INFINITY), null);
  assert.equal(safeDivide(10, 2), 5);
});

test('clampPercentage — limita 0–100 e rejeita não-finitos', () => {
  assert.equal(clampPercentage(-5), 0);
  assert.equal(clampPercentage(150), 100);
  assert.equal(clampPercentage(42.5), 42.5);
  assert.equal(clampPercentage(Number.NaN), null);
  assert.equal(clampPercentage(undefined), null);
});

test('percentChangeVsPrevious — nunca −100% por base zero', () => {
  assert.equal(percentChangeVsPrevious(50, 0), null);
  assert.equal(percentChangeVsPrevious(0, 0), null);
  assert.equal(percentChangeVsPrevious(-20, 100), -120);
  assert.equal(percentChangeVsPrevious(150, 100), 50);
});

test('emergencyMonthsCovered — sem fixos / disponível negativo', () => {
  assert.equal(emergencyMonthsCovered(900, 300), 3);
  assert.equal(emergencyMonthsCovered(100, 0), null);
  assert.equal(emergencyMonthsCovered(-200, 300), 0);
  assert.equal(emergencyMonthsCovered(Number.NaN, 300), null);
});

test('formatMissingMetricLabel — copy PT-PT', () => {
  assert.equal(formatMissingMetricLabel('no_comparison'), 'Sem comparação disponível');
  assert.equal(formatMissingMetricLabel(), 'Sem dados suficientes');
});
