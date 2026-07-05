import { isCardCredit } from '@/lib/credit/credit-type.utils';
import type { BankAccount } from '@/lib/domain/account.types';
import type { Credit } from '@/lib/domain/types';

import { isBudgetAccount } from './budget-accounts';
import { pickPriorityDebtTarget, resolveDebtEffectiveAnnualRate } from './debt-priority';
import { roundMoney } from './money';
import type { RealSavingsMarginBreakdown } from './savings-margin';

export type DebtAmortizationAction = {
  creditId: string;
  creditName: string;
  isCard: boolean;
  amount: number;
  outstandingBalance: number;
  effectiveAnnualRate: number | null;
  margin: RealSavingsMarginBreakdown;
};

export type BuildDebtAmortizationInput = {
  margin: RealSavingsMarginBreakdown;
  credits: Credit[];
  accounts: BankAccount[];
  prioritizeDebt: boolean;
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

/** Sugere amortização quando a prioridade de dívida está activa e há margem real. */
export function buildDebtAmortizationAction(
  input: BuildDebtAmortizationInput,
): DebtAmortizationAction | null {
  if (!input.prioritizeDebt) return null;

  const target = pickPriorityDebtTarget(input.credits);
  if (!target || target.outstandingBalance <= 0) return null;

  const minAmount = input.minAmount ?? DEFAULT_MIN_AMOUNT;
  const budget = input.margin.cappedActionBudget;
  if (budget < minAmount) return null;

  const cappedByDebt = Math.min(target.outstandingBalance, budget);
  const amount = Math.min(roundAllocationAmount(cappedByDebt), budget);
  if (amount < minAmount) return null;

  const eligibleAccounts = input.accounts
    .filter((account) => account.isActive && isBudgetAccount(account))
    .filter((account) => accountBalance(account) >= amount);

  if (eligibleAccounts.length === 0) return null;

  return {
    creditId: target.id,
    creditName: target.name,
    isCard: isCardCredit(target.creditType),
    amount,
    outstandingBalance: roundMoney(target.outstandingBalance),
    effectiveAnnualRate: resolveDebtEffectiveAnnualRate(target),
    margin: input.margin,
  };
}
