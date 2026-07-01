import { parseTransactionDate } from '@/lib/domain/transaction-date.utils';
import type { Transaction } from '@/lib/domain/transaction.types';

/** YYYY-MM — mês financeiro onde o rendimento conta no orçamento. */
export type BudgetMonthKey = string;

export function formatBudgetMonth(date: Date): BudgetMonthKey {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function budgetMonthFromDateString(date: string): BudgetMonthKey {
  return formatBudgetMonth(parseTransactionDate(date));
}

export function parseBudgetMonthLabel(key: BudgetMonthKey): string {
  const [year, month] = key.split('-').map(Number);
  if (!year || !month) return key;
  const label = new Date(year, month - 1, 1).toLocaleDateString('pt-PT', {
    month: 'long',
    year: 'numeric',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function nextBudgetMonth(fromDate: string): BudgetMonthKey {
  const date = parseTransactionDate(fromDate);
  date.setMonth(date.getMonth() + 1);
  return formatBudgetMonth(date);
}

export function budgetMonthOptions(referenceDate = new Date(), count = 4): BudgetMonthKey[] {
  const options: BudgetMonthKey[] = [];
  const cursor = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  for (let i = 0; i < count; i += 1) {
    options.push(formatBudgetMonth(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return options;
}

export function resolveTransactionBudgetMonth(tx: Pick<Transaction, 'date' | 'budgetMonth'>): BudgetMonthKey {
  return tx.budgetMonth ?? budgetMonthFromDateString(tx.date);
}

export function isLateMonthPayday(date: string): boolean {
  const parsed = parseTransactionDate(date);
  const lastDay = new Date(parsed.getFullYear(), parsed.getMonth() + 1, 0).getDate();
  return parsed.getDate() >= lastDay - 2;
}

export function shouldSuggestNextBudgetMonth(date: string, category?: string): boolean {
  if (!isLateMonthPayday(date)) return false;
  return category === 'salary';
}
