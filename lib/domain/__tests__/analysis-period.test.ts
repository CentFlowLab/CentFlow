import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ANALYSIS_PERIOD_OPTIONS,
  getPeriodOption,
} from '@/lib/domain/analysis-period';

test('período 6 meses existe com 180 dias', () => {
  const option = getPeriodOption('halfyear');
  assert.equal(option.key, 'halfyear');
  assert.equal(option.label, '6 Meses');
  assert.equal(option.days, 180);
  assert.equal(option.buckets, 6);
});

test('ANALYSIS_PERIOD_OPTIONS inclui 5 períodos', () => {
  assert.equal(ANALYSIS_PERIOD_OPTIONS.length, 5);
  assert.ok(ANALYSIS_PERIOD_OPTIONS.some((option) => option.key === 'halfyear'));
});
