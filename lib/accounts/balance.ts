import type { BankAccount } from '@/lib/domain/account.types';
import type { Transaction } from '@/lib/domain/transaction.types';
import { toIsoDateString } from '@/lib/utils/format';

export function calculateAccountBalance(
  account: Pick<BankAccount, 'id' | 'initialBalance'>,
  transactions: Transaction[],
): number {
  const accountTransactions = transactions.filter((t) => t.accountId === account.id);
  const transactionSum = accountTransactions.reduce((sum, t) => {
    return t.type === 'income' ? sum + t.amount : sum - t.amount;
  }, 0);
  return account.initialBalance + transactionSum;
}

export function calculateAccountMonthDelta(
  accountId: string,
  transactions: Transaction[],
  referenceDate: Date = new Date(),
): number {
  const monthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const monthStartIso = toIsoDateString(monthStart);

  return transactions
    .filter((t) => t.accountId === accountId && t.date >= monthStartIso)
    .reduce((sum, t) => (t.type === 'income' ? sum + t.amount : sum - t.amount), 0);
}

export function enrichAccountsWithBalances(
  accounts: BankAccount[],
  transactions: Transaction[],
): Array<BankAccount & { balance: number; monthDelta: number }> {
  return accounts
    .filter((a) => a.isActive)
    .map((account) => ({
      ...account,
      balance: calculateAccountBalance(account, transactions),
      monthDelta: calculateAccountMonthDelta(account.id, transactions),
    }));
}
