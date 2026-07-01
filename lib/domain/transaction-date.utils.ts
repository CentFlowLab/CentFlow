import type { Transaction } from './transaction.types';

/** Parseia data de movimento em meio-dia local para evitar saltos de timezone. */
export function parseTransactionDate(date: string): Date {
  const key = date.slice(0, 10);
  return new Date(`${key}T12:00:00`);
}

export function endOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Movimento já ocorreu (date <= hoje). */
export function isTransactionOccurred(
  date: string,
  asOf: Date = new Date(),
): boolean {
  return parseTransactionDate(date) <= endOfDay(asOf);
}

/** Movimento ainda não ocorreu (date > hoje). */
export function isTransactionFuture(
  date: string,
  asOf: Date = new Date(),
): boolean {
  return parseTransactionDate(date) > endOfDay(asOf);
}

export function filterOccurredTransactions(
  transactions: Transaction[],
  asOf: Date = new Date(),
): Transaction[] {
  return transactions.filter((tx) => isTransactionOccurred(tx.date, asOf));
}

export function filterFutureTransactions(
  transactions: Transaction[],
  asOf: Date = new Date(),
): Transaction[] {
  return transactions.filter((tx) => isTransactionFuture(tx.date, asOf));
}

export function transactionCashDelta(tx: Pick<Transaction, 'type' | 'amount'>): number {
  if (tx.type === 'transfer') return 0;
  return tx.type === 'income' ? tx.amount : -tx.amount;
}

export type TransactionCashScope = 'occurred' | 'future' | 'all';

function matchesScope(
  date: string,
  scope: TransactionCashScope,
  asOf: Date,
): boolean {
  if (scope === 'all') return true;
  if (scope === 'occurred') return isTransactionOccurred(date, asOf);
  return isTransactionFuture(date, asOf);
}

/** Soma líquida de movimentos (receitas − despesas) conforme o âmbito temporal. */
export function sumTransactionCashBalance(
  transactions: Transaction[],
  scope: TransactionCashScope = 'occurred',
  asOf: Date = new Date(),
): number {
  return transactions.reduce((sum, tx) => {
    if (!matchesScope(tx.date, scope, asOf)) return sum;
    return sum + transactionCashDelta(tx);
  }, 0);
}
