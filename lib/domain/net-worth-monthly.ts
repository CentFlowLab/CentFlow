import type { Transaction } from './transaction.types';
import { calculateNetWorth, calculateNetWorthChangePercent } from './net-worth.service';
import type { NetWorthInput } from './types';
import {
  parseTransactionDate,
  sumTransactionCashBalance,
} from './transaction-date.utils';

export function startOfMonth(date: Date): Date {
  const copy = new Date(date);
  copy.setDate(1);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function occurredBefore(date: string, boundary: Date): boolean {
  return parseTransactionDate(date) < boundary;
}

/** PL no início do mês corrente (movimentos anteriores ao dia 1). */
export function calculateNetWorthAtMonthStart(
  transactions: Transaction[],
  netWorthInput: Omit<NetWorthInput, 'accounts'>,
  asOf: Date = new Date(),
): number {
  const monthStart = startOfMonth(asOf);
  const priorTransactions = transactions.filter((tx) => occurredBefore(tx.date, monthStart));
  const cashBeforeMonth = sumTransactionCashBalance(priorTransactions, 'all', asOf);

  return calculateNetWorth({
    accounts: [{ id: 'derived-cash', name: 'Saldo', balance: cashBeforeMonth, currency: 'EUR' }],
    ...netWorthInput,
  }).netWorth;
}

/** Delta mensal real = PL actual − PL no início do mês (só movimentos do mês corrente). */
export function calculateMonthlyNetWorthMetrics(
  transactions: Transaction[],
  netWorthInput: Omit<NetWorthInput, 'accounts'>,
  currentNetWorth: number,
  asOf: Date = new Date(),
): {
  previousMonthNetWorth: number;
  netWorthChangeThisMonth: number;
  netWorthChangePercent: number;
} {
  const previousMonthNetWorth = calculateNetWorthAtMonthStart(
    transactions,
    netWorthInput,
    asOf,
  );

  const netWorthChangeThisMonth = currentNetWorth - previousMonthNetWorth;
  const netWorthChangePercent = calculateNetWorthChangePercent(
    currentNetWorth,
    previousMonthNetWorth,
  );

  return {
    previousMonthNetWorth,
    netWorthChangeThisMonth,
    netWorthChangePercent,
  };
}
