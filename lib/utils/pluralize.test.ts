import assert from 'node:assert/strict';
import test from 'node:test';

import { pluralize, pluralizeSubscricoes } from '@/lib/utils/pluralize';

test('pluralizeSubscricoes — singular', () => {
  assert.equal(pluralizeSubscricoes(1), '1 subscrição a renovar');
});

test('pluralizeSubscricoes — plural', () => {
  assert.equal(pluralizeSubscricoes(3), '3 subscrições a renovar');
});

test('pluralizeSubscricoes — zero usa plural', () => {
  assert.equal(pluralizeSubscricoes(0), '0 subscrições a renovar');
});

test('pluralize genérico respeita singular/plural', () => {
  assert.equal(pluralize(1, 'dia', 'dias'), '1 dia');
  assert.equal(pluralize(2, 'dia', 'dias'), '2 dias');
});
