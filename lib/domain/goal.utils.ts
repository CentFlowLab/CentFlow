import type { Goal } from './assets.types';

export type GoalProgress = {
  percent: number;
  remaining: number;
  isComplete: boolean;
};

export function getGoalProgress(goal: Goal): GoalProgress {
  const percent =
    goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;

  return {
    percent,
    remaining: Math.max(0, goal.target - goal.current),
    isComplete: goal.current >= goal.target && goal.target > 0,
  };
}

export function getGoalsAggregate(goals: Goal[]) {
  const totalTarget = goals.reduce((sum, goal) => sum + goal.target, 0);
  const totalCurrent = goals.reduce((sum, goal) => sum + goal.current, 0);
  const percent =
    totalTarget > 0 ? Math.min(100, Math.round((totalCurrent / totalTarget) * 100)) : 0;

  return { totalTarget, totalCurrent, percent, count: goals.length };
}
