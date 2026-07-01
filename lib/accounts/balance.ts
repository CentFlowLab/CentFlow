import type { BankAccount } from '@/lib/domain/account.types';
import type { Transaction } from '@/lib/domain/transaction.types';
import { transactionCashDelta } from '@/lib/domain/transaction-date.utils';

/** Saldo de uma conta = saldo inicial + movimentos associados. */
export function calculateAccountBalance(
  account: Pick<BankAccount, 'initialBalance'>,
  transactions: Transaction[],
): number {
  const movementNet = transactions.reduce((sum, tx) => sum + transactionCashDelta(tx), 0);
  return round2(account.initialBalance + movementNet);
}

export function enrichAccountsWithBalances(
  accounts: BankAccount[],
  transactions: Transaction[],
): BankAccount[] {
  return accounts.map((account) => {
    const linked = transactions.filter((tx) => tx.accountId === account.id);
    return {
      ...account,
      balance: calculateAccountBalance(account, linked),
    };
  });
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
