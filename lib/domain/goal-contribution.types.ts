export type GoalContributionKind = 'contribution' | 'withdrawal';

export type GoalContribution = {
  id: string;
  goalId: string;
  accountId?: string;
  amount: number;
  kind?: GoalContributionKind;
  note?: string;
  createdAt: string;
};

export type CreateGoalContributionInput = {
  goalId: string;
  accountId?: string;
  amount: number;
  note?: string;
};

export type CreateGoalWithdrawalInput = {
  goalId: string;
  accountId?: string;
  amount: number;
  note?: string;
};
