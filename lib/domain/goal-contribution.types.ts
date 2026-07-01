export type GoalContribution = {
  id: string;
  goalId: string;
  accountId?: string;
  amount: number;
  note?: string;
  createdAt: string;
};

export type CreateGoalContributionInput = {
  goalId: string;
  accountId: string;
  amount: number;
  note?: string;
};
