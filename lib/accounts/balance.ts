import type { BankAccount } from '@/lib/domain/account.types';
import type { GoalContribution } from '@/lib/domain/goal-contribution.types';
import {
  accountMovementDelta,
  goalContributionDelta,
} from '@/lib/domain/financial-movement';
import type { Transaction } from '@/lib/domain/transaction.types';

export type AccountBalanceInput = {
  account: Pick<BankAccount, 'id' | 'initialBalance'>;
  transactions: Transaction[];
  goalContributions?: GoalContribution[];
};

/** Saldo = inicial + movimentos/transferências − contribuições para objetivos. */
export function calculateAccountBalance(input: AccountBalanceInput): number {
  const movementNet = input.transactions.reduce(
    (sum, tx) => sum + accountMovementDelta(tx, input.account.id),
    0,
  );
  const contributionsNet = goalContributionDelta(
    input.goalContributions ?? [],
    input.account.id,
  );

  return round2(input.account.initialBalance + movementNet + contributionsNet);
}

export function enrichAccountsWithBalances(
  accounts: BankAccount[],
  transactions: Transaction[],
  goalContributions: GoalContribution[] = [],
): BankAccount[] {
  return accounts.map((account) => {
    const linked = transactions.filter(
      (tx) => tx.accountId === account.id || tx.destinationAccountId === account.id,
    );
    return {
      ...account,
      balance: calculateAccountBalance({
        account,
        transactions: linked,
        goalContributions,
      }),
    };
  });
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
