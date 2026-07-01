import { parseTransactionDate } from '@/lib/domain/transaction-date.utils';
import type { Transaction } from '@/lib/domain/transaction.types';
import { inputDateToDate } from '@/lib/utils/format';

/** YYYY-MM — reservado para futura opção «usar no próximo mês». */
export type BudgetMonthKey = string;

export function formatBudgetMonth(date: Date): BudgetMonthKey {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/** Aceita ISO (YYYY-MM-DD) ou DD-MM-AAAA de formulários. */
export function budgetMonthFromDateString(date: string): BudgetMonthKey | null {
  const parsed = inputDateToDate(date) ?? parseTransactionDate(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return formatBudgetMonth(parsed);
}

export function parseBudgetMonthLabel(key: BudgetMonthKey): string {
  const [year, month] = key.split('-').map(Number);
  if (!year || !month || year < 1970 || year > 2100) return key;
  const label = new Date(year, month - 1, 1).toLocaleDateString('pt-PT', {
    month: 'long',
    year: 'numeric',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function nextBudgetMonth(fromDate: string): BudgetMonthKey | null {
  const parsed = inputDateToDate(fromDate) ?? parseTransactionDate(fromDate);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setMonth(parsed.getMonth() + 1);
  return formatBudgetMonth(parsed);
}

export function budgetMonthOptions(referenceDate = new Date(), count = 4): BudgetMonthKey[] {
  if (Number.isNaN(referenceDate.getTime())) return [];
  const options: BudgetMonthKey[] = [];
  const cursor = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  for (let i = 0; i < count; i += 1) {
    options.push(formatBudgetMonth(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return options;
}

export function resolveTransactionBudgetMonth(
  tx: Pick<Transaction, 'date' | 'budgetMonth'>,
): BudgetMonthKey | null {
  if (tx.budgetMonth) return tx.budgetMonth;
  return budgetMonthFromDateString(tx.date);
}

export function isLateMonthPayday(date: string): boolean {
  const parsed = inputDateToDate(date) ?? parseTransactionDate(date);
  if (Number.isNaN(parsed.getTime())) return false;
  const lastDay = new Date(parsed.getFullYear(), parsed.getMonth() + 1, 0).getDate();
  return parsed.getDate() >= lastDay - 4;
}

export function shouldSuggestNextBudgetMonth(date: string, category?: string): boolean {
  if (!isLateMonthPayday(date)) return false;
  return category === 'salary';
}
