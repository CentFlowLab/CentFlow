import type { AccountType, BankAccount } from '@/lib/domain/account.types';
import type { Transaction } from '@/lib/domain/transaction.types';

import type { FinancialPeriod } from './dates';
import { addMoney, roundMoney } from './money';
import { resolveTransactionKind } from './transaction-kind';
import { filterTransactionsByPeriod } from './transactions';

export type BudgetAccountSnapshot = {
  id: string;
  name: string;
  balance: number;
  type: AccountType;
};

/** Defaults por tipo — só contas de gasto corrente entram no orçamento. */
export function defaultBudgetEnabledForType(type: AccountType): boolean {
  return type === 'checking' || type === 'wallet';
}

export function resolveBudgetEnabled(
  account: Pick<BankAccount, 'budgetEnabled' | 'type' | 'isActive'>,
): boolean {
  if (!account.isActive) return false;
  if (account.budgetEnabled !== undefined) return account.budgetEnabled;
  return defaultBudgetEnabledForType(account.type);
}

export function isBudgetAccount(
  account: Pick<BankAccount, 'budgetEnabled' | 'type' | 'isActive'>,
): boolean {
  return resolveBudgetEnabled(account);
}

export function getBudgetAccountIds(accounts: BankAccount[]): Set<string> {
  return new Set(accounts.filter(isBudgetAccount).map((account) => account.id));
}

export function partitionAccountsByBudget(accounts: BankAccount[]): {
  inBudget: BankAccount[];
  outOfBudget: BankAccount[];
} {
  const inBudget: BankAccount[] = [];
  const outOfBudget: BankAccount[] = [];
  for (const account of accounts) {
    if (!account.isActive) continue;
    if (isBudgetAccount(account)) inBudget.push(account);
    else outOfBudget.push(account);
  }
  return { inBudget, outOfBudget };
}

export function sumBudgetAccountBalances(accounts: BankAccount[]): number {
  return roundMoney(
    accounts
      .filter(isBudgetAccount)
      .reduce((sum, account) => addMoney(sum, account.balance ?? account.initialBalance), 0),
  );
}

export function toBudgetAccountSnapshots(accounts: BankAccount[]): BudgetAccountSnapshot[] {
  return accounts.map((account) => ({
    id: account.id,
    name: account.name,
    balance: roundMoney(account.balance ?? account.initialBalance),
    type: account.type,
  }));
}

export function calculateBudgetTransferFlow(
  transactions: Transaction[],
  budgetAccountIds: Set<string>,
  period: FinancialPeriod,
): { movedOutOfBudget: number; movedIntoBudget: number } {
  let movedOutOfBudget = 0;
  let movedIntoBudget = 0;

  for (const tx of filterTransactionsByPeriod(transactions, period)) {
    if (resolveTransactionKind(tx) !== 'transfer') continue;
    const fromBudget = Boolean(tx.accountId && budgetAccountIds.has(tx.accountId));
    const toBudget = Boolean(
      tx.destinationAccountId && budgetAccountIds.has(tx.destinationAccountId),
    );
    if (fromBudget && !toBudget) {
      movedOutOfBudget = addMoney(movedOutOfBudget, tx.amount);
    }
    if (!fromBudget && toBudget) {
      movedIntoBudget = addMoney(movedIntoBudget, tx.amount);
    }
  }

  return {
    movedOutOfBudget: roundMoney(movedOutOfBudget),
    movedIntoBudget: roundMoney(movedIntoBudget),
  };
}

export function isTransactionInBudgetScope(
  tx: Pick<Transaction, 'accountId' | 'destinationAccountId' | 'type'>,
  budgetAccountIds: Set<string>,
): boolean {
  if (tx.accountId && budgetAccountIds.has(tx.accountId)) return true;
  if (tx.destinationAccountId && budgetAccountIds.has(tx.destinationAccountId)) return true;
  return false;
}
