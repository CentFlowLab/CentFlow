import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateGoalOnTrack,
  calculateGoalProgress,
  calculateGoalRemaining,
  calculateRequiredMonthlyContribution,
} from '@/lib/domain/financial/goals';

test('progresso por contribuições', () => {
  const progress = calculateGoalProgress(
    { target: 1000, current: 0 },
    [{ amount: 250 }, { amount: 250 }],
  );
  assert.equal(progress.current, 500);
  assert.equal(progress.percent, 50);
  assert.equal(progress.remaining, 500);
});

test('valor em falta', () => {
  assert.equal(
    calculateGoalRemaining({ target: 800, current: 300 }),
    500,
  );
});

test('contribuição mensal necessária', () => {
  const today = new Date(2026, 0, 15);
  const required = calculateRequiredMonthlyContribution(
    { target: 1200, current: 200, deadline: '2026-07-01' },
    [],
    today,
  );
  assert.ok(required !== null && required > 0);
});

test('objetivo concluído — no ritmo', () => {
  const onTrack = calculateGoalOnTrack(
    { target: 500, current: 500, deadline: '2026-12-31' },
    [],
    new Date(2026, 5, 1),
  );
  assert.equal(onTrack, true);
});
