import type { BankAccount } from '@/lib/domain/account.types';
import type { GoalContribution } from '@/lib/domain/goal-contribution.types';
import type { Transaction } from '@/lib/domain/transaction.types';

import { addMoney, roundMoney } from './money';
import { resolveTransactionKind } from './transaction-kind';

export function accountMovementDelta(
  tx: Pick<Transaction, 'type' | 'amount' | 'accountId' | 'destinationAccountId' | 'creditId'>,
  accountId: string,
): number {
  const kind = resolveTransactionKind(tx);

  if (kind === 'transfer') {
    if (tx.accountId === accountId) return -tx.amount;
    if (tx.destinationAccountId === accountId) return tx.amount;
    return 0;
  }

  if (kind === 'credit_card_payment') {
    if (tx.accountId === accountId) return -tx.amount;
    return 0;
  }

  if (kind === 'credit_card_purchase' || kind === 'credit_card_refund') {
    return 0;
  }

  if (tx.accountId !== accountId) return 0;
  return kind === 'income' ? tx.amount : -tx.amount;
}

export function goalContributionDelta(
  contributions: Pick<GoalContribution, 'accountId' | 'amount'>[],
  accountId: string,
): number {
  return contributions.reduce((sum, row) => {
    if (row.accountId !== accountId) return sum;
    return sum - row.amount;
  }, 0);
}

export type AccountBalanceInput = {
  account: Pick<BankAccount, 'id' | 'initialBalance'>;
  transactions: Transaction[];
  goalContributions?: GoalContribution[];
};

/** Saldo = inicial + movimentos/transferências − contribuições para objetivos. */
export function calculateAccountBalance(input: AccountBalanceInput): number {
  const movementNet = input.transactions.reduce(
    (sum, tx) => addMoney(sum, accountMovementDelta(tx, input.account.id)),
    0,
  );
  const contributionsNet = goalContributionDelta(
    input.goalContributions ?? [],
    input.account.id,
  );

  return roundMoney(addMoney(input.account.initialBalance, movementNet, contributionsNet));
}

export function calculateTotalAccountsBalance(
  accounts: BankAccount[],
  transactions: Transaction[],
  goalContributions: GoalContribution[] = [],
): number {
  return roundMoney(
    accounts.reduce((sum, account) => {
      const linked = transactions.filter(
        (tx) => tx.accountId === account.id || tx.destinationAccountId === account.id,
      );
      return addMoney(
        sum,
        calculateAccountBalance({
          account,
          transactions: linked,
          goalContributions,
        }),
      );
    }, 0),
  );
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
