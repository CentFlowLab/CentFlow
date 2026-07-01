import type { FinancialPeriod } from './dates';
import {
  getCurrentMonthRange,
  getMonthKey,
  isTransactionFuture,
  isTransactionOccurred,
  isWithinPeriod,
  parseIsoDate,
} from './dates';
import { addMoney, roundMoney } from './money';
import type { CategoryTotal, FinancialTransaction, MerchantTotal } from './domain-types';

export function isRealCashflowTransaction(tx: Pick<FinancialTransaction, 'type'>): boolean {
  return tx.type === 'income' || tx.type === 'expense';
}

export function transactionCashDelta(tx: Pick<FinancialTransaction, 'type' | 'amount'>): number {
  if (tx.type === 'transfer' || tx.type === 'credit_payment') return 0;
  return tx.type === 'income' ? tx.amount : -tx.amount;
}

export function filterTransactionsByPeriod(
  transactions: FinancialTransaction[],
  period: FinancialPeriod,
): FinancialTransaction[] {
  return transactions.filter((tx) => isWithinPeriod(tx.date, period));
}

export function filterOccurredTransactions(
  transactions: FinancialTransaction[],
  asOf: Date = new Date(),
): FinancialTransaction[] {
  return transactions.filter((tx) => isTransactionOccurred(tx.date, asOf));
}

export function filterFutureTransactions(
  transactions: FinancialTransaction[],
  asOf: Date = new Date(),
): FinancialTransaction[] {
  return transactions.filter((tx) => isTransactionFuture(tx.date, asOf));
}

export function getIncomeTotal(
  transactions: FinancialTransaction[],
  period: FinancialPeriod,
): number {
  return roundMoney(
    filterTransactionsByPeriod(transactions, period)
      .filter((tx) => tx.type === 'income')
      .reduce((sum, tx) => addMoney(sum, tx.amount), 0),
  );
}

export function getExpenseTotal(
  transactions: FinancialTransaction[],
  period: FinancialPeriod,
): number {
  return roundMoney(
    filterTransactionsByPeriod(transactions, period)
      .filter((tx) => tx.type === 'expense')
      .reduce((sum, tx) => addMoney(sum, tx.amount), 0),
  );
}

export function getNetCashflow(
  transactions: FinancialTransaction[],
  period: FinancialPeriod,
): number {
  return roundMoney(getIncomeTotal(transactions, period) - getExpenseTotal(transactions, period));
}

export function getMonthlyCashflow(
  transactions: FinancialTransaction[],
  asOf: Date = new Date(),
): { income: number; expenses: number } {
  const { monthKey } = getCurrentMonthRange(asOf);
  const period: FinancialPeriod = { kind: 'month', monthKey, asOf };
  return {
    income: getIncomeTotal(transactions, period),
    expenses: getExpenseTotal(transactions, period),
  };
}

export function groupTransactionsByDate(
  transactions: FinancialTransaction[],
): Map<string, FinancialTransaction[]> {
  const groups = new Map<string, FinancialTransaction[]>();
  for (const tx of transactions) {
    const key = tx.date.slice(0, 10);
    const bucket = groups.get(key);
    if (bucket) bucket.push(tx);
    else groups.set(key, [tx]);
  }
  return groups;
}

export function groupTransactionsByCategory(
  transactions: FinancialTransaction[],
  period: FinancialPeriod,
): CategoryTotal[] {
  const totals = new Map<string, CategoryTotal>();
  for (const tx of filterTransactionsByPeriod(transactions, period)) {
    if (tx.type !== 'expense') continue;
    const current = totals.get(tx.category) ?? {
      key: tx.category,
      label: tx.categoryLabel,
      amount: 0,
    };
    current.amount = addMoney(current.amount, tx.amount);
    totals.set(tx.category, current);
  }
  return [...totals.values()].sort((a, b) => b.amount - a.amount);
}

export function getTopCategory(
  transactions: FinancialTransaction[],
  period: FinancialPeriod,
): CategoryTotal | null {
  return groupTransactionsByCategory(transactions, period)[0] ?? null;
}

export function groupTransactionsByMerchant(
  transactions: FinancialTransaction[],
  period: FinancialPeriod,
): MerchantTotal[] {
  const totals = new Map<string, MerchantTotal>();
  for (const tx of filterTransactionsByPeriod(transactions, period)) {
    if (tx.type !== 'expense') continue;
    const key = (tx.description?.trim() || tx.categoryLabel || 'Outros').toLowerCase();
    const current = totals.get(key) ?? {
      key,
      label: tx.description?.trim() || tx.categoryLabel || 'Outros',
      amount: 0,
    };
    current.amount = addMoney(current.amount, tx.amount);
    totals.set(key, current);
  }
  return [...totals.values()].sort((a, b) => b.amount - a.amount);
}

export function getTopMerchant(
  transactions: FinancialTransaction[],
  period: FinancialPeriod,
): MerchantTotal | null {
  return groupTransactionsByMerchant(transactions, period)[0] ?? null;
}

export type TransactionCashScope = 'occurred' | 'future' | 'all';

export function sumTransactionCashBalance(
  transactions: FinancialTransaction[],
  scope: TransactionCashScope = 'occurred',
  asOf: Date = new Date(),
): number {
  return roundMoney(
    transactions.reduce((sum, tx) => {
      const inScope =
        scope === 'all' ||
        (scope === 'occurred' && isTransactionOccurred(tx.date, asOf)) ||
        (scope === 'future' && isTransactionFuture(tx.date, asOf));
      if (!inScope) return sum;
      return addMoney(sum, transactionCashDelta(tx));
    }, 0),
  );
}

/** Movimentos ocorridos no mês civil de referência (receitas e despesas). */
export function filterOccurredInCalendarMonth(
  transactions: FinancialTransaction[],
  referenceDate: Date,
): FinancialTransaction[] {
  const monthKey = getMonthKey(referenceDate);
  return filterTransactionsByPeriod(transactions, {
    kind: 'month',
    monthKey,
    asOf: referenceDate,
  });
}

export function toSpendableMovement(tx: FinancialTransaction) {
  if (tx.type === 'transfer' || tx.type === 'credit_payment') return null;
  return { type: tx.type as 'income' | 'expense', amount: tx.amount, date: tx.date };
}

export function filterOccurredForMonthlyBudget(
  transactions: FinancialTransaction[],
  referenceDate: Date,
) {
  return filterOccurredInCalendarMonth(transactions, referenceDate)
    .map(toSpendableMovement)
    .filter((m): m is NonNullable<ReturnType<typeof toSpendableMovement>> => m !== null);
}

export function filterFutureForMonthlyBudget(
  transactions: FinancialTransaction[],
  referenceDate: Date,
) {
  const monthKey = getMonthKey(referenceDate);
  return transactions
    .filter(
      (tx) =>
        isTransactionFuture(tx.date, referenceDate) &&
        getMonthKey(parseIsoDate(tx.date.slice(0, 10))) === monthKey,
    )
    .map(toSpendableMovement)
    .filter((m): m is NonNullable<ReturnType<typeof toSpendableMovement>> => m !== null);
}
