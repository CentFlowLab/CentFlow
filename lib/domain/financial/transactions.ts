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
import {
  calculateBudgetImpact,
  calculateNetSpending,
  getIncomeTotalFromLedger,
} from './ledger-impact';
import { resolveTransactionKind } from './transaction-kind';

export function isRealCashflowTransaction(tx: Pick<FinancialTransaction, 'type' | 'creditId'>): boolean {
  const kind = resolveTransactionKind(tx);
  return kind === 'income' || kind === 'expense';
}

export function transactionCashDelta(tx: Pick<FinancialTransaction, 'type' | 'amount' | 'creditId'>): number {
  const kind = resolveTransactionKind(tx);
  if (kind === 'transfer' || kind === 'credit_card_payment' || kind === 'credit_card_refund') {
    return 0;
  }
  if (kind === 'credit_card_purchase') return 0;
  return kind === 'income' ? tx.amount : -tx.amount;
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
  return getIncomeTotalFromLedger(transactions, period);
}

export function getExpenseTotal(
  transactions: FinancialTransaction[],
  period: FinancialPeriod,
): number {
  return calculateNetSpending(transactions, period);
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
    const impact = calculateBudgetImpact(tx);
    if (impact.budgetExpenseDelta === 0) continue;
    const current = totals.get(tx.category) ?? {
      key: tx.category,
      label: tx.categoryLabel,
      amount: 0,
    };
    current.amount = addMoney(current.amount, impact.budgetExpenseDelta);
    totals.set(tx.category, current);
  }
  return [...totals.values()]
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);
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
    const impact = calculateBudgetImpact(tx);
    if (impact.budgetExpenseDelta === 0) continue;
    const key = (tx.description?.trim() || tx.categoryLabel || 'Outros').toLowerCase();
    const current = totals.get(key) ?? {
      key,
      label: tx.description?.trim() || tx.categoryLabel || 'Outros',
      amount: 0,
    };
    current.amount = addMoney(current.amount, impact.budgetExpenseDelta);
    totals.set(key, current);
  }
  return [...totals.values()]
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);
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
  const kind = resolveTransactionKind(tx);
  if (
    kind === 'transfer' ||
    kind === 'credit_card_payment' ||
    kind === 'credit_card_refund' ||
    kind === 'balance_adjustment'
  ) {
    return null;
  }
  if (kind === 'credit_card_purchase') {
    return { type: 'expense' as const, amount: tx.amount, date: tx.date };
  }
  if (kind === 'income' || kind === 'expense') {
    return { type: kind, amount: tx.amount, date: tx.date };
  }
  return null;
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
