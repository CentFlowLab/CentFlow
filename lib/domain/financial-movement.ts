import type { GoalContribution } from '@/lib/domain/goal-contribution.types';
import type { Transaction } from '@/lib/domain/transaction.types';

/** Impacto no fluxo de caixa global (análises de receitas/despesas). */
export function transactionCashDelta(tx: Pick<Transaction, 'type' | 'amount'>): number {
  if (tx.type === 'transfer') return 0;
  return tx.type === 'income' ? tx.amount : -tx.amount;
}

/** Movimentos que entram em análises de gastos/receitas reais. */
export function isRealCashflowTransaction(tx: Pick<Transaction, 'type'>): boolean {
  return tx.type === 'expense' || tx.type === 'income';
}

/** Delta de saldo de uma conta específica para um movimento. */
export function accountMovementDelta(
  tx: Pick<Transaction, 'type' | 'amount' | 'accountId' | 'destinationAccountId'>,
  accountId: string,
): number {
  if (tx.type === 'transfer') {
    if (tx.accountId === accountId) return -tx.amount;
    if (tx.destinationAccountId === accountId) return tx.amount;
    return 0;
  }

  if (tx.accountId !== accountId) return 0;
  return tx.type === 'income' ? tx.amount : -tx.amount;
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
