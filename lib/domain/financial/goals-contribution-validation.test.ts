import assert from 'node:assert/strict';
import test from 'node:test';

import { validateGoalContribution } from './goals';

test('validateGoalContribution bloqueia valor inválido ou saldo insuficiente', () => {
  assert.deepEqual(validateGoalContribution({ amount: 0, accountBalance: 500 }), {
    ok: false,
    reason: 'Indica um valor válido.',
  });
  assert.deepEqual(validateGoalContribution({ amount: 100, accountBalance: 50 }), {
    ok: false,
    reason: 'Saldo insuficiente na conta.',
  });
  assert.deepEqual(validateGoalContribution({ amount: 50, accountBalance: 50 }), { ok: true });
});
