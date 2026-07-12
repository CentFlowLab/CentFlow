import type { BankAccount } from '@/lib/domain/account.types';
import type { Goal } from '@/lib/domain/assets.types';

import { roundMoney } from './money';
import type { RealSavingsMarginBreakdown } from './savings-margin';

export type SavingsAllocationAction = {
  goalId: string;
  goalName: string;
  amount: number;
  margin: RealSavingsMarginBreakdown;
};

export type BuildSavingsAllocationInput = {
  margin: RealSavingsMarginBreakdown;
  goals: Goal[];
  accounts?: BankAccount[];
  minAmount?: number;
};

const DEFAULT_MIN_AMOUNT = 10;

function roundAllocationAmount(amount: number): number {
  if (amount <= 0) return 0;
  return Math.ceil(amount / 5) * 5;
}

/** Sugere alocação com base na margem real (já com tecto de 90%). */
export function buildSavingsAllocationAction(
  input: BuildSavingsAllocationInput,
): SavingsAllocationAction | null {
  const minAmount = input.minAmount ?? DEFAULT_MIN_AMOUNT;
  const budget = input.margin.cappedActionBudget;
  if (budget < minAmount) return null;

  const openGoals = input.goals.filter(
    (goal) => goal.target > 0 && goal.current < goal.target,
  );
  if (openGoals.length === 0) return null;

  const goal = [...openGoals].sort((a, b) => {
    const progressA = a.current / a.target;
    const progressB = b.current / b.target;
    return progressA - progressB;
  })[0];

  const remaining = roundMoney(goal.target - goal.current);
  const amount = Math.min(roundAllocationAmount(Math.min(remaining, budget)), budget);

  if (amount < minAmount) return null;

  return {
    goalId: goal.id,
    goalName: goal.name,
    amount,
    margin: input.margin,
  };
}
