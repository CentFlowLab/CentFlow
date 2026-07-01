import type { Transaction } from './transaction.types';
import { parseTransactionDate } from './transaction-date.utils';
import {
  expenseCountsForBudgetMonth,
  incomeCountsForBudgetMonth,
} from './monthly-budget-movements';

export type TransactionDaySection = {
  /** Chave estável (YYYY-MM-DD). */
  key: string;
  /** Rótulo relativo: "Hoje", "Ontem" ou data curta. */
  title: string;
  /** Total líquido do dia (receitas - despesas). */
  dayTotal: number;
  data: Transaction[];
};

export type MonthSummary = {
  net: number;
  count: number;
};

function dayKeyFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toDayKey(iso: string): string {
  const date = parseTransactionDate(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  return dayKeyFromDate(date);
}

function dayLabel(key: string, now: Date = new Date()): string {
  const todayKey = dayKeyFromDate(now);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayKey = dayKeyFromDate(yesterday);

  if (key === todayKey) return 'Hoje';
  if (key === yesterdayKey) return 'Ontem';

  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(year, (month ?? 1) - 1, day ?? 1);
  const formatted = new Intl.DateTimeFormat('pt-PT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function signedAmount(transaction: Transaction): number {
  if (transaction.type === 'transfer' || transaction.type === 'credit_payment') return 0;
  return transaction.type === 'income' ? transaction.amount : -transaction.amount;
}

/** Agrupa movimentos por dia civil, ordenados do mais recente para o mais antigo. */
export function groupTransactionsByDay(
  transactions: Transaction[],
  now: Date = new Date(),
): TransactionDaySection[] {
  const groups = new Map<string, Transaction[]>();

  for (const transaction of transactions) {
    const key = toDayKey(transaction.date);
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(transaction);
    } else {
      groups.set(key, [transaction]);
    }
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([key, data]) => ({
      key,
      title: dayLabel(key, now),
      dayTotal: data.reduce((sum, item) => sum + signedAmount(item), 0),
      data: [...data].sort((a, b) => (a.date < b.date ? 1 : -1)),
    }));
}

/** Resumo do mês civil actual: total líquido e número de movimentos. */
export function summarizeCurrentMonth(
  transactions: Transaction[],
  now: Date = new Date(),
): MonthSummary {
  let net = 0;
  let count = 0;

  for (const transaction of transactions) {
    if (transaction.type === 'transfer' || transaction.type === 'credit_payment') continue;
    const counts =
      transaction.type === 'income'
        ? incomeCountsForBudgetMonth(transaction, now)
        : expenseCountsForBudgetMonth(transaction, now);
    if (!counts) continue;
    net += signedAmount(transaction);
    count += 1;
  }

  return { net, count };
}
