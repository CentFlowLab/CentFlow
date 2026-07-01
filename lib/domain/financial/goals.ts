import type { Goal } from '@/lib/domain/assets.types';
import type { GoalContribution } from '@/lib/domain/goal-contribution.types';

import type { GoalProgressResult } from './domain-types';
export type { GoalProgressResult };
import { addMoney, roundMoney } from './money';

export function resolveGoalCurrent(
  goal: Pick<Goal, 'current'>,
  contributions: Pick<GoalContribution, 'amount'>[] = [],
): number {
  if (contributions.length === 0) return roundMoney(goal.current);
  const fromContributions = contributions.reduce(
    (sum, row) => addMoney(sum, row.amount),
    0,
  );
  return roundMoney(Math.max(fromContributions, goal.current));
}

export function calculateGoalProgress(
  goal: Pick<Goal, 'target' | 'current'>,
  contributions: Pick<GoalContribution, 'amount'>[] = [],
): GoalProgressResult {
  const current = resolveGoalCurrent(goal, contributions);
  const target = goal.target;
  const percent =
    target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

  return {
    current,
    target,
    percent,
    remaining: Math.max(0, roundMoney(target - current)),
    isComplete: current >= target && target > 0,
  };
}

export function calculateGoalRemaining(
  goal: Pick<Goal, 'target' | 'current'>,
  contributions: Pick<GoalContribution, 'amount'>[] = [],
): number {
  return calculateGoalProgress(goal, contributions).remaining;
}

export function calculateRequiredMonthlyContribution(
  goal: Pick<Goal, 'target' | 'current' | 'deadline'>,
  contributions: Pick<GoalContribution, 'amount'>[] = [],
  today: Date = new Date(),
): number | null {
  if (!goal.deadline) return null;
  const remaining = calculateGoalRemaining(goal, contributions);
  if (remaining <= 0) return 0;

  const deadline = new Date(`${goal.deadline.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(deadline.getTime()) || deadline <= today) return null;

  const monthsLeft = Math.max(
    1,
    (deadline.getFullYear() - today.getFullYear()) * 12 +
      (deadline.getMonth() - today.getMonth()) +
      1,
  );

  return roundMoney(remaining / monthsLeft);
}

export function calculateGoalOnTrack(
  goal: Pick<Goal, 'target' | 'current' | 'deadline'>,
  contributions: Pick<GoalContribution, 'amount'>[] = [],
  today: Date = new Date(),
): boolean | null {
  const required = calculateRequiredMonthlyContribution(goal, contributions, today);
  if (required === null) return null;
  if (required <= 0) return true;

  const progress = calculateGoalProgress(goal, contributions);
  if (!goal.deadline) return null;

  const deadline = new Date(`${goal.deadline.slice(0, 10)}T12:00:00`);
  const totalMonths = Math.max(
    1,
    (deadline.getFullYear() - today.getFullYear()) * 12 +
      (deadline.getMonth() - today.getMonth()) +
      1,
  );
  const expectedByNow = (progress.target / totalMonths) * (totalMonths - required);
  return progress.current >= expectedByNow * 0.9;
}

export function getGoalsAggregate(goals: Goal[]) {
  const totalTarget = goals.reduce((sum, goal) => addMoney(sum, goal.target), 0);
  const totalCurrent = goals.reduce((sum, goal) => addMoney(sum, goal.current), 0);
  const percent =
    totalTarget > 0 ? Math.min(100, Math.round((totalCurrent / totalTarget) * 100)) : 0;

  return { totalTarget, totalCurrent, percent, count: goals.length };
}

export function pickFeaturedGoal(goals: Goal[]): Goal | null {
  if (goals.length === 0) return null;

  const incomplete = goals.filter((goal) => goal.target > 0 && goal.current < goal.target);
  if (incomplete.length === 0) return goals[0];

  return [...incomplete].sort(
    (a, b) => calculateGoalProgress(b).percent - calculateGoalProgress(a).percent,
  )[0];
}

/** Compatibilidade com goal.utils legado. */
export function getGoalProgress(goal: Goal): {
  percent: number;
  remaining: number;
  isComplete: boolean;
} {
  const progress = calculateGoalProgress(goal);
  return {
    percent: progress.percent,
    remaining: progress.remaining,
    isComplete: progress.isComplete,
  };
}
