import type { Transaction } from '@/lib/domain/transaction.types';
import { formatDaySectionTitle } from '@/lib/utils/format';
import { parseTransactionDate } from './transaction-date.utils';
import {
  expenseCountsForBudgetMonth,
  incomeCountsForBudgetMonth,
} from './monthly-budget-movements';
import { calculateBudgetImpact } from './financial/ledger-impact';
import { resolveTransactionKind } from './financial/transaction-kind';

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

export type MonthComparison = {
  current: MonthSummary;
  previous: MonthSummary;
  /** Variação percentual do net actual face ao mês anterior (null se anterior = 0). */
  netChangePercent: number | null;
};

function summarizeMonth(
  transactions: Transaction[],
  referenceDate: Date,
): MonthSummary {
  let net = 0;
  let count = 0;

  for (const transaction of transactions) {
    if (resolveTransactionKind(transaction) === 'transfer') continue;
    if (resolveTransactionKind(transaction) === 'credit_card_payment') continue;
    const counts =
      transaction.type === 'income'
        ? incomeCountsForBudgetMonth(transaction, referenceDate)
        : expenseCountsForBudgetMonth(transaction, referenceDate);
    if (!counts) continue;
    net += signedAmount(transaction);
    count += 1;
  }

  return { net, count };
}

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
  return formatDaySectionTitle(key, now);
}

function signedAmount(transaction: Transaction): number {
  const kind = resolveTransactionKind(transaction);
  if (kind === 'transfer' || kind === 'credit_card_payment') return 0;
  if (kind === 'income' || kind === 'credit_card_refund') return transaction.amount;
  if (kind === 'expense' || kind === 'credit_card_purchase') return -transaction.amount;
  return 0;
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
  return summarizeMonth(transactions, now);
}

/** Resumo do mês civil anterior ao de referência. */
export function summarizePreviousMonth(
  transactions: Transaction[],
  now: Date = new Date(),
): MonthSummary {
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
  return summarizeMonth(transactions, previousMonth);
}

/** Compara net do mês actual com o mês civil anterior. */
export function compareMonthSummaries(
  transactions: Transaction[],
  now: Date = new Date(),
): MonthComparison {
  const current = summarizeCurrentMonth(transactions, now);
  const previous = summarizePreviousMonth(transactions, now);

  let netChangePercent: number | null = null;
  if (previous.net !== 0) {
    netChangePercent = Math.round(((current.net - previous.net) / Math.abs(previous.net)) * 100);
  } else if (current.net !== 0) {
    netChangePercent = current.net > 0 ? 100 : -100;
  }

  return { current, previous, netChangePercent };
}
