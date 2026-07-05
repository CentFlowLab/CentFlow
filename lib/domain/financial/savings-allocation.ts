import type { BankAccount } from '@/lib/domain/account.types';
import type { Goal } from '@/lib/domain/assets.types';

import { isBudgetAccount } from './budget-accounts';
import { roundMoney } from './money';
import { validateGoalContribution } from './goals';

export type SavingsAllocationAction = {
  goalId: string;
  goalName: string;
  accountId: string;
  accountName: string;
  amount: number;
  availableThisMonth: number;
};

export type BuildSavingsAllocationInput = {
  availableThisMonth: number;
  goals: Goal[];
  accounts: BankAccount[];
  minAmount?: number;
};

const DEFAULT_MIN_AMOUNT = 10;

function roundAllocationAmount(amount: number): number {
  if (amount <= 0) return 0;
  return Math.ceil(amount / 5) * 5;
}

function accountBalance(account: BankAccount): number {
  return account.balance ?? account.initialBalance;
}

/** Sugere alocação quando há margem de poupança e saldo suficiente na conta de origem. */
export function buildSavingsAllocationAction(
  input: BuildSavingsAllocationInput,
): SavingsAllocationAction | null {
  const minAmount = input.minAmount ?? DEFAULT_MIN_AMOUNT;
  const available = roundMoney(input.availableThisMonth);
  if (available < minAmount) return null;

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
  const cappedByBudget = Math.min(remaining, available);
  const softCap = roundAllocationAmount(available * 0.5);
  const amount = roundAllocationAmount(Math.min(cappedByBudget, softCap > 0 ? softCap : cappedByBudget));

  if (amount < minAmount) return null;

  const eligibleAccounts = input.accounts
    .filter((account) => account.isActive && isBudgetAccount(account))
    .filter((account) => accountBalance(account) >= amount)
    .sort((a, b) => accountBalance(b) - accountBalance(a));

  const account = eligibleAccounts[0];
  if (!account) return null;

  const balance = accountBalance(account);
  const validation = validateGoalContribution({ amount, accountBalance: balance });
  if (!validation.ok) return null;

  return {
    goalId: goal.id,
    goalName: goal.name,
    accountId: account.id,
    accountName: account.name,
    amount,
    availableThisMonth: available,
  };
}
