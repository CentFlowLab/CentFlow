import assert from 'node:assert/strict';
import test from 'node:test';

import type { Goal } from '@/lib/domain/assets.types';

import { buildSavingsAllocationAction } from './savings-allocation';
import { calculateRealSavingsMargin } from './savings-margin';

function goal(partial: Partial<Goal> & Pick<Goal, 'id'>): Goal {
  return {
    name: partial.name ?? 'Objetivo',
    target: partial.target ?? 1000,
    current: partial.current ?? 0,
    ...partial,
  };
}

function margin(available: number) {
  return calculateRealSavingsMargin(available, [], new Date('2026-07-05T12:00:00'));
}

test('buildSavingsAllocationAction — margem real suficiente', () => {
  const m = margin(200);
  const action = buildSavingsAllocationAction({
    margin: m,
    goals: [goal({ id: 'g1', name: 'Fundo', target: 1000, current: 200 })],
  });

  assert.ok(action);
  assert.equal(action.goalId, 'g1');
  assert.equal(action.amount, 180);
});

test('buildSavingsAllocationAction — bloqueia sem margem disponível', () => {
  const action = buildSavingsAllocationAction({
    margin: margin(0),
    goals: [goal({ id: 'g1', target: 1000, current: 0 })],
  });

  assert.equal(action, null);
});

test('buildSavingsAllocationAction — ignora objetivos já completos', () => {
  const action = buildSavingsAllocationAction({
    margin: margin(100),
    goals: [goal({ id: 'g1', target: 500, current: 500 })],
  });

  assert.equal(action, null);
});
