/**
 * Tipos de domínio financeiro — aliases sobre tipos existentes da app.
 * Não duplicar schema Supabase; adaptar nomenclatura interna.
 */

import type { BankAccount } from '@/lib/domain/account.types';
import type { Goal } from '@/lib/domain/assets.types';
import type { GoalContribution } from '@/lib/domain/goal-contribution.types';
import type { Transaction } from '@/lib/domain/transaction.types';
import type { Credit } from '@/lib/domain/types';

export type FinancialTransaction = Transaction;
export type FinancialAccount = BankAccount;
export type FinancialGoal = Goal;
export type FinancialGoalContribution = GoalContribution;
export type FinancialLiability = Credit;

export type CashflowTransactionType = 'income' | 'expense';

export type CategoryTotal = {
  key: string;
  label: string;
  amount: number;
};

export type MerchantTotal = {
  key: string;
  label: string;
  amount: number;
};

export type GoalProgressResult = {
  current: number;
  target: number;
  percent: number;
  remaining: number;
  isComplete: boolean;
};

export type SavingsRateResult = {
  rate: number | null;
  income: number;
  expenses: number;
  net: number;
  status: 'healthy' | 'break_even' | 'deficit' | 'no_income';
};

export type NetWorthBreakdown = {
  accounts: number;
  goalsReserved: number;
  inventory: number;
  investments: number;
  liabilities: number;
  netWorth: number;
};
