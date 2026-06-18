import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getAutoCreditName,
  inferCreditTypeFromName,
  resolveCreditName,
} from '@/lib/credit/credit-type.utils';

test('getAutoCreditName returns predefined labels', () => {
  assert.equal(getAutoCreditName('personal'), 'Crédito pessoal');
  assert.equal(getAutoCreditName('mortgage'), 'Crédito habitação');
  assert.equal(getAutoCreditName('auto'), 'Crédito automóvel');
  assert.equal(getAutoCreditName('student'), 'Crédito estudante');
});

test('resolveCreditName uses custom name only for other', () => {
  assert.equal(resolveCreditName('mortgage'), 'Crédito habitação');
  assert.equal(resolveCreditName('other', 'Crédito consolidado'), 'Crédito consolidado');
  assert.equal(resolveCreditName('other', '  '), '');
});

test('inferCreditTypeFromName detects auto names', () => {
  assert.equal(inferCreditTypeFromName('Crédito habitação'), 'mortgage');
  assert.equal(inferCreditTypeFromName('Crédito consolidado'), 'other');
});
